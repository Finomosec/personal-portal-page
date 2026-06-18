import { fail, redirect, type Actions } from '@sveltejs/kit';
import { COOKIE_NAME, checkPassword, makeToken } from '$lib/server/auth';

export const actions: Actions = {
	default: async ({ request, cookies, url }) => {
		const form = await request.formData();
		const pw = String(form.get('password') ?? '');
		if (!checkPassword(pw)) {
			return fail(401, { error: 'Falsches Passwort' });
		}
		cookies.set(COOKIE_NAME, makeToken(), {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: url.protocol === 'https:',
			maxAge: 60 * 60 * 24 * 30
		});
		const next = url.searchParams.get('next') ?? '/';
		throw redirect(303, next.startsWith('/') ? next : '/');
	}
};
