<script lang="ts">
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
	let streaming = $state(false);
	let errorMsg = $state('');
	let opened = $state<Record<number, Service>>({});
	let logEl = $state<HTMLDivElement | null>(null);

	const expanded = $derived(messages.length > 0);

	$effect(() => {
		if (browser) localStorage.setItem(BACKEND_KEY, backend);
	});

	function reset() {
		messages = [];
		opened = {};
		errorMsg = '';
		input = '';
	}

	function scrollDown() {
		if (logEl) logEl.scrollTop = logEl.scrollHeight;
	}

	async function send() {
		const text = input.trim();
		if (!text || streaming) return;
		input = '';
		errorMsg = '';
		messages = [...messages, { role: 'user', content: text }, { role: 'assistant', content: '' }];
		const target = messages.length - 1;
		streaming = true;

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
							window.open(svc.url, '_blank', 'noopener');
						}
						scrollDown();
					}
				}
			}
			if (!messages[target].content && !errorMsg) errorMsg = 'Keine Antwort erhalten.';
		} catch (e) {
			errorMsg = (e as Error).message;
		} finally {
			streaming = false;
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
		<div class="log" bind:this={logEl}>
			{#each messages as m, i}
				<div class="msg {m.role}">
					<span class="who">{m.role === 'user' ? '>' : '#'}</span>
					<div class="body">
						{#if m.content}
							<span class="text">{m.content}</span>
						{:else if streaming}
							<span class="cursor">denkt…</span>
						{/if}
						{#if opened[i]}
							<a class="opened" href={opened[i].url} target="_blank" rel="noopener noreferrer">
								↗ {opened[i].name} geöffnet
							</a>
						{/if}
					</div>
				</div>
			{/each}
			{#if errorMsg}
				<div class="msg err"><span class="who">!</span><div class="body">{errorMsg}</div></div>
			{/if}
		</div>
	{/if}

	<div class="row">
		{#if ai.backends.length > 1}
			<select class="backend" bind:value={backend} disabled={streaming} title="KI-Backend">
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
			disabled={streaming}
		/>
		<button class="go" onclick={send} disabled={streaming || !input.trim()} title="Senden">
			{streaming ? '…' : '>'}
		</button>
		{#if expanded}
			<button class="new" onclick={reset} disabled={streaming} title="Neuer Chat">Neuer Chat</button>
		{/if}
	</div>
</section>

<style>
	.ai {
		margin: 0 0 1.4rem;
		padding: 0.6rem;
		background: var(--bg-card);
		border: 1px solid var(--border);
		border-radius: var(--radius);
	}
	.ai.expanded {
		border-color: var(--border-strong);
	}
	.log {
		max-height: 22rem;
		overflow-y: auto;
		padding: 0.2rem 0.2rem 0.6rem;
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
	}
	.msg {
		display: flex;
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
	.msg.err .body {
		color: var(--down);
	}
	.cursor {
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
	.row {
		display: flex;
		gap: 0.4rem;
	}
	.backend {
		flex: 0 0 auto;
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
	.new {
		flex: 0 0 auto;
	}
</style>
