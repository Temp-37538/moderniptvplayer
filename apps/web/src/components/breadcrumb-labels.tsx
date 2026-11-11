"use client";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";

type BreadcrumbLabelsValue = {
	labels: Readonly<Record<string, string>>;
	setLabel: (href: string, label: string | null) => void;
};

const BreadcrumbLabelsContext = createContext<BreadcrumbLabelsValue>({
	labels: {},
	setLabel: () => {},
});

export function BreadcrumbLabelsProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const [labels, setLabels] = useState<Record<string, string>>({});

	const setLabel = useCallback((href: string, label: string | null) => {
		setLabels((current) => {
			if (label === null) {
				if (!(href in current)) return current;
				const { [href]: _removed, ...rest } = current;
				return rest;
			}
			return current[href] === label ? current : { ...current, [href]: label };
		});
	}, []);

	const value = useMemo(() => ({ labels, setLabel }), [labels, setLabel]);

	return (
		<BreadcrumbLabelsContext value={value}>{children}</BreadcrumbLabelsContext>
	);
}

export function useBreadcrumbLabels() {
	return useContext(BreadcrumbLabelsContext).labels;
}

/**
 * Names the breadcrumb for `href`, for segments the header can only see as
 * ids (categories, titles). Renders nothing.
 */
export function BreadcrumbLabel({
	href,
	label,
}: {
	href: string;
	label: string | null | undefined;
}) {
	const { setLabel } = useContext(BreadcrumbLabelsContext);

	useEffect(() => {
		if (!label) return;
		setLabel(href, label);
		return () => setLabel(href, null);
	}, [href, label, setLabel]);

	return null;
}
