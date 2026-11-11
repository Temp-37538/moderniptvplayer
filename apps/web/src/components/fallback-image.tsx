"use client";

import Image, { type ImageProps } from "next/image";
import { type ReactNode, useState } from "react";

type FallbackImageProps = ImageProps & {
	/** Shown instead of the browser's broken image icon when loading fails. */
	fallback: ReactNode;
};

/**
 * A provider image that swaps to `fallback` when it fails to load (404,
 * blocked host, bad format), so a broken URL never shows a broken icon.
 */
export function FallbackImage({
	fallback,
	onError,
	...props
}: FallbackImageProps) {
	const [failedSrc, setFailedSrc] = useState<ImageProps["src"] | null>(null);
	if (failedSrc !== null && failedSrc === props.src) {
		return <>{fallback}</>;
	}
	return (
		<Image
			{...props}
			onError={(event) => {
				setFailedSrc(props.src);
				onError?.(event);
			}}
		/>
	);
}
