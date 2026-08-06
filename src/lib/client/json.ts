export class ClientApiError extends Error {
	constructor(
		message: string,
		public readonly status: number
	) {
		super(message);
	}
}

export async function jsonRequest<T>(
	path: string,
	method: 'POST' | 'PUT' | 'DELETE',
	body?: unknown
): Promise<T> {
	const response = await fetch(path, {
		method,
		headers: {
			accept: 'application/json',
			...(body === undefined ? {} : { 'content-type': 'application/json' })
		},
		body: body === undefined ? undefined : JSON.stringify(body)
	});
	const payload = (await response.json().catch(() => ({}))) as { error?: unknown };
	if (!response.ok) {
		throw new ClientApiError(
			typeof payload.error === 'string' ? payload.error : 'The request failed',
			response.status
		);
	}
	return payload as T;
}
