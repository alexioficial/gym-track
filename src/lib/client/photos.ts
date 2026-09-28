import { ClientApiError, jsonRequest } from './json';

const MAX_SIDE = 1600;
const QUALITY = 0.85;

/**
 * Phone photos are several megabytes; progress photos only need to be clear on
 * a screen. Re-encoding as JPEG also drops the location data cameras embed.
 */
export async function shrinkPhoto(file: File): Promise<Blob> {
	const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
	const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
	const canvas = document.createElement('canvas');
	canvas.width = Math.round(bitmap.width * scale);
	canvas.height = Math.round(bitmap.height * scale);
	canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
	bitmap.close();
	return new Promise((resolve, reject) =>
		canvas.toBlob(
			(blob) => (blob ? resolve(blob) : reject(new Error('No se pudo leer la foto'))),
			'image/jpeg',
			QUALITY
		)
	);
}

/** Uploads one photo and returns its key. `userId` is for a coach uploading for a client. */
export async function uploadPhoto(file: File, userId?: string): Promise<string> {
	const blob = await shrinkPhoto(file);
	const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
	const target = await jsonRequest<{ key: string; uploadUrl: string; contentType: string }>(
		`/api/photos/uploads${query}`,
		'POST',
		{ contentType: 'image/jpeg' }
	);
	const response = await fetch(target.uploadUrl, {
		method: 'PUT',
		headers: { 'content-type': target.contentType },
		body: blob,
		signal: AbortSignal.timeout(60_000)
	});
	if (!response.ok) throw new ClientApiError('No se pudo subir la foto', response.status);
	return target.key;
}

export function photoUrl(key: string): string {
	return `/api/photos/${key}`;
}
