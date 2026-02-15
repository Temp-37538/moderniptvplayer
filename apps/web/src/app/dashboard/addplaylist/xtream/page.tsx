import { XtreamCodesForm } from "@/components/xtream-form";
import { RedirectToSignIn } from "@daveyplate/better-auth-ui";
import { auth } from "@moderniptvplayer/auth";
import { headers } from "next/headers";

async function Page() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return <RedirectToSignIn />;
  }

  return <XtreamCodesForm />;
}

export default Page;
