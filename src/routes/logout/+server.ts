import { redirect, type RequestHandler } from '@sveltejs/kit';
import { COOKIE_NAME } from '$lib/server/auth';

export const POST: RequestHandler = async ({ cookies }) => {
	cookies.delete(COOKIE_NAME, { path: '/' });
	throw redirect(303, '/login');
};
