// Lets node:test import the global search route without Prisma, Next, or a
// provider.
const doubles = new URL("./search-route-doubles.mjs", import.meta.url).href;

const mocked = new Set([
	"next/server",
	"@/server/auth-utils",
	"@/server/catalog-index",
	"@/server/category-access",
	"@/server/rate-limit",
	"@/server/xtream",
]);

export async function resolve(specifier, context, nextResolve) {
	if (specifier === "server-only") {
		return {
			format: "module",
			shortCircuit: true,
			url: "data:text/javascript,export%20%7B%7D",
		};
	}
	if (mocked.has(specifier)) {
		return {
			format: "module",
			shortCircuit: true,
			url: doubles,
		};
	}
	if (specifier.startsWith("@/")) {
		const relative = specifier.slice(2);
		return {
			shortCircuit: true,
			url: new URL(`../${relative}.ts`, import.meta.url).href,
		};
	}
	return nextResolve(specifier, context);
}
