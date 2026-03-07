import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { createPageMetadata } from "@/app/metadata";
import { FileText, RadioTower, Tv } from "lucide-react";
import Link from "next/link";

export const metadata = createPageMetadata({
	title: "Add a Playlist",
	description:
		"Choose how you want to import your IPTV library with Xtream Codes, M3U, or Stalker Portal.",
	path: "/dashboard/addplaylist",
	noIndex: true,
});

function Page() {
	return (
		<div className="flex flex-col items-center justify-start md:justify-center py-4 no-scrollbar overflow-y-scroll min-h-[80vh] px-4">
			<h1 className="text-4xl font-bold tracking-tight text-center mb-2">
				Add a playlist
			</h1>
			<p className="text-muted-foreground text-center mb-8 max-w-md">
				Choose how you want to add your IPTV playlist to get started
			</p>
			<div className="grid gap-6 md:grid-cols-3 w-full max-w-4xl">
				<Link href="/dashboard/addplaylist/xtream" className="group">
					<Card className="h-full transition-all duration-300 hover:shadow-lg hover:border-primary/50 hover:-translate-y-1 cursor-pointer">
						<CardHeader className="text-center pb-2">
							<div className="mx-auto mb-4 p-4 rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
								<RadioTower className="h-8 w-8" />
							</div>
							<CardTitle className="text-xl">Xtream Codes</CardTitle>
						</CardHeader>
						<CardContent className="text-center">
							<CardDescription className="text-sm">
								Connect using Xtream Codes API credentials with server URL,
								username and password
							</CardDescription>
						</CardContent>
					</Card>
				</Link>

				<Link href="/dashboard/addplaylist/m3u" className="group">
					<Card className="h-full transition-all duration-300 hover:shadow-lg hover:border-primary/50 hover:-translate-y-1 cursor-pointer">
						<CardHeader className="text-center pb-2">
							<div className="mx-auto mb-4 p-4 rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
								<FileText className="h-8 w-8" />
							</div>
							<CardTitle className="text-xl">M3U URL</CardTitle>
						</CardHeader>
						<CardContent className="text-center">
							<CardDescription className="text-sm">
								Import your playlist from an M3U URL link provided by your IPTV
								service
							</CardDescription>
						</CardContent>
					</Card>
				</Link>

				<Link href="/dashboard/addplaylist/stalker" className="group">
					<Card className="h-full transition-all duration-300 hover:shadow-lg hover:border-primary/50 hover:-translate-y-1 cursor-pointer">
						<CardHeader className="text-center pb-2">
							<div className="mx-auto mb-4 p-4 rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
								<Tv className="h-8 w-8" />
							</div>
							<CardTitle className="text-xl">Portal Stalker</CardTitle>
						</CardHeader>
						<CardContent className="text-center">
							<CardDescription className="text-sm">
								Connect to Stalker Portal using MAC address and server URL for
								MAG-style access
							</CardDescription>
						</CardContent>
					</Card>
				</Link>
			</div>
		</div>
	);
}

export default Page;
