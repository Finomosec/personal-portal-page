import { json, type RequestHandler } from '@sveltejs/kit';
import { loadSystems } from '$lib/server/config';
import { probeAll } from '$lib/server/health';

export const POST: RequestHandler = async ({ locals }) => {
	if (!locals.authenticated) {
		return new Response('unauthorized', { status: 401 });
	}
	const { services } = loadSystems();
	const results = await probeAll(services);
	return json(results);
};
