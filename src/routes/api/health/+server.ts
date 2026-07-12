import { json, type RequestHandler } from '@sveltejs/kit';
import { loadSystems } from '$lib/server/config';
import { probeAll } from '$lib/server/health';

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.authenticated) {
		return new Response('unauthorized', { status: 401 });
	}
	const { services } = loadSystems();
	// Optional: nur bestimmte Service-IDs prüfen (die aktuell sichtbaren).
	// Ohne/ungültigen Body werden alle geprüft (rückwärtskompatibel).
	let targets = services;
	try {
		const body = await request.json();
		if (body && Array.isArray(body.ids)) {
			const wanted = new Set(body.ids as string[]);
			targets = services.filter((s) => wanted.has(s.id));
		}
	} catch {
		// kein/ungültiger Body → alle prüfen
	}
	const results = await probeAll(targets);
	return json(results);
};
