import { SignUp } from "@clerk/nextjs";
import { ShieldCheck } from "lucide-react";
import Link from "next/link";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  const params = await searchParams;
  const redirectUrl = normalizeRedirect(params.redirect_url);

  return (
    <main className="grid min-h-screen bg-background text-slate-950 lg:grid-cols-[1fr_520px]">
      <section className="relative hidden overflow-hidden border-r border-border px-10 py-10 lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center opacity-25"
          style={{
            backgroundImage:
              "url('/Example%20Look/stitch_squadhub_football_manager/trainingskatalog_blue/screen.png')",
          }}
        />
        <div className="absolute inset-0 bg-background/90" aria-hidden="true" />
        <div className="relative">
          <Link className="flex items-center gap-3" href="/">
            <div className="flex size-11 items-center justify-center rounded-lg bg-primary text-white">
              <ShieldCheck className="size-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-lg font-black">VereinDigital</p>
              <p className="text-sm text-muted">Trainer Dashboard</p>
            </div>
          </Link>
          <div className="mt-24 max-w-xl">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Verein aufsetzen</p>
            <h1 className="mt-5 text-5xl font-black leading-tight tracking-normal">
              Starte mit deinem Trainerteam in wenigen Minuten.
            </h1>
            <p className="mt-5 text-lg leading-8 text-slate-700">
              Nach der Registrierung legst du deinen Verein und das erste Team an. Danach kannst du Spieler,
              Termine und Trainingsformen verwalten.
            </p>
          </div>
        </div>
        <p className="relative text-sm text-muted">Ein MVP fuer echte Testnutzer im Vereinsalltag.</p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-white">
              <ShieldCheck className="size-5" aria-hidden="true" />
            </div>
            <div>
              <p className="font-black">VereinDigital</p>
              <p className="text-sm text-muted">Trainer Dashboard</p>
            </div>
          </div>
          <SignUp
            path="/sign-up"
            signInUrl="/sign-in"
            fallbackRedirectUrl={redirectUrl ?? "/onboarding"}
            forceRedirectUrl={redirectUrl ?? undefined}
          />
        </div>
      </section>
    </main>
  );
}

function normalizeRedirect(value?: string) {
  if (!value?.startsWith("/")) {
    return null;
  }

  return value;
}
