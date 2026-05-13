import { AppShell, PageHeader } from "@/components/app-shell";
import { requireActiveTeam, requireAppContext } from "@/lib/app-context";
import { ImportForm } from "../import-form";

export default async function RosterImportPage({
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
        description="Spieler per CSV oder AI-URL importieren und vor dem Schreiben mit dem bestehenden Kader abgleichen."
        eyebrow="Importe"
        title={`Kaderimport ${activeTeam.name}`}
      />
      <ImportForm error={query.error} importType="ROSTER" />
    </AppShell>
  );
}
