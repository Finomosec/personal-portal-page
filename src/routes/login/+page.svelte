<script lang="ts">
	import { enhance } from '$app/forms';

	let { form } = $props<{ form?: { error?: string } }>();
</script>

<div class="wrap">
	<form method="POST" use:enhance class="card">
		<h1>Nexus Portal</h1>
		<label>
			Passwort
			<input type="password" name="password" autocomplete="current-password" autofocus required />
		</label>
		{#if form?.error}
			<p class="err">{form.error}</p>
		{/if}
		<button type="submit">Anmelden</button>
	</form>
</div>

<style>
	.wrap {
		min-height: 100vh;
		display: grid;
		place-items: center;
		padding: 1rem;
	}

	.card {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		min-width: 18rem;
		padding: 2rem;
		background: var(--bg-card);
		border: 1px solid var(--border);
		border-radius: 14px;
	}

	h1 {
		margin: 0 0 0.5rem;
		font-size: 1.3rem;
	}

	label {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		font-size: 0.85rem;
		color: var(--text-dim);
	}

	.err {
		margin: 0;
		color: var(--down);
		font-size: 0.85rem;
	}
</style>
