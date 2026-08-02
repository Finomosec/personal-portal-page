import { loadSystems } from './config';
import type { AiBackend, AiConfig, Service } from '$lib/types';

const FALLBACK: AiBackend = {
	id: 'local',
	label: 'Lokal',
	url: 'http://127.0.0.1:11434/v1',
	model: 'qwen3:4b-instruct'
};

export function aiConfig(): AiConfig {
	const { ai } = loadSystems();
	const backends = ai?.backends?.length ? ai.backends : [FALLBACK];
	return {
		enabled: ai?.enabled ?? false,
		excludeCategories: ai?.excludeCategories ?? [],
		maxTokens: ai?.maxTokens ?? 512,
		defaultBackend: ai?.defaultBackend ?? backends[0].id,
		backends
	};
}

export function resolveBackend(id?: string): AiBackend {
	const cfg = aiConfig();
	return cfg.backends.find((b) => b.id === id) ?? cfg.backends.find((b) => b.id === cfg.defaultBackend) ?? cfg.backends[0];
}

/** Services, die die KI kennen darf — bewusst unabhängig vom Admin-Modus. */
export function aiServices(): Service[] {
	const { services, categories } = loadSystems();
	const excluded = new Set(aiConfig().excludeCategories);
	const known = new Set((categories ?? []).map((c) => c.key));
	return services.filter((s) => !excluded.has(s.category) && known.has(s.category));
}

function serviceList(): string {
	const { categories } = loadSystems();
	const services = aiServices();
	const lines: string[] = [];
	for (const cat of categories ?? []) {
		const items = services.filter((s) => s.category === cat.key);
		if (!items.length) continue;
		lines.push(`## ${cat.label}`);
		for (const s of items) {
			lines.push(`- ${s.id}: ${s.name}${s.description ? ` — ${s.description}` : ''}`);
		}
	}
	return lines.join('\n');
}

/**
 * Die Dienstliste steht bewusst am Anfang: llama.cpp cached den gemeinsamen
 * Prompt-Prefix, wodurch sie nach dem ersten Aufruf keine Rechenzeit mehr kostet.
 */
export function systemPrompt(): string {
	return `Du bist der Assistent des Portals. Du hilfst bei allen Fragen — antworte
normal und hilfsbereit auf Deutsch, halte dich kurz.

Zusätzlich kennst du die Dienste dieses Netzwerks:

${serviceList()}

Wenn der Nutzer einen dieser Dienste sucht oder öffnen möchte, setze "openService"
auf dessen exakte id aus der Liste. Bei allen anderen Fragen bleibt "openService"
ein leerer String — beantworte sie einfach normal in "answer".`;
}

export const RESPONSE_FORMAT = {
	type: 'json_schema',
	json_schema: {
		name: 'portal_reply',
		strict: true,
		schema: {
			type: 'object',
			properties: {
				answer: { type: 'string' },
				openService: { type: 'string' }
			},
			required: ['answer', 'openService'],
			additionalProperties: false
		}
	}
};
