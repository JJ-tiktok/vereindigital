import { MailPlus, UserCog, Users } from "lucide-react";
import Link from "next/link";
import type { Prisma } from "@prisma/client";

import { MembershipTable } from "@/app/mitglieder/membership-table";
import { AppShell, EmptyState, PageHeader } from "@/components/app-shell";
import { type AppTeam, hasPermission, requireAppContext } from "@/lib/app-context";
import { prisma } from "@/lib/prisma";

type ClubMembershipRow = Prisma.ClubMembershipGetPayload<{
  include: {
    role: true;
    user: true;
  };
}>;

type TeamMembershipRow = Prisma.TeamMembershipGetPayload<{
  include: {
    playerProfile: true;
    role: true;
    team: true;
    user: true;
  };
}>;

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const context = await requireAppContext();
  const query = await searchParams;
  const teamIds = context.teams.map((team: AppTeam) => team.id);
  const canManageClub = hasPermission(context, "club.manage");
  const [clubMemberships, memberships, pendingInvitations, roles] = await Promise.all([
    prisma.clubMembership.findMany({
      where: {
        clubId: context.club.id,
      },
      include: {
        role: true,
        user: true,
      },
      orderBy: [{ role: { name: "asc" } }, { createdAt: "asc" }],
    }),
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
    prisma.role.findMany({
      where: { clubId: context.club.id },
      orderBy: { name: "asc" },
    }),
  ]);
  const roleOptions = roles.map((role) => ({ id: role.id, name: role.name }));
  const userMemberships = memberships.filter((membership: TeamMembershipRow) => membership.userId);
  const profileOnlyMemberships = memberships.filter(
    (membership: TeamMembershipRow) => !membership.userId && membership.playerProfileId,
  );
  const uniqueUsers = new Set([
    ...clubMemberships.map((membership: ClubMembershipRow) => membership.userId),
    ...userMemberships.map((membership: TeamMembershipRow) => membership.userId),
  ]);

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

      {query.error ? (
        <p className="mt-6 rounded-lg bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
          {query.error === "last-admin"
            ? "Der letzte aktive Admin kann nicht herabgestuft oder deaktiviert werden."
            : "Die ausgewaehlte Rolle ist ungueltig."}
        </p>
      ) : null}

      <section className="grid gap-4 py-6 md:grid-cols-3">
        <MetricCard label="App-Mitglieder" value={uniqueUsers.size.toString()} helper="angenommene Nutzer" />
        <MetricCard label="Teamrollen" value={memberships.length.toString()} helper="aktive Zuordnungen" />
        <MetricCard label="Offene Einladungen" value={pendingInvitations.length.toString()} helper="noch nicht angenommen" />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <article className="overflow-hidden rounded-lg border border-border bg-surface">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
              <div>
                <h2 className="text-xl font-bold text-foreground">Vereinsrollen</h2>
                <p className="mt-1 text-sm text-muted">{clubMemberships.length} Rollen auf Vereinsebene</p>
              </div>
              <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold text-foreground">
                Gesamtverein
              </span>
            </div>

            {clubMemberships.length > 0 ? (
              <MembershipTable
                canEdit={canManageClub}
                kind="club"
                memberships={clubMemberships.map((membership: ClubMembershipRow) => ({
                  id: membership.id,
                  label: membership.user.displayName ?? membership.user.email,
                  email: membership.user.email,
                  roleId: membership.roleId,
                  roleName: membership.role.name,
                  status: membership.status,
                  typeLabel: "Vereinsrolle",
                  createdAt: membership.createdAt,
                }))}
                roles={roleOptions}
              />
            ) : (
              <div className="p-5">
                <EmptyState
                  title="Noch keine Vereinsrollen"
                  description="Sobald Admins oder Vereinsrollen vergeben sind, erscheinen sie hier."
                />
              </div>
            )}
          </article>

          {context.teams.length > 0 ? (
            context.teams.map((team: AppTeam) => {
              const teamMemberships = memberships.filter((membership: TeamMembershipRow) => membership.teamId === team.id);

              return (
                <article className="overflow-hidden rounded-lg border border-border bg-surface" key={team.id}>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
                    <div>
                      <h2 className="text-xl font-bold text-foreground">{team.name}</h2>
                      <p className="mt-1 text-sm text-muted">
                        {teamMemberships.length} Rollen / {context.activeSeason?.name ?? "Keine Saison"}
                      </p>
                    </div>
                    <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
                      {context.isClubAdmin ? "Admin-Sicht" : "Team-Sicht"}
                    </span>
                  </div>

                  {teamMemberships.length > 0 ? (
                    <MembershipTable
                      canEdit={hasPermission(context, "team.members.manage", team.id)}
                      kind="team"
                      memberships={teamMemberships.map((membership: TeamMembershipRow) => ({
                        id: membership.id,
                        label:
                          membership.user?.displayName ??
                          playerName(membership.playerProfile) ??
                          membership.user?.email ??
                          "Unbekannt",
                        email: membership.user?.email ?? null,
                        roleId: membership.roleId,
                        roleName: membership.role.name,
                        status: membership.status,
                        typeLabel: membership.userId ? "App-Nutzer" : "Kaderprofil",
                        createdAt: membership.createdAt,
                      }))}
                      roles={roleOptions}
                    />
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
          <article className="rounded-lg border border-border bg-surface p-5">
            <div className="flex items-center gap-2">
              <UserCog className="size-5 text-primary" aria-hidden="true" />
              <h2 className="text-xl font-bold text-foreground">Was ist ein Mitglied?</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted">
              Mitglieder sind App-Nutzer mit Rollen und Teamzugriff. Spielerprofile im Kader koennen existieren, ohne
              dass der Spieler schon einen eigenen Login hat.
            </p>
          </article>

          <article className="rounded-lg border border-border bg-surface p-5">
            <div className="flex items-center gap-2">
              <Users className="size-5 text-primary" aria-hidden="true" />
              <h2 className="text-xl font-bold text-foreground">Offene Einladungen</h2>
            </div>
            {pendingInvitations.length > 0 ? (
              <div className="mt-4 space-y-3">
                {pendingInvitations.map((invitation) => (
                  <div className="rounded-lg bg-surface-muted p-3" key={invitation.id}>
                    <p className="font-semibold text-foreground">{invitation.email ?? "Offener Link"}</p>
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
            <article className="rounded-lg border border-amber-200 bg-warning-soft p-5">
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
    <article className="rounded-lg border border-border bg-surface p-5">
      <p className="text-xs font-semibold uppercase text-muted">{label}</p>
      <p className="mt-3 text-4xl font-bold tabular-nums text-foreground">{value}</p>
      <p className="mt-1 text-sm text-muted">{helper}</p>
    </article>
  );
}

function playerName(player: { firstName: string; lastName: string } | null) {
  return player ? `${player.firstName} ${player.lastName}` : null;
}
