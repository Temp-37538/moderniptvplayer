/** Share of the title already watched, from 0 to 100. */
export function progressPercent(positionSec: number, durationSec: number) {
	if (!(durationSec > 0) || !(positionSec > 0)) {
		return 0;
	}
	return Math.min(100, Math.round((positionSec / durationSec) * 100));
}

/** Short "time left" label, or null when the duration is unknown. */
export function formatTimeLeft(
	positionSec: number,
	durationSec: number,
): string | null {
	if (!(durationSec > 0)) {
		return null;
	}
	const leftSec = Math.max(0, durationSec - Math.max(0, positionSec));
	const minutes = Math.ceil(leftSec / 60);
	if (minutes <= 1) {
		return "Almost done";
	}
	if (minutes < 60) {
		return `${minutes} min left`;
	}
	const hours = Math.floor(minutes / 60);
	const rest = minutes % 60;
	return rest === 0 ? `${hours} h left` : `${hours} h ${rest} min left`;
}
