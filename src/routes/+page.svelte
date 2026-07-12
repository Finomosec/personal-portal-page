<script lang="ts">
	import { browser } from '$app/environment';
	import type { Service, HealthResult, CategoryDef, HostInfo, LocationInfo } from '$lib/types';
	import { getTheme, toggleTheme, type Theme } from '$lib/theme';

	const ADMIN_MODE_KEY = 'personal-portal:adminMode';

	let { data } = $props<{
		data: {
			title: string;
			healthCheck: boolean;
			categories: CategoryDef[];
			hosts: Record<string, HostInfo>;
			locations: Record<string, LocationInfo>;
			services: Service[];
		};
	}>();

	let search = $state('');
	let activeHost = $state<string | null>(null);
	let activeLocation = $state<string | null>(null);
	let activeStatus = $state<'ok' | 'down' | 'unknown' | null>(null);
	let adminMode = $state(browser && localStorage.getItem(ADMIN_MODE_KEY) === '1');
	let theme = $state<Theme>(browser ? getTheme() : 'matrix');

	function flipTheme() {
		theme = toggleTheme();
	}
	let health = $state<Record<string, HealthResult>>({});
	let checking = $state(false);
	let lastCheck = $state<Date | null>(null);
	let checkingIds = $state<Set<string>>(new Set()); // laufende Einzel-Checks

	$effect(() => {
		if (browser) localStorage.setItem(ADMIN_MODE_KEY, adminMode ? '1' : '0');
	});

	const hostIds = $derived(Object.keys(data.hosts));
	const locationIds = $derived(Object.keys(data.locations ?? {}));

	function toggleHost(id: string) {
		activeHost = activeHost === id ? null : id;
	}

	function toggleLocation(id: string) {
		activeLocation = activeLocation === id ? null : id;
	}

	function toggleStatus(s: 'ok' | 'down' | 'unknown') {
		activeStatus = activeStatus === s ? null : s;
	}

	function matches(s: Service): boolean {
		if (activeHost && s.host !== activeHost) return false;
		if (activeLocation && s.location !== activeLocation) return false;
		if (activeStatus) {
			const status = health[s.id]?.status ?? 'unknown';
			if (status !== activeStatus) return false;
		}
		if (!search.trim()) return true;
		const q = search.toLowerCase();
		const hostName = data.hosts[s.host]?.name ?? s.host;
		return (
			s.name.toLowerCase().includes(q) ||
			(s.description ?? '').toLowerCase().includes(q) ||
			s.url.toLowerCase().includes(q) ||
			hostName.toLowerCase().includes(q)
		);
	}

	const filtered = $derived(data.services.filter(matches));
	const byCategory = $derived(
		Object.fromEntries(data.categories.map((c) => [c.key, filtered.filter((s: Service) => s.category === c.key)])) as Record<string, Service[]>
	);

	async function runHealthCheck() {
		checking = true;
		try {
			// nur aktuell sichtbare Services prüfen (Filter + Kategorie-Sichtbarkeit)
			const visible = filtered.filter((s: Service) => {
				const cat = data.categories.find((c: CategoryDef) => c.key === s.category);
				return adminMode || cat?.visible === 'always';
			});
			// im ungefilterten Default externe Kategorien auslassen;
			// nur prüfen, wenn aktiv dahin gefiltert wurde und sie noch sichtbar sind
			const filterActive = !!(search.trim() || activeHost || activeLocation || activeStatus);
			const targets = filterActive
				? visible
				: visible.filter(
						(s: Service) => !data.categories.find((c: CategoryDef) => c.key === s.category)?.external
					);

			const res = await fetch('/api/health', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ ids: targets.map((s: Service) => s.id) })
			});
			if (!res.ok) throw new Error(`status ${res.status}`);
			const results = await res.json();
			health = { ...health, ...results }; // mergen, bereits geprüfte Status behalten
			lastCheck = new Date();
		} catch (err) {
			console.error('health check failed', err);
		} finally {
			checking = false;
		}
	}

	async function checkOne(id: string) {
		if (checkingIds.has(id)) return; // läuft schon → nicht erneut
		const adding = new Set(checkingIds);
		adding.add(id);
		checkingIds = adding;
		// Safety-Reset, falls der Request hängt (Server-Probe-Timeout ist 3s)
		const safety = setTimeout(() => {
			const s = new Set(checkingIds);
			s.delete(id);
			checkingIds = s;
		}, 8000);
		try {
			const res = await fetch('/api/health', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ ids: [id] })
			});
			if (!res.ok) throw new Error(`status ${res.status}`);
			const results = await res.json();
			health = { ...health, ...results };
			lastCheck = new Date();
		} catch (err) {
			console.error('health check failed', err);
		} finally {
			clearTimeout(safety);
			const s = new Set(checkingIds);
			s.delete(id);
			checkingIds = s;
		}
	}

	function statusClass(id: string): string {
		const r = health[id];
		if (!r) return 'unknown';
		return r.status;
	}

	function statusTitle(id: string): string {
		const r = health[id];
		if (!r) return 'Erreichbarkeit prüfen';
		if (r.status === 'ok') return `OK (HTTP ${r.code}, ${r.latencyMs} ms)`;
		if (r.status === 'down')
			return `Down${r.code ? ` (HTTP ${r.code})` : ''}${r.error ? ` — ${r.error}` : ''}`;
		return r.error ?? 'unbekannt';
	}
