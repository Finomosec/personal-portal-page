import { redirect, type Handle } from '@sveltejs/kit';
import { COOKIE_NAME, verifyToken } from '$lib/server/auth';

// Exakte Pfade, die ohne Login erreichbar sind (App-Einstiege).
const PUBLIC_PATHS = new Set(['/login', '/favicon.svg', '/favicon.png']);

// Statische Assets pauschal per REGEL freigeben (statt Fileliste):
// SvelteKit-Build-Assets (/_app/), das Icons-Verzeichnis und alles mit
// einer typischen Asset-Endung. App-/API-Routen sind extensionslos und
// bleiben daher weiterhin hinter dem Login-Gate.
const PUBLIC_PREFIXES = ['/_app/', '/icons/'];
const ASSET_EXT = /\.(svg|png|jpe?g|webp|gif|ico|css|js|mjs|map|woff2?|ttf|otf|eot)$/i;

function isPublic(pathname: string): boolean {
	if (PUBLIC_PATHS.has(pathname)) return true;
	if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return true;
	return ASSET_EXT.test(pathname);
}

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(COOKIE_NAME);
	event.locals.authenticated = verifyToken(token);

	if (!event.locals.authenticated && !isPublic(event.url.pathname)) {
		throw redirect(303, `/login?next=${encodeURIComponent(event.url.pathname)}`);
	}

	return resolve(event);
};
