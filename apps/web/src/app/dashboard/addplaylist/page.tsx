import { createPageMetadata } from "@/app/metadata";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileText, RadioTower } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const instant = false;

export const metadata: Metadata = createPageMetadata({
  title: "Add a Playlist",
  description:
    "Choose how you want to import your IPTV library with Xtream Codes or M3U.",
  path: "/dashboard/addplaylist",
  noIndex: true,
});

function Page() {
  return (
    <div className="flex min-h-[80svh] flex-col items-center justify-start px-4 py-8 md:justify-center md:py-4">
      <h1 className="mb-2 text-3xl font-bold tracking-tight text-center sm:text-4xl md:text-5xl">
        Add a playlist
      </h1>
      <p className="mb-8 max-w-md text-sm text-muted-foreground text-center sm:text-base">
        Choose how you want to add your IPTV playlist to get started
      </p>

      <div className="grid w-full max-w-4xl grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 md:gap-6">
        <Link
          href="/dashboard/addplaylist/xtream"
          className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Card className="h-full cursor-pointer transition-[border-color,box-shadow,transform] duration-300 hover:border-primary/50 hover:shadow-lg active:scale-[0.99] md:hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center gap-4 p-4 text-left sm:p-5 md:flex-col md:pb-2 md:text-center">
              <div className="mb-0 shrink-0 rounded-full bg-primary/10 p-3 text-primary transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground md:mb-4 md:p-4">
                <RadioTower className="h-6 w-6 md:h-8 md:w-8" />
              </div>
              <CardTitle className="text-lg md:text-xl">Xtream Codes</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0 text-left sm:px-5 md:px-6 md:pt-0 md:text-center">
              <CardDescription className="text-sm leading-relaxed">
                Connect using Xtream Codes API credentials with server URL,
                username and password
              </CardDescription>
            </CardContent>
          </Card>
        </Link>

        <Link
          href="/dashboard/addplaylist/m3u"
          className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Card className="h-full cursor-pointer transition-[border-color,box-shadow,transform] duration-300 hover:border-primary/50 hover:shadow-lg active:scale-[0.99] md:hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center gap-4 p-4 text-left sm:p-5 md:flex-col md:pb-2 md:text-center">
              <div className="mb-0 shrink-0 rounded-full bg-primary/10 p-3 text-primary transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground md:mb-4 md:p-4">
                <FileText className="h-6 w-6 md:h-8 md:w-8" />
              </div>
              <CardTitle className="text-lg md:text-xl">M3U URL</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0 text-left sm:px-5 md:px-6 md:pt-0 md:text-center">
              <CardDescription className="text-sm leading-relaxed">
                Import your playlist from an M3U URL link provided by your IPTV
                service
              </CardDescription>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}

export default Page;
