/**
 * Photo serve route — Story 3.2
 *
 * Streams the room photo file from the on-prem volume with correct Content-Type header.
 * Access control: any authenticated internal user (admin or organizer) may view photos.
 *
 * AC-3: Authenticated internal user GET /rooms/[id]/photo → 200 + Content-Type: image/*
 * AC-4: Unauthenticated request → handled by routeGuard in hooks.server.ts (302/403).
 *       Belt-and-suspenders: also calls requireUser() here per the established project pattern.
 */
import * as fs from 'fs/promises';
import * as path from 'path';

import { error } from '@sveltejs/kit';

import { requireUser } from '$lib/server/auth/guards';
import { MIME_TO_EXT, getRoomById } from '$lib/server/services/room-service';

import type { RequestHandler } from './$types';

/**
 * Map from stored file extension to Content-Type header value.
 * Derived by inverting MIME_TO_EXT so both maps share the same source of truth.
 */
const EXT_TO_CONTENT_TYPE: Record<string, string> = Object.fromEntries(
	Object.entries(MIME_TO_EXT).map(([mime, ext]) => [ext, mime])
);

export const GET: RequestHandler = async (event) => {
	// Belt-and-suspenders: routeGuard in hooks.server.ts already enforces requireUser,
	// but call again here per the established project pattern (see admin +page.server.ts files).
	requireUser(event);

	const room = await getRoomById(event.params.id);

	if (!room || !room.photoPath) {
		error(404, 'No photo');
	}

	const uploadDir = process.env['UPLOAD_DIR'];
	if (!uploadDir) {
		error(500, 'UPLOAD_DIR is not configured');
	}

	// path.basename() prevents path traversal in case room.photoPath contains separators.
	// The write path already uses basename; apply the same defence on read.
	const safeName = path.basename(room.photoPath);
	const fullPath = path.join(uploadDir, safeName);

	let fileBuffer: Buffer;
	try {
		fileBuffer = await fs.readFile(fullPath);
	} catch (err: unknown) {
		const nodeErr = err as { code?: string };
		if (nodeErr.code === 'ENOENT') {
			error(404, 'Photo not found');
		}
		throw err;
	}

	// Derive Content-Type from the stored file extension using the same safe name
	const ext = path.extname(safeName).slice(1).toLowerCase();
	const contentType = EXT_TO_CONTENT_TYPE[ext] ?? 'application/octet-stream';

	// Node.js Buffer is a Uint8Array subclass; slice to a plain ArrayBuffer for the
	// Web API Response constructor (BodyInit). The slice creates a copy but is safe
	// for typical photo sizes (≤10 MB). The TS DOM lib types BodyInit as URLSearchParams
	// | ... | ArrayBuffer, so we convert explicitly.
	const arrayBuffer = fileBuffer.buffer.slice(
		fileBuffer.byteOffset,
		fileBuffer.byteOffset + fileBuffer.byteLength
	) as ArrayBuffer;
	return new Response(arrayBuffer, {
		headers: {
			'Content-Type': contentType,
			// Prevent the browser from MIME-sniffing user-uploaded bytes into an executable type.
			'X-Content-Type-Options': 'nosniff'
		}
	});
};
