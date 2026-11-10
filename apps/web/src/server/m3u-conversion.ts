/**
 * Converting an M3U playlist into an Xtream one keeps the row but not the
 * catalog behind it: M3U items are identified by a hash of their stream URL
 * and M3U categories by a hash of their group, so none of them exist in the
 * Xtream catalog. Rows saved against those ids can never open again, so they
 * are removed together with the conversion instead of being left as dead
 * links in favorites, watch later, and continue watching.
 */

export type SavedItemCounts = {
	favorites: number;
	watchLater: number;
	progress: number;
	categoryPreferences: number;
};

export class M3uConversionTargetMissingError extends Error {
	constructor() {
		super("Playlist not found");
		this.name = "M3uConversionTargetMissingError";
	}
}

type Batch = Promise<{ count: number }>;

/**
 * Runs inside one database transaction. The playlist row is converted first,
 * and rows are removed only when that update matched an M3U playlist of this
 * user, so a missing or already converted playlist never loses anything.
 */
export async function convertM3uRows(steps: {
	convert: () => Batch;
	clear: {
		favorites: () => Batch;
		watchLater: () => Batch;
		progress: () => Batch;
		categoryPreferences: () => Batch;
	};
}): Promise<SavedItemCounts> {
	const converted = await steps.convert();
	if (converted.count < 1) {
		throw new M3uConversionTargetMissingError();
	}
	const favorites = await steps.clear.favorites();
	const watchLater = await steps.clear.watchLater();
	const progress = await steps.clear.progress();
	const categoryPreferences = await steps.clear.categoryPreferences();
	return {
		favorites: favorites.count,
		watchLater: watchLater.count,
		progress: progress.count,
		categoryPreferences: categoryPreferences.count,
	};
}

export function clearedItemsTotal(counts: SavedItemCounts): number {
	return (
		counts.favorites +
		counts.watchLater +
		counts.progress +
		counts.categoryPreferences
	);
}

const HTTP_884_REFUSED =
	"Your M3U link was refused by the server (HTTP 884), so the playlist";

/** Shown after an add where HTTP 884 made the M3U link an Xtream playlist. */
export const M3U_ADDED_AS_XTREAM_MESSAGE = `${HTTP_884_REFUSED} was added as Xtream using the username and password from the link.`;

export function conversionSuccessMessage(counts: SavedItemCounts): string {
	const converted = `Playlist updated. ${HTTP_884_REFUSED} now signs in with Xtream using the username and password from the link.`;
	if (clearedItemsTotal(counts) === 0) {
		return converted;
	}
	return `${converted} The favorites, watch later items, progress, and category choices saved from the M3U version were cleared. Their items do not exist in the Xtream catalog.`;
}
