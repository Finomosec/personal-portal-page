export interface CategoryDef {
	key: string;
	label: string;
	visible: 'always' | 'admin';
	/** Kategorie liegt „im Internet" — Healthcheck nur, wenn aktiv dahin gefiltert wurde. */
	external?: boolean;
}

export interface Service {
	id: string;
	name: string;
	host: string;
	location?: string;
	url: string;
	category: string;
	description?: string;
	icon?: string;
	disabled?: boolean;
	download?: boolean;
	healthcheck?: {
		url: string;
		insecure?: boolean;
	};
}

export interface LocationInfo {
	name: string;
	shortName: string;
}

export interface HostInfo {
	name: string;
	shortName: string;
	hidden?: boolean;
}

/** OpenAI-kompatibler Endpoint — funktioniert für Ollama wie für LM Studio. */
export interface AiBackend {
	id: string;
	label: string;
	url: string;
	model: string;
}

export interface AiConfig {
	enabled: boolean;
	/** Kategorien, die der KI nicht gezeigt werden. */
	excludeCategories: string[];
	maxTokens?: number;
	defaultBackend: string;
	backends: AiBackend[];
}

/** Was der Client sehen darf — ohne URLs und Modellnamen preiszugeben. */
export interface AiClientConfig {
	enabled: boolean;
	defaultBackend: string;
	backends: { id: string; label: string }[];
}

export interface SystemsConfig {
	title?: string;
	healthCheck?: boolean;
	categories?: CategoryDef[];
	hosts: Record<string, HostInfo>;
	locations: Record<string, LocationInfo>;
	services: Service[];
	ai?: {
		enabled?: boolean;
		excludeCategories?: string[];
		maxTokens?: number;
		defaultBackend?: string;
		backends?: AiBackend[];
	};
}

export interface ChatMessage {
	role: 'user' | 'assistant';
	content: string;
}

export interface ChatAction {
	service: Service;
}

export type HealthStatus = 'ok' | 'down' | 'unknown';

export interface HealthResult {
	status: HealthStatus;
	code?: number;
	latencyMs?: number;
	error?: string;
}
