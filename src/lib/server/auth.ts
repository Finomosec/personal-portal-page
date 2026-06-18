import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '$env/dynamic/private';

const COOKIE_NAME = 'portal_session';
const TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

function secret(): string {
	const s = env.PORTAL_SECRET;
	if (!s || s.length < 16) {
		throw new Error('PORTAL_SECRET must be set (>= 16 chars)');
	}
	return s;
}

function sign(payload: string): string {
	return createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function checkPassword(input: string): boolean {
	const expected = env.PORTAL_PASSWORD ?? '';
	if (!expected) return false;
	const a = Buffer.from(input);
	const b = Buffer.from(expected);
	if (a.length !== b.length) return false;
	return timingSafeEqual(a, b);
}

export function makeToken(): string {
	const payload = String(Date.now() + TTL_MS);
	return `${payload}.${sign(payload)}`;
}

export function verifyToken(token: string | undefined): boolean {
	if (!token) return false;
	const [payload, sig] = token.split('.');
	if (!payload || !sig) return false;
	const expected = sign(payload);
	const a = Buffer.from(sig);
	const b = Buffer.from(expected);
	if (a.length !== b.length) return false;
	if (!timingSafeEqual(a, b)) return false;
	const exp = Number(payload);
	if (!Number.isFinite(exp)) return false;
	return Date.now() < exp;
}

export { COOKIE_NAME };
