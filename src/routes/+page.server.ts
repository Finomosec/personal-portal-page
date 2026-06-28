import type { PageServerLoad } from './$types';
import { loadSystems } from '$lib/server/config';

const DEFAULT_CATEGORIES = [
	{ key: 'general', label: 'Allgemein', visible: 'always' as const },
	{ key: 'management', label: 'Management', visible: 'admin' as const },
	{ key: 'intern', label: 'Intern', visible: 'admin' as const }
];

export const load: PageServerLoad = async () => {
	const { title, healthCheck, categories, hosts, locations, services } = loadSystems();
	return {
		title: title ?? 'Portal',
		healthCheck: healthCheck ?? true,
		categories: categories ?? DEFAULT_CATEGORIES,
		hosts,
		locations,
		services
	};
};