</script>

<svelte:head>
	<title>{data.title}</title>
</svelte:head>

<div class="page">
	<header>
		<div class="brand">
			<h1>{data.title}</h1>
			<label class="switch" title="Admin-Modus">
				<input type="checkbox" bind:checked={adminMode} />
				<span class="track"><span class="thumb"></span></span>
			</label>
		</div>
		<div class="actions">
			<button
				class="theme-toggle"
				onclick={flipTheme}
				title="Theme umschalten"
				aria-label="Theme umschalten"
			>
				{#if theme === 'light'}
					<svg
						viewBox="0 0 24 24"
						width="16"
						height="16"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
					>
						<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
					</svg>
					Matrix
				{:else}
					<svg
						viewBox="0 0 24 24"
						width="16"
						height="16"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
					>
						<circle cx="12" cy="12" r="4" />
						<path
							d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
						/>
					</svg>
					Hell
				{/if}
			</button>
			{#if data.healthCheck}
				<button onclick={runHealthCheck} disabled={checking}>
					{checking ? 'Prüfe…' : 'Prüfen'}
				</button>
			{/if}
			<form method="POST" action="/logout">
				<button type="submit">Ausloggen</button>
			</form>
		</div>
	</header>

	<div class="controls">
		<input
			type="search"
			placeholder="Suche (Name, Beschreibung, etc.)"
			bind:value={search}
			class="search"
		/>
		{#if adminMode}
			<div class="host-filters">
				{#each hostIds.filter((id) => !data.hosts[id]?.hidden) as id}
					<button
						class="host-chip"
						class:active={activeHost === id}
						onclick={() => toggleHost(id)}
					>
						{data.hosts[id]?.name ?? id}
					</button>
				{/each}
			</div>
			{#if locationIds.length > 0}
				<div class="host-filters">
					{#each locationIds as id}
						<button
							class="host-chip"
							class:active={activeLocation === id}
							onclick={() => toggleLocation(id)}
						>
							{data.locations[id]?.name ?? id}
						</button>
					{/each}
				</div>
			{/if}
			{#if lastCheck}
				<div class="host-filters status-filters">
					{#each [
						{ key: 'ok' as const, label: 'OK' },
						{ key: 'down' as const, label: 'Down' },
						{ key: 'unknown' as const, label: 'Unbekannt' }
					] as s}
						<button
							class="host-chip status-chip {s.key}"
							class:active={activeStatus === s.key}
							onclick={() => toggleStatus(s.key)}
						>
							<span class="status-dot {s.key}"></span>
							{s.label}
						</button>
					{/each}
				</div>
			{/if}
		{/if}
	</div>

	{#each data.categories as section}
		{@const list = byCategory[section.key]}
		{@const visible = adminMode || section.visible === 'always'}
		{#if visible && list.length > 0}
			<section>
				{#if adminMode && section.label}
					<h2>{section.label} <span class="count">({list.length})</span></h2>
				{/if}
				<div class="grid">
					{#each list as svc (svc.id)}
						<a class="card" href={svc.url} target={svc.download ? '_self' : '_blank'} rel="noopener noreferrer" download={svc.download ? '' : undefined}>
							<div class="card-head">
								{#if svc.icon}
									<img class="icon" src="/icon/{svc.icon}" alt="" aria-hidden="true" />
								{/if}
								<span class="name" title={svc.name}>{svc.name}</span>
								<span class="corner-top">
									{#if svc.location && data.locations?.[svc.location]}
										<span class="loc" title={data.locations[svc.location].name}
											>{data.locations[svc.location].shortName}</span>
									{/if}
									<span
										class="status-dot {statusClass(svc.id)}"
										class:checking={checkingIds.has(svc.id)}
										role="button"
										tabindex="0"
										aria-label="Health-Check auslösen"
										title={checkingIds.has(svc.id) ? 'Prüfe…' : statusTitle(svc.id)}
										onclick={(e) => {
											e.preventDefault();
											e.stopPropagation();
											checkOne(svc.id);
										}}
										onkeydown={(e) => {
											if (e.key === 'Enter' || e.key === ' ') {
												e.preventDefault();
												e.stopPropagation();
												checkOne(svc.id);
											}
										}}
									></span>
								</span>
							</div>
							<div class="card-body">
								<!-- desc-Container immer rendern (auch leer), sonst rutscht der Host-Badge nach links -->
								<p class="desc" lang="de">{svc.description ?? ''}</p>
								<span class="host" title={data.hosts[svc.host]?.name ?? svc.host}
									>{data.hosts[svc.host]?.shortName ?? svc.host}</span>
							</div>
						</a>
					{/each}
				</div>
			</section>
		{/if}
	{/each}

	{#if filtered.length === 0}
		<p class="empty">Keine Treffer.</p>
	{/if}
</div>

<style>
	.page {
		max-width: 1100px;
		margin: 0 auto;
		padding: 2rem 1.5rem 3rem;
	}

	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	header h1 {
		margin: 0;
		font-size: 1.4rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--accent);
		text-shadow: var(--accent-glow);
	}

	header .actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.theme-toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
	}

	.theme-toggle svg {
		display: block;
	}

	.dim {
		color: var(--text-dim);
		font-size: 0.85rem;
	}

	.controls {
		display: flex;
		gap: 1.5rem 2rem;
		flex-wrap: wrap;
		margin-bottom: 1.5rem;
		align-items: center;
	}

	.search {
		flex: 1 1 18rem;
	}

	.host-filters {
		display: flex;
		gap: 0.4rem;
		flex-wrap: wrap;
	}

	.host-chip.active {
		background: var(--accent-soft);
		border-color: var(--accent);
	}


	.status-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
	}

	.status-chip .status-dot {
		position: static;
		width: 8px;
		height: 8px;
	}

	.switch {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		user-select: none;
		font-size: 0.85rem;
		color: var(--text-dim);
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.switch input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
		width: 0;
		height: 0;
	}

	.switch .track {
		position: relative;
		width: 38px;
		height: 20px;
		background: var(--bg-card);
		border: 1px solid var(--border-strong);
		border-radius: 999px;
		transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
	}

	.switch .thumb {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: var(--text-dim);
		transition: transform 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
	}

	.switch input:checked + .track {
		background: var(--accent-soft);
		border-color: var(--accent);
		box-shadow: var(--accent-glow);
	}

	.switch input:checked + .track .thumb {
		transform: translateX(18px);
		background: var(--accent);
		box-shadow: var(--accent-glow);
	}

	.switch input:focus-visible + .track {
		border-color: var(--accent);
		box-shadow: var(--accent-glow);
	}

	.switch-label {
		color: var(--accent);
	}

	.clear {
		padding: 0.5rem 0.7rem;
	}

	section + section {
		margin-top: 2rem;
	}

	section h2 {
		margin: 0 0 0.75rem;
		font-size: 0.8rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		color: var(--accent);
		opacity: 0.85;
	}

	section h2::before {
		content: '> ';
		color: var(--accent-2);
	}

	/* Anzahl der Dienste je Sektion — dezent, ohne die Titel-Auszeichnung */
	section h2 .count {
		color: var(--text-dim);
		font-weight: 400;
		opacity: 0.6;
		letter-spacing: normal;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
		gap: 0.75rem;
	}

	.card {
		position: relative;
		display: flex;
		flex-direction: column;
		padding: 0.9rem 1rem;
		background: var(--bg-card);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		color: var(--text);
		text-decoration: none;
		/* fängt die über den Rand ragende Status-Dot-Klickfläche (::before inset:-7px) ab,
		   damit sie keinen horizontalen Seiten-Overflow/Scrollbar-Jitter erzeugt.
		   Der eigene Hover-Glow (box-shadow) bleibt davon unberührt. */
		overflow: clip;
		transition: background 0.12s ease, border-color 0.12s ease, transform 0.12s ease;
	}

	.card:hover {
		background: var(--bg-card-hover);
		border-color: var(--accent);
		transform: translateY(-1px);
	}

	.card-head {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin-bottom: 0.35rem;
	}

	/* Location-Badge + Status-Dot als Gruppe, 4px in die obere rechte Ecke gerückt */
	.corner-top {
		flex: 0 0 auto;
		display: flex;
		align-items: center;
		gap: 0.45rem;
		position: relative;
		top: -4px;
		right: -4px;
	}

	/* Beschreibung + Host-Badge nebeneinander: desc oben-links, Host-Badge unten-rechts.
	   card-body füllt die Rest-Höhe (gleich hohe Karten via Grid-Stretch). */
	.card-body {
		display: flex;
		gap: 0.5rem;
		flex: 1 1 auto;
		min-height: 0;
	}

	.status-dot {
		width: 9px;
		height: 9px;
		border-radius: 50%;
		flex-shrink: 0;
		cursor: pointer;
		position: relative;
		transition: transform 0.12s ease;
	}

	/* vergrößert die Klickfläche, ohne die optische Position/Größe zu verändern */
	.status-dot::before {
		content: '';
		position: absolute;
		inset: -7px;
		border-radius: 50%;
	}

	.loc {
		flex: 0 0 auto;
		font-size: 0.65rem;
		line-height: 1;
		color: var(--text-dim);
		background: rgba(0, 255, 65, 0.06);
		border: 1px solid var(--border-strong);
		padding: 0.15rem 0.4rem;
		border-radius: 999px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.icon {
		width: 22px;
		height: 22px;
		flex-shrink: 0;
		object-fit: contain;
		filter: drop-shadow(0 0 4px rgba(0, 255, 65, 0.18));
	}

	.status-dot.ok {
		background: var(--ok);
		box-shadow: var(--ok-glow), 0 0 0 3px rgba(0, 255, 65, 0.12);
	}

	.status-dot.down {
		background: var(--down);
		box-shadow: var(--down-glow), 0 0 0 3px rgba(255, 45, 45, 0.12);
	}

	.status-dot.unknown {
		background: var(--unknown);
		opacity: 0.7;
	}

	.status-dot:hover {
		transform: scale(1.35);
	}

	.status-dot:focus-visible {
		outline: 2px solid var(--ok);
		outline-offset: 2px;
	}

	/* läuft gerade: türkis + pulsieren + nicht erneut klickbar signalisieren */
	.status-dot.checking {
		cursor: progress;
		background: #2dd4bf;
		box-shadow:
			0 0 6px rgba(45, 212, 191, 0.75),
			0 0 0 3px rgba(45, 212, 191, 0.15);
		animation: hc-pulse 0.9s ease-in-out infinite;
	}

	@keyframes hc-pulse {
		0%,
		100% {
			transform: scale(1);
			opacity: 1;
		}
		50% {
			transform: scale(1.7);
			opacity: 0.45;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.status-dot.checking {
			animation: none;
			opacity: 0.5;
		}
	}

	.name {
		font-weight: 600;
		flex: 1 1 auto;
		min-width: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.host {
		flex: 0 0 auto;
		align-self: flex-end; /* neben der desc, aber nach unten orientiert */
		white-space: nowrap;
		position: relative;
		bottom: -7px;
		right: -7px; /* deutlich in die untere rechte Ecke gerückt */
		font-size: 0.7rem;
		color: var(--text-dim);
		background: rgba(0, 255, 65, 0.06);
		border: 1px solid var(--border-strong);
		padding: 0.1rem 0.5rem;
		border-radius: 999px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.desc {
		margin: 0;
		align-self: flex-start; /* oben, direkt unter dem Titel */
		flex: 1 1 auto;
		min-width: 0;
		font-size: 0.85rem;
		color: var(--text-dim);
		line-height: 1.35;
		/* automatische Silbentrennung + Umbruch langer Wörter (lang="de" am Element) */
		hyphens: auto;
		-webkit-hyphens: auto;
		/* nur längere Wörter trennen: min. 12 Zeichen Wortlänge, min. 5 vor / 4 nach dem Trennstrich */
		hyphenate-limit-chars: 12 5 4;
		overflow-wrap: break-word;
		word-break: normal;
	}

	.url {
		font-size: 0.75rem;
		color: var(--text-dim);
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		flex: 1 1 auto;
		min-width: 0;
	}

	.empty {
		color: var(--text-dim);
		margin-top: 2rem;
		text-align: center;
	}
</style>
