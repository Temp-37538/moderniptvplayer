import assert from "node:assert/strict";
import { test } from "node:test";
import {
	findMembershipRow,
	isCategorySetBlocked,
	itemOpenAllowed,
	provenCategoryIds,
	toMembershipRows,
} from "./category-preference-policy.ts";

const HIDDEN = "hidden-h";
const VISIBLE = "visible-v";
const OTHER = "other-v";
const ADULT = "adult-a";

const names = new Map([
	[HIDDEN, "Family"],
	[VISIBLE, "Action"],
	[OTHER, "Comedy"],
	[ADULT, "XXX Movies"],
]);

function neverListed(): Promise<unknown> {
	throw new Error("the listing must not be read");
}

function account(options: { hidden?: string[]; lock?: boolean }) {
	const hiddenIds = new Set(options.hidden ?? []);
	const lockAdultCategories = options.lock ?? false;
	return {
		restricted: hiddenIds.size > 0 || lockAdultCategories,
		isAvailable: (
			categoryIds: readonly string[],
			requiredIds: readonly string[],
		) =>
			Promise.resolve(
				!isCategorySetBlocked({
					categoryIds,
					namesById: names,
					hiddenIds,
					lockAdultCategories,
					requiredIds: new Set(requiredIds),
				}),
			),
	};
}

test("detail categories prove the requested one and stay authoritative", async () => {
	assert.deepEqual(
		await provenCategoryIds(
			{ categoryIds: [VISIBLE, HIDDEN] },
			VISIBLE,
			neverListed,
		),
		[VISIBLE, HIDDEN],
	);
	assert.equal(
		await provenCategoryIds({ categoryIds: [HIDDEN] }, VISIBLE, neverListed),
		null,
	);
});

test("without detail categories one listing row is the proof", async () => {
	let reads = 0;
	const listing = () => {
		reads += 1;
		return Promise.resolve({ id: "m1", categoryIds: [OTHER] });
	};

	assert.deepEqual(await provenCategoryIds({}, VISIBLE, listing), [
		VISIBLE,
		OTHER,
	]);
	assert.equal(reads, 1);
	assert.deepEqual(await provenCategoryIds(null, OTHER, listing), [OTHER]);
});

test("a missing or failing listing denies", async () => {
	assert.equal(
		await provenCategoryIds({}, VISIBLE, () => Promise.resolve(null)),
		null,
	);
	assert.equal(
		await provenCategoryIds({}, VISIBLE, () =>
			Promise.reject(new Error("unavailable")),
		),
		null,
	);
});

test("a hidden-only title does not open through a visible category", async () => {
	const { restricted, isAvailable } = account({ hidden: [HIDDEN] });

	assert.equal(
		await itemOpenAllowed({
			restricted,
			item: { categoryIds: [HIDDEN] },
			categoryId: VISIBLE,
			loadListing: neverListed,
			isAvailable,
		}),
		false,
	);
	assert.equal(
		await itemOpenAllowed({
			restricted,
			item: { categoryIds: [HIDDEN, VISIBLE] },
			categoryId: VISIBLE,
			loadListing: neverListed,
			isAvailable,
		}),
		true,
	);
	assert.equal(
		await itemOpenAllowed({
			restricted,
			item: { categoryIds: [HIDDEN, VISIBLE] },
			categoryId: HIDDEN,
			loadListing: neverListed,
			isAvailable,
		}),
		false,
	);
});

test("a title without detail categories needs the listing when restricted", async () => {
	const { restricted, isAvailable } = account({ hidden: [HIDDEN] });
	const listed = (categoryIds: string[]) => () =>
		Promise.resolve({ id: "m1", categoryIds });

	assert.equal(
		await itemOpenAllowed({
			restricted,
			item: {},
			categoryId: VISIBLE,
			loadListing: listed([VISIBLE]),
			isAvailable,
		}),
		true,
	);
	assert.equal(
		await itemOpenAllowed({
			restricted,
			item: {},
			categoryId: VISIBLE,
			loadListing: () => Promise.resolve(null),
			isAvailable,
		}),
		false,
	);
});

test("the adult lock sees every real category of the title", async () => {
	const { restricted, isAvailable } = account({ lock: true });

	assert.equal(
		await itemOpenAllowed({
			restricted,
			item: { categoryIds: [VISIBLE, ADULT] },
			categoryId: VISIBLE,
			loadListing: neverListed,
			isAvailable,
		}),
		false,
	);
	assert.equal(
		await itemOpenAllowed({
			restricted,
			item: {},
			categoryId: VISIBLE,
			loadListing: () => Promise.resolve({ id: "m1", categoryIds: [ADULT] }),
			isAvailable,
		}),
		false,
	);
});

test("an unrestricted account never reads the listing", async () => {
	const { restricted, isAvailable } = account({});

	assert.equal(restricted, false);
	assert.equal(
		await itemOpenAllowed({
			restricted,
			item: { categoryIds: [HIDDEN] },
			categoryId: OTHER,
			loadListing: neverListed,
			isAvailable,
		}),
		true,
	);
	assert.equal(
		await itemOpenAllowed({
			restricted,
			item: null,
			categoryId: OTHER,
			loadListing: neverListed,
			isAvailable,
		}),
		true,
	);
});

test("membership rows keep only the id and the categories", () => {
	const rows = toMembershipRows([
		{ id: " m1 ", categoryId: VISIBLE, plot: "long text", url: "http://x" },
		{ id: "m2", categoryIds: [OTHER, VISIBLE, OTHER] },
		{ id: "", categoryId: HIDDEN },
		null,
		"junk",
		{ categoryId: HIDDEN },
	]);

	assert.deepEqual(rows, [
		{ id: "m1", categoryIds: [VISIBLE] },
		{ id: "m2", categoryIds: [OTHER, VISIBLE] },
	]);
	assert.deepEqual(toMembershipRows(undefined), []);
	assert.deepEqual(findMembershipRow(rows, "m2"), {
		id: "m2",
		categoryIds: [OTHER, VISIBLE],
	});
	assert.equal(findMembershipRow(rows, "missing"), null);
});
