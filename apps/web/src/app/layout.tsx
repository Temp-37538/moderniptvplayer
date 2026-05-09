import Providers from "@/components/providers";
import { APP_DESCRIPTION, APP_NAME, getMetadataBase } from "@/app/metadata";
import type { Metadata } from "next"; 
import { Geist, Geist_Mono } from "next/font/google";
import "../index.css";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	metadataBase: getMetadataBase(),
	applicationName: APP_NAME,
	title: {
		default: APP_NAME,
		template: `%s | ${APP_NAME}`,
	},
	description: APP_DESCRIPTION,
	keywords: [
		"IPTV",
		"Xtream Codes",
		"M3U",
		"Stalker Portal",
		"live TV",
		"movies",
		"series",
	],
	referrer: "origin-when-cross-origin",
	creator: APP_NAME,
	publisher: APP_NAME,
	formatDetection: {
		email: false,
		address: false,
		telephone: false,
	},
	icons: {
		icon: "/logo.svg",
		shortcut: "/logo.svg",
	},
	alternates: {
		canonical: "/",
	},
	openGraph: {
		title: APP_NAME,
		description: APP_DESCRIPTION,
		url: "/",
		siteName: APP_NAME,
		type: "website",
		images: [
			{
				url: "/background.png",
				alt: APP_NAME,
			},
		],
	},
	twitter: {
		card: "summary_large_image",
		title: APP_NAME,
		description: APP_DESCRIPTION,
		images: ["/background.png"],
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body
				className={`${geistSans.variable} ${geistMono.variable} data-scroll-behavior="smooth" antialiased`}
			>
				<Providers>
					<div className="flex h-screen w-screen overflow-hidden">
						{children} 
					</div>
				</Providers>
			</body>
		</html>
	);
}
