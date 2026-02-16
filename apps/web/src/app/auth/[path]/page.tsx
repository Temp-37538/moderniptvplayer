import { AuthView } from "@daveyplate/better-auth-ui";
import { authViewPaths } from "@daveyplate/better-auth-ui/server";
import { GalleryVerticalEnd } from "lucide-react";

export function generateStaticParams() {
  return Object.values(authViewPaths).map((path) => ({ path }));
}

export default async function AuthPage({
  params,
}: {
  params: Promise<{ path: string }>;
}) {
  const { path } = await params;

  return (
    <div className="flex w-full justify-center items-center">
      <div className="flex w-full  flex-col gap-4 p-6 md:p-10">
        <div className="flex w-full justify-center gap-2  ">
          <a href="#" className="flex   items-center gap-2 font-medium">
            <div className="  bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
              <GalleryVerticalEnd className="size-4" />
            </div>
            Acme Inc.
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <AuthView redirectTo="/dashboard/home" path={path} />
          </div>
        </div>
      </div>
      <div className="bg-muted w-full   h-full relative hidden lg:block">
        <img
          src="/background.png"
          alt="Background"
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.6] dark:grayscale"
        />
      </div>
    </div>
  );
}
