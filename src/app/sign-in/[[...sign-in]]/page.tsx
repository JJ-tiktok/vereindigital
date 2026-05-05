import { SignIn } from "@clerk/nextjs";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  const params = await searchParams;
  const redirectUrl = normalizeRedirect(params.redirect_url);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <SignIn
        path="/sign-in"
        signUpUrl="/sign-up"
        fallbackRedirectUrl={redirectUrl ?? "/dashboard"}
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
