import { Agent, fetch as undiciFetch } from 'undici';
import type { Service, HealthResult } from '$lib/types';

const TIMEOUT_MS = 3000;

const insecureAgent = new Agent({ connect: { rejectUnauthorized: false } });

export async function probe(service: Service): Promise<HealthResult> {
	const target = service.healthcheck?.url ?? service.url;
	if (!target) return { status: 'unknown', error: 'no probe url' };

	const started = performance.now();
	const ac = new AbortController();
	const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);

	try {
		const res = await undiciFetch(target, {
			method: 'GET',
			redirect: 'manual',
			signal: ac.signal,
			dispatcher: service.healthcheck?.insecure ? insecureAgent : undefined
		});
		const latencyMs = Math.round(performance.now() - started);
		const status = res.status < 500 ? 'ok' : 'down';
		return { status, code: res.status, latencyMs };
	} catch (err) {
		const latencyMs = Math.round(performance.now() - started);
		const msg = err instanceof Error ? err.message : String(err);
		return { status: 'down', latencyMs, error: msg };
	} finally {
		clearTimeout(timer);
	}
}

export async function probeAll(services: Service[]): Promise<Record<string, HealthResult>> {
	const entries = await Promise.all(
		services.map(async (s) => [s.id, await probe(s)] as const)
	);
	return Object.fromEntries(entries);
}
