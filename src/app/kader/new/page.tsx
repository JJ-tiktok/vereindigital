import { AppShell, PageHeader } from "@/components/app-shell";
import { requireActiveTeam, requireAppContext } from "@/lib/app-context";
import { PlayerForm } from "@/app/kader/player-form";

export default async function NewPlayerPage() {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);

  return (
    <AppShell context={context} activePath="/kader">
      <PageHeader
        eyebrow="Kaderverwaltung"
        title="Spieler anlegen"
        description={`Neues Spielerprofil fuer ${activeTeam.name} erstellen.`}
      />
      <div className="py-6">
        <PlayerForm />
      </div>
    </AppShell>
  );
}
