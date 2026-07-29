import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { completeClubOnboarding } from "@/lib/onboarding";
import { prisma } from "@/lib/prisma";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const clerkUser = await currentUser();

  if (clerkUser) {
    const existingUser = await prisma.user.findUnique({
      where: {
        clerkUserId: clerkUser.id,
      },
      select: {
        id: true,
      },
    });

    if (existingUser) {
      redirect("/dashboard");
    }
  }

  const params = await searchParams;

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground">
      <section className="mx-auto grid min-h-[calc(100vh-80px)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1fr_440px]">
        <div>
          <p className="text-xs font-semibold uppercase text-primary">VereinDigital Onboarding</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-bold leading-tight tracking-normal">
            Erstelle deinen Verein und starte als Admin.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-muted">
            Wir legen deinen Verein, das erste Team, die Standardrollen und deine Admin-Mitgliedschaft an.
          </p>
        </div>

        <form action={completeClubOnboarding} className="rounded-lg border border-border bg-surface p-6">
          <div>
            <label className="text-sm font-semibold text-foreground" htmlFor="clubName">
              Vereinsname
            </label>
            <input
              className="mt-2 h-11 w-full rounded-lg border border-border px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
              id="clubName"
              name="clubName"
              placeholder="FC Beispielstadt"
              required
            />
          </div>

          <div className="mt-5">
            <label className="text-sm font-semibold text-foreground" htmlFor="teamName">
              Erstes Team
            </label>
            <input
              className="mt-2 h-11 w-full rounded-lg border border-border px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
              id="teamName"
              name="teamName"
              placeholder="1. Herren"
              required
            />
          </div>

          {params.error ? (
            <p className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
              Bitte pruefe deine Angaben und versuche es erneut.
            </p>
          ) : null}

          <button
            className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-strong"
            type="submit"
          >
            Verein erstellen
          </button>
        </form>
      </section>
    </main>
  );
}
