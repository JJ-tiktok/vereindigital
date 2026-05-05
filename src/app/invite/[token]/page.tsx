import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { notFound } from "next/navigation";

import { acceptInvitation } from "@/lib/actions";
import { prisma } from "@/lib/prisma";

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const query = await searchParams;
  const clerkUser = await currentUser();
  const invitation = await prisma.invitation.findUnique({
    where: {
      token,
    },
    include: {
      club: true,
      role: true,
      team: true,
    },
  });

  if (!invitation) {
    notFound();
  }

  const expired = invitation.expiresAt < new Date();
  const canAccept = invitation.status === "PENDING" && !expired;
  const redirectUrl = `/invite/${token}`;

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-slate-950">
      <section className="mx-auto grid min-h-[calc(100vh-80px)] w-full max-w-5xl items-center gap-8 lg:grid-cols-[1fr_420px]">
        <div>
          <p className="text-xs font-semibold uppercase text-primary">VereinDigital Einladung</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-bold leading-tight tracking-normal">
            Einladung zu {invitation.club.name}
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-muted">
            Du wurdest als {invitation.role.name}
            {invitation.team ? ` fuer ${invitation.team.name}` : ""} eingeladen. Melde dich an oder registriere dich, um die Einladung anzunehmen.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-white p-6 shadow-sm">
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase text-muted">Verein</p>
            <p className="mt-1 text-lg font-bold">{invitation.club.name}</p>
            <p className="mt-4 text-xs font-semibold uppercase text-muted">Team</p>
            <p className="mt-1 font-semibold">{invitation.team?.name ?? "Verein"}</p>
            <p className="mt-4 text-xs font-semibold uppercase text-muted">Rolle</p>
            <p className="mt-1 font-semibold">{invitation.role.name}</p>
          </div>

          {errorMessage(query.error, invitation.status, expired) ? (
            <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
              {errorMessage(query.error, invitation.status, expired)}
            </p>
          ) : null}

          {canAccept ? (
            clerkUser ? (
              <form action={acceptInvitation} className="mt-5">
                <input name="token" type="hidden" value={token} />
                <button className="h-11 w-full rounded-lg bg-primary px-4 text-sm font-semibold text-white" type="submit">
                  Einladung annehmen
                </button>
              </form>
            ) : (
              <div className="mt-5 grid gap-3">
                <Link
                  className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white"
                  href={`/sign-up?redirect_url=${encodeURIComponent(redirectUrl)}`}
                >
                  Registrieren
                </Link>
                <Link
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-white px-4 text-sm font-semibold text-slate-700"
                  href={`/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}`}
                >
                  Ich habe schon einen Account
                </Link>
              </div>
            )
          ) : (
            <p className="mt-4 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600">
              Diese Einladung kann nicht mehr angenommen werden.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}

function errorMessage(error: string | undefined, status: string, expired: boolean) {
  if (error === "email-mismatch") {
    return "Diese Einladung ist an eine andere E-Mail-Adresse gebunden.";
  }

  if (error === "club-mismatch") {
    return "Dieser Account ist bereits einem anderen Verein zugeordnet.";
  }

  if (error === "missing-email") {
    return "Dein Account hat keine E-Mail-Adresse.";
  }

  if (error === "invalid" || expired || status === "EXPIRED") {
    return "Diese Einladung ist abgelaufen.";
  }

  if (status === "REVOKED") {
    return "Diese Einladung wurde widerrufen.";
  }

  if (status === "ACCEPTED") {
    return "Diese Einladung wurde bereits angenommen.";
  }

  return null;
}
