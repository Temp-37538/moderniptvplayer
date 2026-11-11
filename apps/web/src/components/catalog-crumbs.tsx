import { getCategoryMetadataContext } from "@/app/metadata";
import { BreadcrumbLabel } from "@/components/breadcrumb-labels";

/**
 * Names the category crumb, and the item crumb when given, of a catalog page.
 * The category name comes from the same cached lookup as the page metadata.
 */
export async function CatalogCrumbs({
	section,
	playlistId,
	categoryId,
	itemId,
	itemName,
}: {
	section: "channels" | "movies" | "series";
	playlistId: string;
	categoryId: string;
	itemId?: string;
	itemName?: string;
}) {
	const context = await getCategoryMetadataContext(
		section,
		playlistId,
		categoryId,
	);
	const categoryHref = `/dashboard/${section}/${playlistId}/${categoryId}`;

	return (
		<>
			<BreadcrumbLabel href={categoryHref} label={context?.categoryName} />
			{itemId ? (
				<BreadcrumbLabel href={`${categoryHref}/${itemId}`} label={itemName} />
			) : null}
		</>
	);
}
