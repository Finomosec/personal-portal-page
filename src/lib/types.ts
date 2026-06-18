export type Category = 'general' | 'ai' | 'management' | 'intern';

export interface Service {
	id: string;
	name: string;
	host: string;
	location?: string;
	url: string;
	category: Category;
	description?: string;
	icon?: string;
	disabled?: boolean;
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

export interface SystemsConfig {
	title?: string;
	healthCheck?: boolean;
	hosts: Record<string, HostInfo>;
	locations: Record<string, LocationInfo>;
	services: Service[];
}

export type HealthStatus = 'ok' | 'down' | 'unknown';

export interface HealthResult {
	status: HealthStatus;
	code?: number;
	latencyMs?: number;
	error?: string;
}
