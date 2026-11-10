import {
	ClapperboardIcon,
	FilmIcon,
	HeartIcon,
	HistoryIcon,
	SearchIcon,
	TvIcon,
} from "lucide-react";
import type * as React from "react";

export type ListedCategory = {
	id: string;
	name: string;
	pinned: boolean;
};

export type CategorySearchProps = {
	id: string;
	playlistName: string;
	categories: ListedCategory[];
	hiddenCategories: ListedCategory[];
	lockAdultCategories: boolean;
};

/**
 * Playlist as exposed to client components. The encrypted password is never
 * part of it.
 */
export interface Playlist {
	id: string;
	source: "XTREAM" | "M3U";
	serverUrl: string;
	username: string;
	playlistName: string;
	userId: string;
	createdAt: string | Date;
	updatedAt: string | Date;
}

export type M3uFormState = {
	errors: { m3uUrl?: string; playlistName?: string };
	inputs?: { m3uUrl: string; playlistName: string };
	success: boolean;
	message?: string;
	playlistId?: string;
	changed?: boolean;
	/** HTTP 884 turned the submitted M3U link into an Xtream playlist. */
	convertedToXtream?: boolean;
};

export interface NavItem {
	title: string;
	url: string;
	icon: React.ReactNode;
	isActive?: boolean;
	items: Array<{ title: string; url: string }>;
}

export interface Project {
	name: string;
	url: string;
	icon: React.ReactNode;
	/** Letter of the Ctrl/Cmd shortcut shown next to the entry. */
	shortcut?: string;
}

export const sidebarData = {
	navMain: [
		{
			title: "TV",
			url: "#",
			icon: <TvIcon />,
			isActive: true,
			items: [
				{ title: "Browse TV channels", url: "/dashboard/channels" },
				{
					title: "Search TV channels by category",
					url: "/dashboard/channels/search",
				},
			],
		},
		{
			title: "Movies",
			url: "#",
			icon: <FilmIcon />,
			items: [
				{ title: "Browse movie categories", url: "/dashboard/movies" },
				{ title: "Search movies by category", url: "/dashboard/movies/search" },
			],
		},
		{
			title: "Series",
			url: "#",
			icon: <ClapperboardIcon />,
			items: [
				{ title: "Browse series categories", url: "/dashboard/series" },
				{ title: "Search series by category", url: "/dashboard/series/search" },
			],
		},
	] as NavItem[],

	projects: [
		{
			name: "Search",
			url: "/dashboard/search",
			icon: <SearchIcon />,
			shortcut: "K",
		},
		{
			name: "Watch Later",
			url: "/dashboard/watchlater",
			icon: <HistoryIcon />,
		},
		{ name: "Favorites", url: "/dashboard/favorites", icon: <HeartIcon /> },
	] as Project[],
};

export type xtreamFormData = {
	username: string;
	password: string;
	serverUrl: string;
	playlistName: string;
};

export type FormState = {
	errors: {
		properties?:
			| {
					username?:
						| {
								errors: string[];
						  }
						| undefined;
					password?:
						| {
								errors: string[];
						  }
						| undefined;
					serverUrl?:
						| {
								errors: string[];
						  }
						| undefined;
					playlistName?:
						| {
								errors: string[];
						  }
						| undefined;
			  }
			| undefined;
	};
	inputs?: xtreamFormData;
	success: boolean;
	message?: string;
	changed?: boolean;
	/** Id of the playlist a successful add created. */
	playlistId?: string;
};

export type PageProps = {
	params: Promise<{ id: string; categoryId: string; showId: string }>;
};

export type ItemType = "channel" | "movie" | "series";

export type UserItemStatus = {
	isWatchLater: boolean;
	isFavorite: boolean;
};

export type CopyStreamButtonProps = {
	url: string;
};

export type ExternalStreamLinkProps = {
	href: string;
	label: string;
};

export type EmptyStateProps = {
	icon?: React.ReactNode;
	title: string;
	description?: string;
};

export type ItemActionButtonsProps = {
	playlistId: string;
	itemId: string;
	itemType: ItemType;
	itemName: string;
	itemUrl: string;
	isWatchLater: boolean;
	isFavorite: boolean;
};

export type PaginationNavProps = {
	currentPage: number;
	/** Pages in the whole category, at least 1. */
	totalPages: number;
	hasNextPage: boolean;
	hasPreviousPage: boolean;
	/** Base URL without `?page=` query param, e.g. `/dashboard/channels/abc/123` */
	baseUrl: string;
};

export type RemoveItemButtonProps = {
	itemId: string;
	itemType: ItemType;
	itemName: string;
	itemUrl: string;
	playlistId: string;
	variant: "watchlater" | "favorites";
};

export type SavedItem = {
	id: string;
	itemId: string;
	itemType: string;
	itemName: string;
	itemUrl: string;
	playlistId: string;
	createdAt: Date;
};

export type SavedItemsListProps = {
	items: SavedItem[];
	playlistId: string;
	variant: "watchlater" | "favorites";
};

export type CategorySearchBaseProps = CategorySearchProps & {
	title: string;
	placeholder: string;
	emptyTitle: string;
	emptyDescription: string;
	hrefPrefix: string;
	Icon: React.ComponentType<{ className?: string }>;
};

export type SimpleFormState = {
	errors: Record<string, string>;
	success: boolean;
};

export type PlaylistSection =
	| "channels"
	| "movies"
	| "series"
	| "watchlater"
	| "favorites"
	| null;

export type PlaylistIdPageProps = {
	params: Promise<{ playlistId: string }>;
};

export type IdPageProps = {
	params: Promise<{ id: string }>;
};

export type IdCategoryPageProps = {
	params: Promise<{ id: string; categoryId: string }>;
	searchParams: Promise<{ page?: string }>;
};

export type ChannelDetailPageProps = {
	params: Promise<{ id: string; categoryId: string; channelId: string }>;
};

export type MovieDetailPageProps = {
	params: Promise<{ id: string; categoryId: string; movieId: string }>;
};
