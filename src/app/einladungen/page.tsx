import { LinkIcon, Send, XCircle } from "lucide-react";

import { AppShell, PageHeader } from "@/components/app-shell";
import { CopyInviteLink } from "@/components/copy-invite-link";
import { createInvitation, revokeInvitation } from "@/lib/actions";
import { requireAppContext } from "@/lib/app-context";
import { prisma } from "@/lib/prisma";

export default async function InvitationsPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; error?: string }>;
}) {
  const context = await requireAppContext();
  const query = await searchParams;
  const teams = context.isClubAdmin ? context.teams : context.teams.filter((team) => team.id === context.activeTeam?.id);
  const roles = await prisma.role.findMany({
    where: {
      clubId: context.club.id,
      key: {
        in: ["trainer", "assistant_coach", "player"],
      },
    },
    orderBy: {
      name: "asc",
    },
  });
  const invitations = await prisma.invitation.findMany({
    where: {
      clubId: context.club.id,
      ...(context.isClubAdmin
        ? {}
        : {
            teamId: {
              in: teams.map((team) => team.id),
            },
          }),
    },
    include: {
      role: true,
      team: true,
      createdByUser: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return (
    <AppShell context={context} activePath="/einladungen">
      <PageHeader
        eyebrow="Testnutzer"
        title="Einladungen"
        description="Erstelle Teamlinks fuer Trainer, Co-Trainer oder Spieler und verschicke sie per E-Mail, WhatsApp oder direkt als Link."
      />

      <div className="grid gap-6 py-6 xl:grid-cols-[380px_1fr]">
        <form action={createInvitation} className="rounded-lg border border-border bg-white p-5">
          <div className="flex items-center gap-2">
            <Send className="size-5 text-primary" aria-hidden="true" />
            <h2 className="text-xl font-semibold text-slate-950">Neue Einladung</h2>
          </div>

          {query.created ? (
            <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
              Einladung wurde erstellt. Du kannst den Link jetzt kopieren.
            </p>
          ) : null}
          {query.error ? (
            <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
              Bitte pruefe Team und Rolle.
            </p>
          ) : null}

          <Field label="Team">
            <select className="h-11 w-full rounded-lg border border-border px-3 text-sm" name="teamId" required>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Rolle">
            <select className="h-11 w-full rounded-lg border border-border px-3 text-sm" name="roleId" required>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="E-Mail optional">
            <input
              className="h-11 w-full rounded-lg border border-border px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-blue-100"
              name="email"
              placeholder="max@example.com"
              type="email"
            />
          </Field>

          <Field label="Gueltigkeit">
            <select className="h-11 w-full rounded-lg border border-border px-3 text-sm" defaultValue="14" name="expiresInDays">
              <option value="3">3 Tage</option>
              <option value="7">7 Tage</option>
              <option value="14">14 Tage</option>
              <option value="30">30 Tage</option>
            </select>
          </Field>

          <button className="mt-5 h-11 w-full rounded-lg bg-primary px-4 text-sm font-semibold text-white" type="submit">
            Einladung erstellen
          </button>
        </form>

        <section className="rounded-lg border border-border bg-white">
          <div className="border-b border-border p-5">
            <h2 className="text-xl font-semibold text-slate-950">Einladungslinks</h2>
            <p className="mt-1 text-sm text-muted">{invitations.length} Einladungen im Verein.</p>
          </div>
          <div className="divide-y divide-border">
            {invitations.length > 0 ? (
              invitations.map((invitation) => {
                const url = `${appUrl.replace(/\/$/, "")}/invite/${invitation.token}`;
                const expired = invitation.expiresAt < new Date();

                return (
                  <article className="grid gap-4 p-5 lg:grid-cols-[1fr_auto]" key={invitation.id}>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-primary">
                          {invitation.role.name}
                        </span>
                        <span className={statusClass(invitation.status, expired)}>
                          {expired && invitation.status === "PENDING" ? "Abgelaufen" : statusLabel(invitation.status)}
                        </span>
                      </div>
                      <h3 className="mt-3 font-semibold text-slate-950">{invitation.team?.name ?? "Verein"}</h3>
                      <p className="mt-1 text-sm text-muted">
                        {invitation.email || "Offener Link"} / gueltig bis {invitation.expiresAt.toLocaleDateString("de-DE")}
                      </p>
                      <p className="mt-3 flex items-center gap-2 break-all rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                        <LinkIcon className="size-3 shrink-0" aria-hidden="true" />
                        {url}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-start gap-2 lg:justify-end">
                      <CopyInviteLink url={url} />
                      {invitation.status === "PENDING" && !expired ? (
                        <form action={revokeInvitation}>
                          <input name="invitationId" type="hidden" value={invitation.id} />
                          <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-red-200 px-3 text-sm font-semibold text-red-700" type="submit">
                            <XCircle className="size-4" aria-hidden="true" />
                            Widerrufen
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="p-8 text-center text-sm text-muted">Noch keine Einladungen erstellt.</div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mt-5 block">
      <span className="text-sm font-semibold text-slate-800">{label}</span>
      <span className="mt-2 block">{children}</span>
    </label>
  );
}

function statusLabel(status: string) {
  switch (status) {
    case "ACCEPTED":
      return "Angenommen";
    case "EXPIRED":
      return "Abgelaufen";
    case "REVOKED":
      return "Widerrufen";
    default:
      return "Offen";
  }
}

function statusClass(status: string, expired: boolean) {
  const base = "rounded-full px-3 py-1 text-xs font-semibold";

  if (expired || status === "EXPIRED" || status === "REVOKED") {
    return `${base} bg-slate-100 text-slate-600`;
  }

  if (status === "ACCEPTED") {
    return `${base} bg-emerald-50 text-emerald-700`;
  }

  return `${base} bg-amber-50 text-amber-700`;
}
