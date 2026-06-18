<script lang="ts">
	let { children } = $props();
</script>


{@render children()}

<style>
	:global(:root) {
		--bg: #000000;
		--bg-elev: #03070a;
		--bg-card: #050b0a;
		--bg-card-hover: #0a1a14;
		--border: #0e2a1b;
		--border-strong: #1a4d33;
		--text: #b8ffcb;
		--text-dim: #4f8a66;
		--accent: #00ff41;
		--accent-2: #39ff7a;
		--accent-soft: rgba(0, 255, 65, 0.1);
		--accent-glow: 0 0 10px rgba(0, 255, 65, 0.55), 0 0 24px rgba(0, 255, 65, 0.2);
		--ok: #00ff41;
		--ok-glow: 0 0 8px rgba(0, 255, 65, 0.75);
		--down: #ff2d2d;
		--down-glow: 0 0 8px rgba(255, 45, 45, 0.65);
		--unknown: #2f5a3f;
		--radius: 4px;
		font-family:
			'JetBrains Mono', ui-monospace, SFMono-Regular, 'Cascadia Code', Menlo, Consolas, monospace;
	}

	:global(body) {
		margin: 0;
		background:
			radial-gradient(1000px 500px at 50% -10%, rgba(0, 255, 65, 0.08), transparent 60%),
			radial-gradient(800px 400px at 110% 110%, rgba(0, 255, 65, 0.05), transparent 60%),
			var(--bg);
		color: var(--text);
		min-height: 100vh;
		text-shadow: 0 0 1px currentColor;
	}

	:global(*) {
		box-sizing: border-box;
	}

	:global(::selection) {
		background: rgba(0, 255, 65, 0.35);
		color: #d6ffe1;
	}

	:global(a) {
		color: var(--accent);
		text-decoration: none;
	}

	:global(button) {
		font: inherit;
		color: var(--accent);
		background: var(--bg-card);
		border: 1px solid var(--border-strong);
		border-radius: var(--radius);
		padding: 0.5rem 0.9rem;
		cursor: pointer;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		transition:
			background 0.12s ease,
			border-color 0.12s ease,
			box-shadow 0.12s ease;
	}

	:global(button:hover) {
		background: var(--bg-card-hover);
		border-color: var(--accent);
		box-shadow: var(--accent-glow);
	}

	:global(button:disabled) {
		opacity: 0.5;
		cursor: not-allowed;
		box-shadow: none;
	}

	:global(input) {
		font: inherit;
		color: var(--text);
		background: var(--bg-card);
		border: 1px solid var(--border-strong);
		border-radius: var(--radius);
		padding: 0.5rem 0.7rem;
		caret-color: var(--accent);
	}

	:global(input:focus) {
		outline: none;
		border-color: var(--accent);
		box-shadow: var(--accent-glow);
	}
</style>
