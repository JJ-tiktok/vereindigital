import { InvitationForm } from "@/app/einladungen/invitation-form";
import { InvitationRow } from "@/app/einladungen/invitation-row";
import { AppShell, PageHeader } from "@/components/app-shell";
import { requireAppContext } from "@/lib/app-context";
import { prisma } from "@/lib/prisma";

type TeamOption = {
  id: string;
  name: string;
};

export default async function InvitationsPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; emailed?: string; error?: string }>;
}) {
  const context = await requireAppContext();
  const query = await searchParams;
  const accessibleTeams = context.isClubAdmin
    ? context.teams
    : context.teams.filter((team: TeamOption) => team.id === context.activeTeam?.id);
  const teams: TeamOption[] = accessibleTeams.map((team: TeamOption) => ({
    id: team.id,
    name: team.name,
  }));
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
              in: teams.map((team: TeamOption) => team.id),
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

      <div className="grid gap-6 py-6 lg:grid-cols-[380px_1fr]">
        <InvitationForm
          created={Boolean(query.created)}
          emailed={Boolean(query.emailed)}
          roles={roles.map((role) => ({ id: role.id, name: role.name }))}
          teams={teams}
        />

        <section className="rounded-lg border border-border bg-surface">
          <div className="border-b border-border p-5">
            <h2 className="text-xl font-semibold text-foreground">Einladungslinks</h2>
            <p className="mt-1 text-sm text-muted">{invitations.length} Einladungen im Verein.</p>
          </div>
          <div className="divide-y divide-border">
            {invitations.length > 0 ? (
              invitations.map((invitation) => (
                <InvitationRow
                  invitation={{
                    id: invitation.id,
                    roleId: invitation.roleId,
                    roleName: invitation.role.name,
                    teamId: invitation.teamId,
                    teamName: invitation.team?.name ?? "Verein",
                    email: invitation.email,
                    status: invitation.status,
                    expiresAt: invitation.expiresAt,
                    url: `${appUrl.replace(/\/$/, "")}/invite/${invitation.token}`,
                  }}
                  key={invitation.id}
                  roles={roles.map((role) => ({ id: role.id, name: role.name }))}
                  teams={teams}
                />
              ))
            ) : (
              <div className="p-8 text-center text-sm text-muted">Noch keine Einladungen erstellt.</div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
