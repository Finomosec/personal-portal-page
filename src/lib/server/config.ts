import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import yaml from 'js-yaml';
import type { SystemsConfig } from '$lib/types';

const CONFIG_PATH = resolve(process.cwd(), 'systems.yaml');

let cached: SystemsConfig | null = null;
let cachedMtime = 0;

export function loadSystems(): SystemsConfig {
	const mtime = statSync(CONFIG_PATH).mtimeMs;
	if (cached && mtime === cachedMtime) return cached;
	const raw = readFileSync(CONFIG_PATH, 'utf8');
	const parsed = yaml.load(raw) as SystemsConfig;
	parsed.services = parsed.services.filter((s) => !s.disabled);
	cached = parsed;
	cachedMtime = mtime;
	return parsed;
}
