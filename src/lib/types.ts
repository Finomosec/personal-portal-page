export interface CategoryDef {
	key: string;
	label: string;
	visible: 'always' | 'admin';
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

export interface SystemsConfig {
	title?: string;
	healthCheck?: boolean;
	categories?: CategoryDef[];
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
