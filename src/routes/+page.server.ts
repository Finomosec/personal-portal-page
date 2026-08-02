import type { PageServerLoad } from './$types';
import { loadSystems } from '$lib/server/config';
import { aiConfig } from '$lib/server/chat-context';

const DEFAULT_CATEGORIES = [
	{ key: 'general', label: 'Allgemein', visible: 'always' as const },
	{ key: 'management', label: 'Management', visible: 'admin' as const },
	{ key: 'intern', label: 'Intern', visible: 'admin' as const }
];

export const load: PageServerLoad = async () => {
	const { title, healthCheck, categories, hosts, locations, services } = loadSystems();
	const ai = aiConfig();
	return {
		title: title ?? 'Portal',
		healthCheck: healthCheck ?? true,
		categories: categories ?? DEFAULT_CATEGORIES,
		hosts,
		locations,
		services,
		ai: {
			enabled: ai.enabled,
			defaultBackend: ai.defaultBackend,
			backends: ai.backends.map((b) => ({ id: b.id, label: b.label }))
		}
	};
};
