export function isPrivateRoute(pathname: string): boolean {
	return pathname === '/admin' || pathname.startsWith('/admin/');
}

export function shouldUseCachedNavigation(status: number): boolean {
	return status === 429 || status >= 500;
}
