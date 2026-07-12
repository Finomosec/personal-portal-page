<script lang="ts">
	let { children } = $props();
</script>


{@render children()}

<style>
	:global(:root) {
		/* Scrollbar-Platz immer reservieren → V-Scrollbar togglet nicht mehr die
		   Layout-Breite (verhindert das „Springen"/Jitter bei knapper Seitenhöhe) */
		scrollbar-gutter: stable;
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

	/* Light-Theme: helle Flächen, dunkle Schrift, gedämpftes Grün ohne Neon-Glow */
	:global(:root[data-theme='light']) {
		--bg: #f3f7f4;
		--bg-elev: #ffffff;
		--bg-card: #ffffff;
		--bg-card-hover: #eef4ef;
		--border: #d3e2d8;
		--border-strong: #a8ccb6;
		--text: #12291d;
		--text-dim: #5a7a66;
		--accent: #0f9d52;
		--accent-2: #0c8544;
		--accent-soft: rgba(15, 157, 82, 0.1);
		--accent-glow: none;
		--ok: #0f9d52;
		--ok-glow: none;
		--down: #d92626;
		--down-glow: none;
		--unknown: #9bb3a3;
		color-scheme: light;
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

	/* im Light-Theme kein Neon-Schleier und keine grünen Glow-Verläufe */
	:global(:root[data-theme='light'] body) {
		background:
			radial-gradient(1000px 500px at 50% -10%, rgba(15, 157, 82, 0.06), transparent 60%),
			var(--bg);
		text-shadow: none;
	}

	:global(:root[data-theme='light'] ::selection) {
		background: rgba(15, 157, 82, 0.25);
		color: #0a2016;
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
