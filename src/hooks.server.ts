import { redirect, type Handle } from '@sveltejs/kit';
import { COOKIE_NAME, verifyToken } from '$lib/server/auth';

const PUBLIC_PATHS = new Set(['/login', '/favicon.svg', '/favicon.png']);

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(COOKIE_NAME);
	event.locals.authenticated = verifyToken(token);

	if (!event.locals.authenticated && !PUBLIC_PATHS.has(event.url.pathname)) {
		throw redirect(303, `/login?next=${encodeURIComponent(event.url.pathname)}`);
	}

	return resolve(event);
};
