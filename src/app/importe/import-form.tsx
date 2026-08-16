import { SubmitButton } from "@/components/submit-button";
import {
  createAiUrlImportJob,
  createFixturesTemplateImportJob,
  createMatchStatsTemplateImportJob,
  createRosterTemplateImportJob,
} from "@/lib/import-actions";

const rosterSample = `Vorname;Nachname;Geburtsdatum;Position
Max;Mustermann;15.03.2001;ST
Jan;Beispiel;22.08.1999;ZM`;

const matchSample = `Spiel;Datum;Gegner;Heim/Auswaerts;Spieler;Tore;Vorlagen;Gelbe Karten;Rote Karten;Minuten;Startelf/Einwechslung;Bewertung
2:1;04.05.2026;FC Beispiel;Heim;Max Mustermann;1;0;0;0;90;Startelf;8.2
2:1;04.05.2026;FC Beispiel;Heim;Jan Beispiel;0;1;1;0;70;Einwechslung;7.1`;

const fixturesSample = `Datum;Gegner;Heim/Auswaerts;Uhrzeit;Ort
10.08.2026;FC Beispiel;Heim;15:00;Sportplatz Musterstadt
17.08.2026;SV Nachbarort;Auswaerts;14:30;`;

const importTitles: Record<"MATCH_STATS" | "ROSTER" | "FIXTURES", string> = {
  FIXTURES: "Spielplan",
  MATCH_STATS: "Spieltage",
  ROSTER: "Kader",
};

const importActions: Record<"MATCH_STATS" | "ROSTER" | "FIXTURES", (formData: FormData) => void | Promise<void>> = {
  FIXTURES: createFixturesTemplateImportJob,
  MATCH_STATS: createMatchStatsTemplateImportJob,
  ROSTER: createRosterTemplateImportJob,
};

const importSamples: Record<"MATCH_STATS" | "ROSTER" | "FIXTURES", string> = {
  FIXTURES: fixturesSample,
  MATCH_STATS: matchSample,
  ROSTER: rosterSample,
};

export function ImportForm({
  error,
  importType,
}: {
  error?: string;
  importType: "MATCH_STATS" | "ROSTER" | "FIXTURES";
}) {
  return (
    <div className="grid gap-6 py-6 lg:grid-cols-[1fr_420px]">
      <section className="space-y-6">
        <form action={importActions[importType]} className="rounded-lg border border-border bg-surface p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-primary">Variante 1</p>
          <h2 className="mt-2 text-2xl font-bold text-foreground">CSV-Vorlage importieren</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Fuege CSV-Daten ein oder lade eine CSV-Datei hoch. Der Import wird danach nur vorbereitet und kann auf der Review-Seite bestaetigt werden.
          </p>
          {error === "missing-csv" ? (
            <p className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-sm font-semibold text-danger">Bitte CSV-Daten einfuegen oder eine Datei auswaehlen.</p>
          ) : null}
          <div className="mt-5">
            <label className="text-sm font-semibold text-foreground" htmlFor="file">
              CSV-Datei
            </label>
            <input className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" id="file" name="file" type="file" accept=".csv,text/csv" />
          </div>
          <div className="mt-5">
            <label className="text-sm font-semibold text-foreground" htmlFor="csv">
              CSV einfuegen
            </label>
            <textarea
              className="mt-2 min-h-56 w-full rounded-lg border border-border px-3 py-2 font-mono text-xs leading-5 outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft"
              defaultValue={importSamples[importType]}
              id="csv"
              name="csv"
            />
          </div>
          <SubmitButton className="mt-5 h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60" pendingLabel="Wird geprueft...">
            CSV pruefen
          </SubmitButton>
        </form>

        <form action={createAiUrlImportJob} className="rounded-lg border border-border bg-surface p-5">
          <input name="importType" type="hidden" value={importType} />
          <p className="text-xs font-bold uppercase tracking-wide text-primary">Variante 2</p>
          <h2 className="mt-2 text-2xl font-bold text-foreground">URL mit OpenAI auswerten</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Die App liest die URL bestmoeglich aus und laesst OpenAI daraus strukturierte Importdaten erzeugen. Falls die Quelle blockiert, bleibt CSV der Fallback.
          </p>
          {error === "missing-url" ? (
            <p className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-sm font-semibold text-danger">Bitte eine URL eintragen.</p>
          ) : null}
          <div className="mt-5">
            <label className="text-sm font-semibold text-foreground" htmlFor="sourceUrl">
              Quell-URL
            </label>
            <input
              className="mt-2 h-11 w-full rounded-lg border border-border px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft"
              id="sourceUrl"
              name="sourceUrl"
              placeholder="https://..."
              type="url"
            />
          </div>
          <SubmitButton
            className="mt-5 h-10 rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-60"
            pendingLabel="Wird ausgewertet..."
          >
            URL pruefen
          </SubmitButton>
        </form>
      </section>

      <aside className="rounded-lg border border-border bg-slate-950 p-5 text-white xl:sticky xl:top-6 xl:self-start">
        <p className="text-xs font-bold uppercase tracking-wide text-blue-200">Import-Regeln</p>
        <h2 className="mt-2 text-2xl font-bold">{importTitles[importType]}</h2>
        <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-200">
          <li>Alle Daten werden zuerst nur als Importjob gespeichert.</li>
          <li>Konflikte muessen auf der Review-Seite aufgeloest werden.</li>
          <li>Bestehende Datensaetze werden nicht geloescht.</li>
          <li>Der Import verwendet immer das aktive Team und die aktive Saison.</li>
        </ul>
      </aside>
    </div>
  );
}
