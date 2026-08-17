export function shouldUseCachedNavigation(status: number): boolean {
	return status === 429 || status >= 500;
}
