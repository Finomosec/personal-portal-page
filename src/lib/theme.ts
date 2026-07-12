import { browser } from '$app/environment';

// Zwei Themes über [data-theme] am <html>: 'matrix' (Default, grünes Neon-Dark) und 'light'.
// Angelehnt an das Zählerprojekt (getTheme/applyTheme/toggleTheme + localStorage).
export type Theme = 'matrix' | 'light';

const KEY = 'personal-portal:theme';

export function getTheme(): Theme {
	if (!browser) return 'matrix';
	return localStorage.getItem(KEY) === 'light' ? 'light' : 'matrix';
}

export function applyTheme(theme: Theme): void {
	if (!browser) return;
	document.documentElement.dataset.theme = theme;
	localStorage.setItem(KEY, theme);
}

export function toggleTheme(): Theme {
	const next: Theme = getTheme() === 'matrix' ? 'light' : 'matrix';
	applyTheme(next);
	return next;
}
