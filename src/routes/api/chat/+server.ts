import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	aiConfig,
	aiServices,
	resolveBackend,
	systemPrompt,
	RESPONSE_FORMAT
} from '$lib/server/chat-context';
import type { ChatMessage } from '$lib/types';

const MAX_HISTORY = 12;

/**
 * Zieht den bisherigen Inhalt von "answer" aus unvollständigem JSON.
 * Nötig, weil das erzwungene Schema die Antwort in JSON verpackt, wir aber
 * schon während der Generierung Text anzeigen wollen (~5 tok/s auf CPU).
 */
function extractAnswer(buf: string): string {
	const m = /"answer"\s*:\s*"/.exec(buf);
	if (!m) return '';
	let out = '';
	for (let i = m.index + m[0].length; i < buf.length; i++) {
		const c = buf[i];
		if (c === '\\') {
			const n = buf[i + 1];
			if (n === undefined) break;
			if (n === 'u') {
				const hex = buf.slice(i + 2, i + 6);
				if (hex.length < 4) break;
				out += String.fromCharCode(parseInt(hex, 16));
				i += 5;
			} else {
				out += n === 'n' ? '\n' : n === 't' ? '\t' : n;
				i += 1;
			}
			continue;
		}
		if (c === '"') break;
		out += c;
	}
	return out;
}

export const POST: RequestHandler = async ({ request }) => {
	const cfg = aiConfig();
	if (!cfg.enabled) throw error(404, 'AI chat disabled');

	const body = await request.json().catch(() => null);
	const history: ChatMessage[] = Array.isArray(body?.messages) ? body.messages : [];
	if (!history.length) throw error(400, 'messages required');

	const backend = resolveBackend(body?.backend);
	const messages = [
		{ role: 'system', content: systemPrompt(backend) },
		...history.slice(-MAX_HISTORY).map((m) => ({
			role: m.role === 'assistant' ? 'assistant' : 'user',
			content: String(m.content ?? '').slice(0, 4000)
		}))
	];

	let upstream: Response;
	try {
		upstream = await fetch(`${backend.url.replace(/\/$/, '')}/chat/completions`, {
			method: 'POST',
			// Bricht der Browser ab, soll auch das Modell aufhören zu rechnen.
			signal: request.signal,
			headers: { 'content-type': 'application/json', authorization: 'Bearer local' },
			body: JSON.stringify({
				model: backend.model,
				messages,
				stream: true,
				response_format: RESPONSE_FORMAT,
				temperature: 0.3,
				...(cfg.maxTokens ? { max_tokens: cfg.maxTokens } : {})
			})
		});
	} catch (e) {
		throw error(502, `${backend.label} nicht erreichbar: ${(e as Error).message}`);
	}
	if (!upstream.ok || !upstream.body) {
		throw error(502, `${backend.label}: Fehler ${upstream.status}`);
	}

	const encoder = new TextEncoder();
	// Bricht der Client ab, greift cancel() weiter unten auf beides zu.
	let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
	let cancelled = false;

	const stream = new ReadableStream({
		async start(controller) {
			// Nach dem Abbruch ist der Controller zu — enqueue würde werfen.
			const send = (obj: unknown) => {
				if (cancelled) return;
				controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
			};

			reader = upstream.body!.getReader();
			const decoder = new TextDecoder();
			let sse = '';
			let raw = '';
			let sent = '';

			try {
				for (;;) {
					const { done, value } = await reader.read();
					if (done) break;
					sse += decoder.decode(value, { stream: true });
					const lines = sse.split('\n');
					sse = lines.pop() ?? '';

					for (const line of lines) {
						const t = line.trim();
						if (!t.startsWith('data:')) continue;
						const payload = t.slice(5).trim();
						if (!payload || payload === '[DONE]') continue;
						let chunk: { choices?: { delta?: { content?: string } }[] };
						try {
							chunk = JSON.parse(payload);
						} catch {
							continue;
						}
						raw += chunk.choices?.[0]?.delta?.content ?? '';
						const answer = extractAnswer(raw);
						if (answer.length > sent.length) {
							send({ type: 'delta', text: answer.slice(sent.length) });
							sent = answer;
						}
					}
				}

				let openService = '';
				try {
					openService = String(JSON.parse(raw).openService ?? '');
				} catch {
					/* unvollständiges JSON: Text steht trotzdem, nur keine Aktion */
				}
				// Die ID wird gegen die Config geprüft, damit eine halluzinierte
				// oder ausgeschlossene ID keinen Link im Browser öffnet.
				const service = openService ? aiServices().find((s) => s.id === openService) : undefined;
				send({ type: 'done', text: sent, service: service ?? null });
			} catch (e) {
				if ((e as Error).name !== 'AbortError') {
					send({ type: 'error', message: (e as Error).message });
				}
			} finally {
				if (!cancelled) controller.close();
			}
		},
		// getReader() hat den Body gelockt — ein cancel() darauf wirft
		// ERR_INVALID_STATE, und die Rejection killt den Node-Prozess.
		cancel(reason) {
			cancelled = true;
			return reader?.cancel(reason).catch(() => {});
		}
	});

	return new Response(stream, {
		headers: {
			'content-type': 'text/event-stream',
			'cache-control': 'no-cache',
			connection: 'keep-alive'
		}
	});
};
