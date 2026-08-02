import { error } from '@sveltejs/kit';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, basename } from 'node:path';
import type { RequestHandler } from './$types';

// Icons werden dynamisch pro Request aus static/icons/ ausgeliefert (nicht über sirv), damit
// ein Datei-Tausch (auch mit geänderter Größe oder neuer Datei) sofort greift — ohne Rebuild,
// ohne sync-assets, ohne Restart. Effizient über ETag/Last-Modified + 304 (If-None-Match /
// If-Modified-Since), sodass unveränderte Icons nicht erneut geladen werden.
const ICONS_DIR = resolve(process.cwd(), 'static/icons');

const TYPES: Record<string, string> = {
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.webp': 'image/webp',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.gif': 'image/gif',
	'.ico': 'image/x-icon'
};

// Kleiner Byte-Cache pro Datei; wird bei geänderter mtime/Größe verworfen.
const cache = new Map<string, { mtimeMs: number; size: number; buf: Buffer }>();

export const GET: RequestHandler = async ({ params, request }) => {
	const name = basename(params.file ?? ''); // nur Basename → kein Path-Traversal
	const ext = extname(name).toLowerCase();
	const type = TYPES[ext];
	if (!type || !/^[\w.-]+$/.test(name)) throw error(404, 'Not found');

	const path = resolve(ICONS_DIR, name);
	if (path !== ICONS_DIR && !path.startsWith(ICONS_DIR + '/')) throw error(404, 'Not found');

	let st;
	try {
		st = await stat(path);
	} catch {
		throw error(404, 'Not found');
	}
	if (!st.isFile()) throw error(404, 'Not found');

	const etag = `"${st.mtimeMs}-${st.size}"`;
	const lastModified = new Date(st.mtimeMs).toUTCString();
	const headers: Record<string, string> = {
		'content-type': type,
		// immer revalidieren → Änderungen sofort sichtbar, aber via 304 ohne Re-Download
		'cache-control': 'no-cache',
		etag,
		'last-modified': lastModified
	};

	// Conditional Request → 304 Not Modified (verhindert wiederholtes Laden unveränderter Icons)
	const inm = request.headers.get('if-none-match');
	const ims = request.headers.get('if-modified-since');
	const notModified =
		inm != null
			? inm === etag
			: ims != null && Date.parse(ims) >= Math.floor(st.mtimeMs / 1000) * 1000;
	if (notModified) return new Response(null, { status: 304, headers });

	let entry = cache.get(name);
	if (!entry || entry.mtimeMs !== st.mtimeMs || entry.size !== st.size) {
		entry = { mtimeMs: st.mtimeMs, size: st.size, buf: await readFile(path) };
		cache.set(name, entry);
	}
	// Node-Buffer gilt den DOM-Typen nicht als BodyInit, ein Uint8Array-View
	// darauf schon — und der kopiert die gecachten Bytes nicht. Der Cast, weil
	// BufferSource ArrayBuffer verlangt; readFile liefert nie SharedArrayBuffer.
	const body = new Uint8Array(
		entry.buf.buffer as ArrayBuffer,
		entry.buf.byteOffset,
		entry.buf.byteLength
	);
	return new Response(body, {
		status: 200,
		headers: { ...headers, 'content-length': String(entry.buf.length) }
	});
};
