import Providers from "@/components/providers";
import { APP_DESCRIPTION, APP_NAME, getMetadataBase } from "@/app/metadata";
import type { Metadata } from "next";
import { Inter, Instrument_Serif, Fira_Code } from "next/font/google";
import "../index.css";

const fontSans = Inter({
	subsets: ["latin"],
	variable: "--font-sans",
});

const fontSerif = Instrument_Serif({
	subsets: ["latin"],
	variable: "--font-serif",
	weight: ["400"],
	style: ["italic"],
});

const fontMono = Fira_Code({
	subsets: ["latin"],
	variable: "--font-mono",
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
	},
	twitter: {
		card: "summary_large_image",
		title: APP_NAME,
		description: APP_DESCRIPTION,
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
				className={`${fontSans.variable} ${fontSerif.variable} ${fontMono.variable} data-scroll-behavior="smooth" antialiased`}
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
