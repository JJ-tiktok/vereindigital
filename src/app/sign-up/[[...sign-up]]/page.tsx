import { SignUp } from "@clerk/nextjs";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  const params = await searchParams;
  const redirectUrl = normalizeRedirect(params.redirect_url);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <SignUp
        path="/sign-up"
        signInUrl="/sign-in"
        fallbackRedirectUrl={redirectUrl ?? "/onboarding"}
        forceRedirectUrl={redirectUrl ?? undefined}
      />
    </main>
  );
}

function normalizeRedirect(value?: string) {
  if (!value?.startsWith("/")) {
    return null;
  }

  return value;
}
