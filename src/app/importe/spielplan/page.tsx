import { AppShell, PageHeader } from "@/components/app-shell";
import { requireActiveTeam, requireAppContext } from "@/lib/app-context";
import { ImportForm } from "../import-form";

export default async function FixturesImportPage({
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
        description="Spielplan per CSV oder AI-URL importieren. Aus jeder Zeile entsteht ein Kalendertermin mit verknuepftem Spiel."
        eyebrow="Importe"
        title={`Spielplan-Import ${activeTeam.name}`}
      />
      <ImportForm error={query.error} importType="FIXTURES" />
    </AppShell>
  );
}
