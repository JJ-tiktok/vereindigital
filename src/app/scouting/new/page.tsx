import { AppShell, PageHeader } from "@/components/app-shell";
import { ensureScoutingPermissions } from "@/lib/actions";
import { requireAppContext, requirePermission } from "@/lib/app-context";

import { ScoutingProspectForm } from "@/app/scouting/scouting-prospect-form";

export default async function NewScoutingProspectPage() {
  const context = await requireAppContext();
  await ensureScoutingPermissions(context.club.id);
  requirePermission(context, "scouting.manage", context.activeTeam?.id);

  return (
    <AppShell activePath="/scouting" context={context}>
      <div className="space-y-6 py-2">
        <PageHeader
          description="Stammdaten und Kontaktinfos fuer einen neuen Scouting-Prospect erfassen."
          eyebrow="Scouting"
          title="Neuer Prospect"
        />
        <ScoutingProspectForm />
      </div>
    </AppShell>
  );
}
