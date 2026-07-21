import { AppShell, PageHeader } from "@/components/app-shell";
import { requireActiveTeam, requireAppContext } from "@/lib/app-context";
import { ImportForm } from "../import-form";

export default async function MatchStatsImportPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  const query = await searchParams;

  return (
    <AppShell context={context} activePath="/importe">
      <PageHeader
        description="Spieldaten und Spielerwerte importieren, einem Spiel zuordnen und erst nach Review uebernehmen."
        eyebrow="Importe"
        title={`Spieltagsimport ${activeTeam.name}`}
      />
      <ImportForm error={query.error} importType="MATCH_STATS" />
    </AppShell>
  );
}
