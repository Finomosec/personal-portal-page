<script lang="ts">
	import { tick } from 'svelte';
	import { browser } from '$app/environment';
	import type { Service, ChatMessage, AiClientConfig } from '$lib/types';

	let { services, ai }: { services: Service[]; ai: AiClientConfig } = $props();

	const BACKEND_KEY = 'personal-portal:aiBackend';

	function initialBackend(): string {
		if (!browser) return ai.defaultBackend;
		const saved = localStorage.getItem(BACKEND_KEY);
		return saved && ai.backends.some((b) => b.id === saved) ? saved : ai.defaultBackend;
	}

	let backend = $state(initialBackend());
	let input = $state('');
	let messages = $state<ChatMessage[]>([]);
	let pending = $state<string[]>([]);
	let streaming = $state(false);
	let errorMsg = $state('');
	let opened = $state<Record<number, Service>>({});
	let blocked = $state<Record<number, boolean>>({});
	let logEl = $state<HTMLDivElement | null>(null);
	let inputEl = $state<HTMLInputElement | null>(null);
	let stick = $state(true);

	const expanded = $derived(messages.length > 0);

	$effect(() => {
		if (browser) localStorage.setItem(BACKEND_KEY, backend);
	});

	function reset() {
		messages = [];
		opened = {};
		blocked = {};
		pending = [];
		errorMsg = '';
		input = '';
		stick = true;
		inputEl?.focus();
	}

	/**
	 * Mitscrollen nur, solange der Nutzer unten steht — wer hochgescrollt hat,
	 * um etwas nachzulesen, soll vom nachlaufenden Text nicht weggerissen werden.
	 */
	function onScroll() {
		if (!logEl) return;
		stick = logEl.scrollHeight - logEl.scrollTop - logEl.clientHeight < 24;
	}

	async function scrollDown(force = false) {
		if (force) stick = true;
		if (!stick) return;
		await tick();
		if (logEl) logEl.scrollTop = logEl.scrollHeight;
	}

	/**
	 * Eingaben während einer laufenden Antwort landen in der Queue statt das
	 * Feld zu sperren — bei zweistelligen Antwortzeiten soll man weitertippen
	 * können. Wartende Zeilen gehen zusammengefasst als eine Frage raus.
	 */
	function send() {
		const text = input.trim();
		if (!text) return;
		input = '';
		pending = [...pending, text];
		scrollDown(true);
		if (!streaming) drain();
	}

	async function drain() {
		streaming = true;
		errorMsg = '';
		try {
			while (pending.length) {
				const merged = pending.join('\n');
				pending = [];
				await ask(merged);
			}
		} finally {
			streaming = false;
			inputEl?.focus();
		}
	}

	async function ask(text: string) {
		messages = [...messages, { role: 'user', content: text }, { role: 'assistant', content: '' }];
		const target = messages.length - 1;
		scrollDown(true);

		try {
			const res = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ messages: messages.slice(0, -1), backend })
			});
			if (!res.ok || !res.body) throw new Error(`Fehler ${res.status}`);

			const reader = res.body.getReader();
			const decoder = new TextDecoder();
			let buf = '';

			for (;;) {
				const { done, value } = await reader.read();
				if (done) break;
				buf += decoder.decode(value, { stream: true });
				const parts = buf.split('\n\n');
				buf = parts.pop() ?? '';

				for (const part of parts) {
					const line = part.trim();
					if (!line.startsWith('data:')) continue;
					const evt = JSON.parse(line.slice(5));

					if (evt.type === 'delta') {
						messages[target].content += evt.text;
						scrollDown();
					} else if (evt.type === 'error') {
						errorMsg = evt.message;
					} else if (evt.type === 'done') {
						if (evt.text) messages[target].content = evt.text;
						if (evt.service) {
							const svc = services.find((s) => s.id === evt.service.id) ?? evt.service;
							opened[target] = svc;
							// Kleine Modelle liefern bei „öffne X“ oft nur die Aktion ohne Text.
							if (!messages[target].content) messages[target].content = `Öffne ${svc.name}.`;
							// Ohne frische Nutzergeste greift der Popup-Blocker (die Antwort
							// kommt Sekunden nach dem Klick) -> null, dann bleibt der Link.
							// Kein 'noopener'-Feature: das liefert laut Spec immer null und
							// macht die Erkennung wertlos — die Rückreferenz wird stattdessen
							// nachträglich gekappt.
							const win = window.open(svc.url, '_blank');
							if (win) win.opener = null;
							blocked[target] = win === null;
						}
						scrollDown();
					}
				}
			}
			if (!messages[target].content && !opened[target] && !errorMsg) {
				errorMsg = 'Keine Antwort erhalten.';
			}
		} catch (e) {
			errorMsg = (e as Error).message;
		}
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			send();
		}
	}
</script>

