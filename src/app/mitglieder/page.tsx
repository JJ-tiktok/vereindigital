import { MailPlus, UserCog, Users } from "lucide-react";
import Link from "next/link";

import { AppShell, EmptyState, PageHeader } from "@/components/app-shell";
import { type AppTeam, requireAppContext } from "@/lib/app-context";
import { prisma } from "@/lib/prisma";

export default async function MembersPage() {
  const context = await requireAppContext();
  const teamIds = context.teams.map((team: AppTeam) => team.id);
  const [memberships, pendingInvitations] = await Promise.all([
    prisma.teamMembership.findMany({
      where: {
        teamId: {
          in: teamIds,
        },
      },
      include: {
        playerProfile: true,
        role: true,
        team: true,
        user: true,
      },
      orderBy: [{ team: { name: "asc" } }, { role: { name: "asc" } }, { createdAt: "asc" }],
    }),
    prisma.invitation.findMany({
      where: {
        clubId: context.club.id,
        status: "PENDING",
        teamId: {
          in: teamIds,
        },
      },
      include: {
        role: true,
        team: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 8,
    }),
  ]);
  const userMemberships = memberships.filter((membership) => membership.userId);
  const profileOnlyMemberships = memberships.filter((membership) => !membership.userId && membership.playerProfileId);
  const uniqueUsers = new Set(userMemberships.map((membership) => membership.userId));

  return (
    <AppShell context={context} activePath="/mitglieder">
      <PageHeader
        eyebrow="Teamzugriff"
        title="Mitglieder"
        description="Uebersicht ueber App-Nutzer, Teamrollen und angenommene Einladungen. Der Kader bleibt separat als Spielerprofil-Liste."
        action={
          <Link
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-strong"
            href="/einladungen"
          >
            <MailPlus className="size-4" aria-hidden="true" />
            Einladen
          </Link>
        }
      />

      <section className="grid gap-4 py-6 md:grid-cols-3">
        <MetricCard label="App-Mitglieder" value={uniqueUsers.size.toString()} helper="angenommene Nutzer" />
        <MetricCard label="Teamrollen" value={memberships.length.toString()} helper="aktive Zuordnungen" />
        <MetricCard label="Offene Einladungen" value={pendingInvitations.length.toString()} helper="noch nicht angenommen" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {context.teams.length > 0 ? (
            context.teams.map((team: AppTeam) => {
              const teamMemberships = memberships.filter((membership) => membership.teamId === team.id);

              return (
                <article className="overflow-hidden rounded-lg border border-border bg-white" key={team.id}>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
                    <div>
                      <h2 className="text-xl font-bold text-slate-950">{team.name}</h2>
                      <p className="mt-1 text-sm text-muted">
                        {teamMemberships.length} Rollen / {team.seasonRef?.name ?? team.season ?? "ohne Saison"}
                      </p>
                    </div>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-primary">
                      {context.isClubAdmin ? "Admin-Sicht" : "Team-Sicht"}
                    </span>
                  </div>

                  {teamMemberships.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-[760px] w-full text-left text-sm">
                        <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-muted">
                          <tr>
                            <th className="px-5 py-3">Mitglied</th>
                            <th className="px-5 py-3">Rolle</th>
                            <th className="px-5 py-3">Status</th>
                            <th className="px-5 py-3">Typ</th>
                            <th className="px-5 py-3">Seit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {teamMemberships.map((membership) => (
                            <tr key={membership.id}>
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                  <AvatarLabel
                                    label={
                                      membership.user?.displayName ??
                                      membership.user?.email ??
                                      playerName(membership.playerProfile) ??
                                      "Unbekannt"
                                    }
                                  />
                                  <div>
                                    <p className="font-semibold text-slate-950">
                                      {membership.user?.displayName ??
                                        playerName(membership.playerProfile) ??
                                        membership.user?.email ??
                                        "Unbekannt"}
                                    </p>
                                    <p className="text-sm text-muted">{membership.user?.email ?? "kein App-Login"}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-4">
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                  {membership.role.name}
                                </span>
                              </td>
                              <td className="px-5 py-4">
                                <span className={statusClass(membership.status)}>{statusLabel(membership.status)}</span>
                              </td>
                              <td className="px-5 py-4 text-slate-700">
                                {membership.userId ? "App-Nutzer" : "Kaderprofil"}
                              </td>
                              <td className="px-5 py-4 text-slate-700">
                                {membership.createdAt.toLocaleDateString("de-DE")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-5">
                      <EmptyState
                        title="Noch keine Mitglieder"
                        description="Erstelle Einladungen, damit Trainer, Co-Trainer oder Spieler dem Team beitreten koennen."
                      />
                    </div>
                  )}
                </article>
              );
            })
          ) : (
            <EmptyState
              title="Kein Team vorhanden"
              description="Sobald ein Team existiert, erscheinen hier die Teammitglieder und Rollen."
            />
          )}
        </div>

        <aside className="space-y-6">
          <article className="rounded-lg border border-border bg-white p-5">
            <div className="flex items-center gap-2">
              <UserCog className="size-5 text-primary" aria-hidden="true" />
              <h2 className="text-xl font-bold text-slate-950">Was ist ein Mitglied?</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted">
              Mitglieder sind App-Nutzer mit Rollen und Teamzugriff. Spielerprofile im Kader koennen existieren, ohne
              dass der Spieler schon einen eigenen Login hat.
            </p>
          </article>

          <article className="rounded-lg border border-border bg-white p-5">
            <div className="flex items-center gap-2">
              <Users className="size-5 text-primary" aria-hidden="true" />
              <h2 className="text-xl font-bold text-slate-950">Offene Einladungen</h2>
            </div>
            {pendingInvitations.length > 0 ? (
              <div className="mt-4 space-y-3">
                {pendingInvitations.map((invitation) => (
                  <div className="rounded-lg bg-slate-50 p-3" key={invitation.id}>
                    <p className="font-semibold text-slate-950">{invitation.email ?? "Offener Link"}</p>
                    <p className="mt-1 text-sm text-muted">
                      {invitation.team?.name ?? "Verein"} / {invitation.role.name}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted">Keine offenen Einladungen.</p>
            )}
          </article>

          {profileOnlyMemberships.length > 0 ? (
            <article className="rounded-lg border border-amber-200 bg-amber-50 p-5">
              <p className="text-sm font-bold text-amber-900">Kaderprofile ohne Login</p>
              <p className="mt-2 text-sm leading-6 text-amber-800">
                {profileOnlyMemberships.length} Spielerprofile sind im Team, aber noch nicht mit einem App-Nutzer
                verknuepft.
              </p>
            </article>
          ) : null}
        </aside>
      </section>
    </AppShell>
  );
}

function MetricCard({ helper, label, value }: { helper: string; label: string; value: string }) {
  return (
    <article className="rounded-lg border border-border bg-white p-5">
      <p className="text-xs font-semibold uppercase text-muted">{label}</p>
      <p className="mt-3 text-4xl font-bold tabular-nums text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-muted">{helper}</p>
    </article>
  );
}

function AvatarLabel({ label }: { label: string }) {
  const initials = label
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-primary">
      {initials || "?"}
    </div>
  );
}

function playerName(player: { firstName: string; lastName: string } | null) {
  return player ? `${player.firstName} ${player.lastName}` : null;
}

function statusLabel(status: string) {
  switch (status) {
    case "INVITED":
      return "Eingeladen";
    case "INACTIVE":
      return "Inaktiv";
    default:
      return "Aktiv";
  }
}

function statusClass(status: string) {
  const base = "rounded-full px-3 py-1 text-xs font-semibold";

  if (status === "ACTIVE") {
    return `${base} bg-emerald-50 text-emerald-700`;
  }

  if (status === "INVITED") {
    return `${base} bg-amber-50 text-amber-700`;
  }

  return `${base} bg-slate-100 text-slate-600`;
}
