import { RedirectToSignIn, SignedIn } from "@daveyplate/better-auth-ui";

function Page() {
  return (
    <>
      <RedirectToSignIn />
      <SignedIn>
        Page under construction. Please check back later.
      </SignedIn>
    </>
  );
}

export default Page;
