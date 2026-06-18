import type { PageServerLoad } from './$types';
import { loadSystems } from '$lib/server/config';

export const load: PageServerLoad = async () => {
	const { title, healthCheck, hosts, locations, services } = loadSystems();
	return {
		title: title ?? 'Portal',
		healthCheck: healthCheck ?? true,
		hosts,
		locations,
		services
	};
};
