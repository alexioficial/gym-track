/**
 * Offline mode only makes sense on the real site. localhost (any port) and plain http
 * share browser storage with whatever else runs there, so they never get it.
 */
export function offlineSupported(location: Pick<Location, 'protocol' | 'hostname'>): boolean {
	if (location.protocol !== 'https:') return false;
	const host = location.hostname.toLowerCase();
	return (
		host !== 'localhost' && !host.endsWith('.localhost') && host !== '127.0.0.1' && host !== '[::1]'
	);
}
