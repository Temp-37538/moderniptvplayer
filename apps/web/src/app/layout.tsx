import Providers from "@/components/providers";
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
  title: "moderniptvplayer",
  description: "moderniptvplayer",
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
