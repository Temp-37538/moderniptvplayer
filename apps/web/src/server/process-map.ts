/**
 * A Map shared by every copy of a module in this process. Next can bundle the
 * same server module once per route, so a plain module-level Map is not
 * shared between a route handler and a server action, and invalidating one
 * copy leaves the others serving stale values.
 */
export function processMap<K, V>(name: string): Map<K, V> {
	const key = Symbol.for(`moderniptvplayer.process-map.${name}`);
	const store = globalThis as typeof globalThis & Record<symbol, unknown>;
	let map = store[key] as Map<K, V> | undefined;
	if (!map) {
		map = new Map<K, V>();
		store[key] = map;
	}
	return map;
}