<section class="ai" class:expanded>
	{#if expanded}
		<button class="close" onclick={reset} title="Neuer Chat" aria-label="Chat schließen">×</button>
		<div class="log" bind:this={logEl} onscroll={onScroll}>
			{#each messages as m, i}
				<div class="msg {m.role}">
					<span class="who">{m.role === 'user' ? '>' : '#'}</span>
					<div class="body">
						{#if m.content}
							<span class="text">{m.content}</span>
						{:else if streaming}
							<span class="cursor">Denkt…</span>
						{/if}
						{#if opened[i]}
							<a
								class="opened"
								class:blocked={blocked[i]}
								href={opened[i].url}
								target="_blank"
								rel="noopener noreferrer"
							>
								{#if blocked[i]}
									↗ {opened[i].name} öffnen — Popup wurde blockiert
								{:else}
									↗ {opened[i].name} geöffnet
								{/if}
							</a>
						{/if}
					</div>
				</div>
			{/each}
			{#each pending as q}
				<div class="msg user queued">
					<span class="who">⋯</span>
					<div class="body"><span class="text">{q}</span></div>
				</div>
			{/each}
			{#if errorMsg}
				<div class="msg err"><span class="who">!</span><div class="body">{errorMsg}</div></div>
			{/if}
		</div>
	{/if}

	<div class="row">
		{#if ai.backends.length > 1}
			<select class="backend" bind:value={backend} title="KI-Backend">
				{#each ai.backends as b}
					<option value={b.id}>{b.label}</option>
				{/each}
			</select>
		{/if}
		<input
			class="prompt"
			type="text"
			placeholder={expanded ? 'Weiterfragen…' : 'Frag die KI — z.B. „wo sehe ich die Metriken?“'}
			bind:value={input}
			onkeydown={onKey}
			bind:this={inputEl}
		/>
		<button class="go" onclick={send} disabled={!input.trim()} title="Senden">
			{streaming ? '…' : '>'}
		</button>
	</div>
</section>

<style>
	.ai {
		position: relative;
		margin: 0 0 1.4rem;
		padding: 0.6rem;
		background: var(--bg-card);
		border: 1px solid var(--border);
		border-radius: var(--radius);
	}
	/* bleibt über dem mitlaufenden Log stehen wie ein Fenster-Schließer */
	.close {
		position: absolute;
		top: 0.4rem;
		right: 0.4rem;
		z-index: 2;
		padding: 0 0.4rem;
		font-size: 1.15rem;
		line-height: 1.5;
		color: var(--text-dim);
		border-color: var(--border);
	}
	.close:hover {
		color: var(--accent);
	}
	.ai.expanded {
		border-color: var(--border-strong);
	}
	.log {
		/* wächst mit, bis der Viewport voll ist — der Rest bleibt für Eingabezeile
		   und Seitenrand; dvh, damit mobile Browserleisten nicht abschneiden */
		max-height: 70vh;
		max-height: calc(100dvh - 12rem);
		overflow-y: auto;
		padding: 0.2rem 2.2rem 0.6rem 0.2rem;
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
	}
	.msg {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		font-size: 0.92rem;
		line-height: 1.45;
	}
	.who {
		flex: 0 0 auto;
		color: var(--accent);
		font-weight: 700;
	}
	.msg.user .who {
		color: var(--text-dim);
	}
	.msg.err .who {
		color: var(--down);
	}
	.body {
		min-width: 0;
	}
	.text {
		white-space: pre-wrap;
		word-break: break-word;
	}
	.msg.user .text {
		color: var(--text-dim);
	}
	.msg.queued {
		opacity: 0.55;
		font-style: italic;
	}
	.msg.err .body {
		color: var(--down);
	}
	.cursor {
		display: inline-block;
		font-size: 1.02rem;
		line-height: 1.35;
		letter-spacing: 0.03em;
		color: var(--text-dim);
		animation: pulse 1.1s ease-in-out infinite;
	}
	@keyframes pulse {
		50% {
			opacity: 0.35;
		}
	}
	.opened {
		display: block;
		margin-top: 0.25rem;
		color: var(--accent);
		text-decoration: none;
		font-size: 0.86rem;
	}
	.opened:hover {
		text-shadow: var(--accent-glow);
	}
	.opened.blocked {
		display: inline-block;
		margin-top: 0.35rem;
		padding: 0.3rem 0.6rem;
		border: 1px solid var(--accent);
		border-radius: var(--radius);
	}
	.row {
		display: flex;
		gap: 0.4rem;
	}
	/* select erbt weder den globalen button- noch input-Stil */
	.backend {
		flex: 0 0 auto;
		font: inherit;
		color: var(--accent);
		background: var(--bg-card);
		border: 1px solid var(--border-strong);
		border-radius: var(--radius);
		padding: 0.5rem 0.6rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		cursor: pointer;
		transition:
			background 0.12s ease,
			border-color 0.12s ease,
			box-shadow 0.12s ease;
	}
	.backend:hover:not(:disabled) {
		background: var(--bg-card-hover);
		border-color: var(--accent);
		box-shadow: var(--accent-glow);
	}
	.backend:focus-visible {
		outline: none;
		border-color: var(--accent);
		box-shadow: var(--accent-glow);
	}
	.backend:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.backend option {
		background: var(--bg-elev);
		color: var(--text);
		text-transform: none;
		letter-spacing: normal;
	}
	.prompt {
		flex: 1 1 auto;
		min-width: 0;
	}
	.go {
		flex: 0 0 auto;
		min-width: 2.6rem;
		font-weight: 700;
	}
</style>
