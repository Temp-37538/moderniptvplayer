/**
 * The channels before and after the current one in its category, for
 * zapping from the player. The list wraps around, like a TV remote. Null
 * when the channel is not in the list or is the only one.
 */
export function channelNeighbors<T extends { id: string }>(
	channels: readonly T[],
	currentId: string,
): { previous: T; next: T } | null {
	const index = channels.findIndex((channel) => channel.id === currentId);
	if (index === -1 || channels.length < 2) {
		return null;
	}
	const count = channels.length;
	const previous = channels[(index - 1 + count) % count];
	const next = channels[(index + 1) % count];
	return previous && next ? { previous, next } : null;
}
