import { XtreamCodesForm } from "@/components/xtream-form";
import { RedirectToSignIn, SignedIn } from "@daveyplate/better-auth-ui";

function Page() {
  return (
    <>
      <RedirectToSignIn />
      <SignedIn>
        <XtreamCodesForm />
      </SignedIn>
    </>
  );
}

export default Page;
