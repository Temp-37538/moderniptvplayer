// Lets node:test import safe-stream.ts. The package throws outside React Server.
export async function resolve(specifier, context, nextResolve) {
	if (specifier === "server-only") {
		return {
			format: "module",
			shortCircuit: true,
			url: "data:text/javascript,export%20%7B%7D",
		};
	}
	return nextResolve(specifier, context);
}
