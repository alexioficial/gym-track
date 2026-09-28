// Small promise wrappers over IndexedDB, shared by the offline stores.

export function request<T>(value: IDBRequest<T>): Promise<T> {
	return new Promise((resolve, reject) => {
		value.onsuccess = () => resolve(value.result);
		value.onerror = () => reject(value.error ?? new Error('Local storage request failed'));
	});
}

export function completed(transaction: IDBTransaction): Promise<void> {
	return new Promise((resolve, reject) => {
		transaction.oncomplete = () => resolve();
		transaction.onabort = () =>
			reject(transaction.error ?? new Error('Local storage transaction failed'));
		transaction.onerror = () =>
			reject(transaction.error ?? new Error('Local storage transaction failed'));
	});
}
