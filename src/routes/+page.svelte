<script lang="ts">
	import { browser } from '$app/environment';
	import type { Service, HealthResult, Category, HostInfo, LocationInfo } from '$lib/types';

	const ADMIN_MODE_KEY = 'personal-portal:adminMode';

	let { data } = $props<{
		data: {
			title: string;
			healthCheck: boolean;
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
	let health = $state<Record<string, HealthResult>>({});
	let checking = $state(false);
	let lastCheck = $state<Date | null>(null);

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
	const byCategory = $derived({
		general: filtered.filter((s: Service) => s.category === 'general'),
		ai: filtered.filter((s: Service) => s.category === 'ai'),
		management: filtered.filter((s: Service) => s.category === 'management'),
		intern: filtered.filter((s: Service) => s.category === 'intern')
	} as Record<Category, Service[]>);

	async function runHealthCheck() {
		checking = true;
		try {
			const res = await fetch('/api/health', { method: 'POST' });
			if (!res.ok) throw new Error(`status ${res.status}`);
			health = await res.json();
			lastCheck = new Date();
		} catch (err) {
			console.error('health check failed', err);
		} finally {
			checking = false;
		}
	}

	function statusClass(id: string): string {
		const r = health[id];
		if (!r) return 'unknown';
		return r.status;
	}

	function statusTitle(id: string): string {
		const r = health[id];
		if (!r) return 'noch nicht geprüft';
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
			{#if data.healthCheck}
				<button onclick={runHealthCheck} disabled={checking}>
					{checking ? 'Prüfe…' : 'Health-Check'}
				</button>
			{/if}
			<form method="POST" action="/logout">
				<button type="submit">Logout</button>
			</form>
		</div>
	</header>

	<div class="controls">
		<input
			type="search"
			placeholder="Suche (Name, Beschreibung, URL, Host)…"
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

	{#each [
		{ key: 'general', label: 'Allgemein' },
		{ key: 'management', label: 'Management' },
		{ key: 'intern', label: 'Intern' },
		{ key: 'ai', label: 'KI / MCP' }
	] as section}
		{@const list = byCategory[section.key as Category]}
		{@const visible = adminMode || section.key === 'general'}
		{#if visible && list.length > 0}
			<section>
				{#if adminMode && section.label}
					<h2>{section.label}</h2>
				{/if}
				<div class="grid">
					{#each list as svc (svc.id)}
						<a class="card" href={svc.url} target="_blank" rel="noopener noreferrer">
							<div class="card-top">
								{#if svc.location && data.locations?.[svc.location]}
									<span
										class="loc"
										title={data.locations[svc.location].name}
									>{data.locations[svc.location].shortName}</span>
								{/if}
								<span
									class="status-dot {statusClass(svc.id)}"
									title={statusTitle(svc.id)}
								></span>
							</div>
							<div class="card-head">
								{#if svc.icon}
									<img class="icon" src="/icons/{svc.icon}" alt="" aria-hidden="true" />
								{/if}
								<span class="name">{svc.name}</span>
							</div>
							{#if svc.description}
								<p class="desc">{svc.description}</p>
							{/if}
							<span
								class="host"
								title={data.hosts[svc.host]?.name ?? svc.host}
							>{data.hosts[svc.host]?.shortName ?? svc.host}</span>
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

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
		gap: 0.75rem;
	}

	.card {
		position: relative;
		display: block;
		padding: 0.9rem 1rem;
		background: var(--bg-card);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		color: var(--text);
		text-decoration: none;
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
		gap: 0.5rem;
		margin-bottom: 0.4rem;
	}

	.card-top {
		position: absolute;
		top: 0.6rem;
		right: 0.7rem;
		display: flex;
		align-items: center;
		gap: 0.45rem;
	}

	.status-dot {
		width: 9px;
		height: 9px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.loc {
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

	.name {
		font-weight: 600;
	}

	.host {
		position: absolute;
		bottom: 0.7rem;
		right: 0.7rem;
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
		font-size: 0.85rem;
		color: var(--text-dim);
		line-height: 1.35;
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
