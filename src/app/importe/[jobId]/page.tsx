import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { notFound } from "next/navigation";

import { AppShell, PageHeader } from "@/components/app-shell";
import { confirmMatchStatsImportJob, confirmRosterImportJob, saveImportReviewData } from "@/lib/import-actions";
import { requireActiveTeam, requireAppContext } from "@/lib/app-context";
import { formatDateTime } from "@/lib/format";
import { isMatchStatsImportData, isRosterImportData, type ImportIssue } from "@/lib/imports";
import { prisma } from "@/lib/prisma";
import { RowDeleteButton } from "./row-delete-button";

export default async function ImportReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ jobId: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  const { jobId } = await params;
  const query = await searchParams;
  const job = await prisma.importJob.findFirst({
    where: {
      clubId: context.club.id,
      id: jobId,
      teamId: activeTeam.id,
    },
  });

  if (!job) {
    notFound();
  }

  const issues = readIssues(job.issues);
  const players = await prisma.playerProfile.findMany({
    where: {
      memberships: {
        some: {
          role: {
            key: "player",
          },
          status: "ACTIVE",
          teamId: activeTeam.id,
        },
      },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  const matches = await prisma.match.findMany({
    where: {
      teamId: activeTeam.id,
    },
    include: {
      calendarEvent: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return (
    <AppShell context={context} activePath="/importe">
      <PageHeader
        description={`${sourceTypeLabel(job.sourceType)} / ${formatDateTime(job.createdAt)} / Status: ${statusLabel(job.status)}`}
        eyebrow="Import Review"
        title={job.type === "ROSTER" ? "Kaderimport pruefen" : "Spieltagsimport pruefen"}
      />

      <section className="space-y-6 py-6">
        {query.error ? <ErrorBanner error={query.error} /> : null}
        {query.saved ? (
          <p className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            Aenderungen wurden im Import gespeichert.
          </p>
        ) : null}
        <IssuePanel issues={issues} />

        {job.type === "ROSTER" && isRosterImportData(job.parsedData) ? (
          <form action={confirmRosterImportJob} className="overflow-hidden rounded-lg border border-border bg-white">
            <input name="jobId" type="hidden" value={job.id} />
            <div className="border-b border-border p-5">
              <h2 className="text-xl font-bold text-slate-950">Kaderdaten</h2>
              <p className="mt-1 text-sm text-muted">Waehle je Zeile, ob ein Spieler neu angelegt, aktualisiert oder uebersprungen wird.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[960px] w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-4 py-3">Zeile</th>
                    <th className="px-4 py-3">Vorname</th>
                    <th className="px-4 py-3">Nachname</th>
                    <th className="px-4 py-3">Geburtsdatum</th>
                    <th className="px-4 py-3">Position</th>
                    <th className="px-4 py-3">Aktion</th>
                    <th className="px-4 py-3">Bestehender Spieler</th>
                    <th className="px-4 py-3">
                      <span className="sr-only">Entfernen</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {job.parsedData.rows.map((row, index) => {
                    const candidate = findRosterCandidate(row, players);

                    return (
                      <tr key={`${row.sourceRow}-${row.firstName}-${row.lastName}`}>
                        <td className="px-4 py-3 text-muted">
                          <input id={`skip-roster-${index}`} name={`skip-${index}`} type="hidden" value="false" />
                          {row.sourceRow}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            className="h-10 w-full min-w-36 rounded-lg border border-border px-2 text-sm font-semibold text-slate-950"
                            defaultValue={row.firstName}
                            name={`firstName-${index}`}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            className="h-10 w-full min-w-36 rounded-lg border border-border px-2 text-sm font-semibold text-slate-950"
                            defaultValue={row.lastName}
                            name={`lastName-${index}`}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            className={`h-10 w-full min-w-36 rounded-lg border px-2 text-sm ${
                              row.birthDate ? "border-border" : "border-amber-300 bg-amber-50"
                            }`}
                            defaultValue={row.birthDate}
                            name={`birthDate-${index}`}
                            type="date"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            className="h-10 w-full min-w-28 rounded-lg border border-border px-2 text-sm uppercase"
                            defaultValue={row.position}
                            name={`position-${index}`}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <select className="h-10 rounded-lg border border-border px-2 text-sm" defaultValue={candidate ? "update" : "create"} name={`action-${index}`}>
                            <option value="create">Neu anlegen</option>
                            <option value="update">Aktualisieren</option>
                            <option value="skip">Ueberspringen</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <PlayerSelect name={`player-${index}`} players={players} defaultValue={candidate?.id ?? ""} optional />
                        </td>
                        <td className="px-4 py-3">
                          <RowDeleteButton skipInputId={`skip-roster-${index}`} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-3 border-t border-border p-5 sm:flex-row sm:justify-end">
              <button
                className="h-10 rounded-lg border border-border bg-white px-4 text-sm font-semibold text-slate-900"
                formAction={saveImportReviewData}
                formNoValidate
                type="submit"
              >
                Aenderungen speichern
              </button>
              <button className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white" formNoValidate type="submit">
                {job.status === "CONFIRMED" ? "Kaderimport erneut anwenden" : "Kaderimport bestaetigen"}
              </button>
            </div>
          </form>
        ) : null}

        {job.type === "MATCH_STATS" && isMatchStatsImportData(job.parsedData) ? (
          <form action={confirmMatchStatsImportJob} className="overflow-hidden rounded-lg border border-border bg-white">
            <input name="jobId" type="hidden" value={job.id} />
            <div className="grid gap-4 border-b border-border p-5 xl:grid-cols-[1fr_360px]">
              <div>
                <h2 className="text-xl font-bold text-slate-950">Spieldaten</h2>
                <p className="mt-1 text-sm text-muted">Basisdaten fuer das Zielspiel koennen vor dem Import korrigiert werden.</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <label className="text-xs font-semibold uppercase text-muted md:col-span-2 xl:col-span-1">
                    Spiel / Titel
                    <input
                      className="mt-1 h-10 w-full rounded-lg border border-border px-2 text-sm font-normal text-slate-900"
                      defaultValue={job.parsedData.match.title}
                      name="matchTitle"
                    />
                  </label>
                  <label className="text-xs font-semibold uppercase text-muted">
                    Datum
                    <input
                      className="mt-1 h-10 w-full rounded-lg border border-border px-2 text-sm font-normal text-slate-900"
                      defaultValue={job.parsedData.match.date ?? ""}
                      name="matchDate"
                      type="date"
                    />
                  </label>
                  <label className="text-xs font-semibold uppercase text-muted">
                    Gegner
                    <input
                      className="mt-1 h-10 w-full rounded-lg border border-border px-2 text-sm font-normal text-slate-900"
                      defaultValue={job.parsedData.match.opponent}
                      name="opponent"
                    />
                  </label>
                  <label className="text-xs font-semibold uppercase text-muted">
                    Tore fuer
                    <input
                      className="mt-1 h-10 w-full rounded-lg border border-border px-2 text-sm font-normal text-slate-900"
                      defaultValue={job.parsedData.match.goalsFor ?? ""}
                      min={0}
                      name="goalsFor"
                      type="number"
                    />
                  </label>
                  <label className="text-xs font-semibold uppercase text-muted">
                    Tore gegen
                    <input
                      className="mt-1 h-10 w-full rounded-lg border border-border px-2 text-sm font-normal text-slate-900"
                      defaultValue={job.parsedData.match.goalsAgainst ?? ""}
                      min={0}
                      name="goalsAgainst"
                      type="number"
                    />
                  </label>
                  <label className="text-xs font-semibold uppercase text-muted">
                    Heim / Auswaerts
                    <select
                      className="mt-1 h-10 w-full rounded-lg border border-border px-2 text-sm font-normal text-slate-900"
                      defaultValue={job.parsedData.match.isHomeGame ? "true" : "false"}
                      name="isHomeGame"
                    >
                      <option value="true">Heimspiel</option>
                      <option value="false">Auswaertsspiel</option>
                    </select>
                  </label>
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-800" htmlFor="matchId">
                  Zielspiel
                </label>
                <select className="mt-2 h-10 w-full rounded-lg border border-border px-2 text-sm" defaultValue={findMatchCandidate(job.parsedData, matches)?.id ?? ""} id="matchId" name="matchId">
                  <option value="">Neues Spiel aus Importdaten anlegen</option>
                  {matches.map((match) => (
                    <option key={match.id} value={match.id}>
                      {match.opponent} / {match.calendarEvent ? formatDateTime(match.calendarEvent.startsAt) : "ohne Termin"}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <p className="border-b border-border bg-blue-50 px-5 py-3 text-sm font-semibold text-primary">
                Bewertung ist nur fuer eingesetzte Spieler Pflicht. Bei 0 Minuten und Nicht eingesetzt kann die Note leer bleiben.
              </p>
              <table className="min-w-[1080px] w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-4 py-3">Zeile</th>
                    <th className="px-4 py-3">Import-Spieler</th>
                    <th className="px-4 py-3">Kader-Spieler</th>
                    <th className="px-4 py-3">Min</th>
                    <th className="px-4 py-3">T</th>
                    <th className="px-4 py-3">V</th>
                    <th className="px-4 py-3">Gelb</th>
                    <th className="px-4 py-3">Rot</th>
                    <th className="px-4 py-3">Rolle</th>
                    <th className="px-4 py-3">Note</th>
                    <th className="px-4 py-3">
                      <span className="sr-only">Entfernen</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {job.parsedData.rows.map((row, index) => {
                    const candidate = findPlayerByName(row.playerName, players);

                    return (
                      <tr key={`${row.sourceRow}-${row.playerName}`}>
                        <td className="px-4 py-3 text-muted">
                          <input id={`skip-match-${index}`} name={`skip-${index}`} type="hidden" value="false" />
                          {row.sourceRow}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            className="h-10 w-full min-w-44 rounded-lg border border-border px-2 text-sm font-semibold text-slate-950"
                            defaultValue={row.playerName}
                            name={`playerName-${index}`}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <PlayerSelect name={`player-${index}`} players={players} defaultValue={candidate?.id ?? ""} />
                        </td>
                        <td className="px-4 py-3">
                          <NumberInput defaultValue={row.minutesPlayed} max={120} name={`minutesPlayed-${index}`} />
                        </td>
                        <td className="px-4 py-3">
                          <NumberInput defaultValue={row.goals} name={`goals-${index}`} />
                        </td>
                        <td className="px-4 py-3">
                          <NumberInput defaultValue={row.assists} name={`assists-${index}`} />
                        </td>
                        <td className="px-4 py-3">
                          <NumberInput defaultValue={row.yellowCards} name={`yellowCards-${index}`} />
                        </td>
                        <td className="px-4 py-3">
                          <NumberInput defaultValue={row.redCards} name={`redCards-${index}`} />
                        </td>
                        <td className="px-4 py-3">
                          <select className="h-10 min-w-36 rounded-lg border border-border px-2 text-sm" defaultValue={row.lineupStatus} name={`lineupStatus-${index}`}>
                            <option value="STARTER">Startelf</option>
                            <option value="SUBSTITUTE">Einwechslung</option>
                            <option value="NOT_USED">Nicht eingesetzt</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <NumberInput defaultValue={row.rating ?? ""} max={10} name={`rating-${index}`} step="0.1" />
                        </td>
                        <td className="px-4 py-3">
                          <RowDeleteButton skipInputId={`skip-match-${index}`} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-3 border-t border-border p-5 sm:flex-row sm:justify-end">
              <button
                className="h-10 rounded-lg border border-border bg-white px-4 text-sm font-semibold text-slate-900"
                formAction={saveImportReviewData}
                formNoValidate
                type="submit"
              >
                Aenderungen speichern
              </button>
              <button className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white" formNoValidate type="submit">
                {job.status === "CONFIRMED" ? "Spieltagsimport erneut anwenden" : "Spieltagsimport bestaetigen"}
              </button>
            </div>
          </form>
        ) : null}
      </section>
    </AppShell>
  );
}

type PlayerOption = {
  birthDate: Date;
  firstName: string;
  id: string;
  lastName: string;
  position: string;
};

type MatchOption = {
  calendarEvent: {
    startsAt: Date;
  } | null;
  id: string;
  opponent: string;
};

function PlayerSelect({
  defaultValue,
  name,
  optional = false,
  players,
}: {
  defaultValue: string;
  name: string;
  optional?: boolean;
  players: PlayerOption[];
}) {
  return (
    <select className="h-10 w-full min-w-52 rounded-lg border border-border px-2 text-sm" defaultValue={defaultValue} name={name} required={!optional}>
      <option value="">{optional ? "Kein Spieler ausgewaehlt" : "Bitte zuordnen"}</option>
      {players.map((player) => (
        <option key={player.id} value={player.id}>
          {player.firstName} {player.lastName} / {player.position}
        </option>
      ))}
    </select>
  );
}

function NumberInput({
  defaultValue,
  max,
  min = 0,
  name,
  step = "1",
}: {
  defaultValue: number | string;
  max?: number;
  min?: number;
  name: string;
  step?: string;
}) {
  return (
    <input
      className="h-10 w-20 rounded-lg border border-border px-2 text-sm tabular-nums text-slate-900"
      defaultValue={defaultValue}
      max={max}
      min={min}
      name={name}
      step={step}
      type="number"
    />
  );
}

function IssuePanel({ issues }: { issues: ImportIssue[] }) {
  if (issues.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
        <CheckCircle2 className="size-5" aria-hidden="true" />
        Keine strukturellen Fehler gefunden. Bitte pruefe trotzdem die Zuordnungen.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-white p-5">
      <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950">
        <AlertTriangle className="size-5 text-warning" aria-hidden="true" />
        Validierung
      </h2>
      <div className="mt-4 space-y-2">
        {issues.map((issue, index) => (
          <p className={`rounded-lg px-3 py-2 text-sm ${issue.severity === "error" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`} key={`${issue.code}-${index}`}>
            {issue.rowIndex !== undefined ? `Zeile ${issue.rowIndex + 2}: ` : ""}
            {issue.message}
          </p>
        ))}
      </div>
    </div>
  );
}

function ErrorBanner({ error }: { error: string }) {
  const messages: Record<string, string> = {
    "invalid-match-row": "Bitte pruefe Ergebnis, Minuten, Karten und Bewertung. Eingesetzte Spieler brauchen eine Note zwischen 1.0 und 10.0; bei 0 Minuten kann sie leer bleiben.",
    "invalid-roster-row": "Bitte ergaenze Vorname, Nachname, Geburtsdatum und Position oder ueberspringe die betroffene Zeile.",
    "no-player-mapping": "Bitte ordne alle importierten Spieler einem Kaderspieler zu.",
    unresolved: "Der Import hat noch blockierende Fehler und kann nicht bestaetigt werden.",
  };

  return <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{messages[error] ?? "Der Import konnte nicht bestaetigt werden."}</p>;
}

function readIssues(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((issue): issue is ImportIssue => {
      return Boolean(issue && typeof issue === "object" && "message" in issue && "severity" in issue);
    })
    .map((issue) =>
      issue.code === "missing-birth-date"
        ? {
            ...issue,
            message: "Geburtsdatum fehlt oder ist ungueltig. Bitte im Review ergaenzen oder die Zeile ueberspringen.",
            severity: "warning" as const,
          }
        : issue,
    );
}

function findRosterCandidate(row: { birthDate: string; firstName: string; lastName: string; position: string }, players: PlayerOption[]) {
  return (
    players.find(
      (player) =>
        normalize(player.firstName) === normalize(row.firstName) &&
        normalize(player.lastName) === normalize(row.lastName) &&
        formatDateInput(player.birthDate) === row.birthDate,
    ) ??
    players.find(
      (player) =>
        normalize(player.firstName) === normalize(row.firstName) &&
        normalize(player.lastName) === normalize(row.lastName) &&
        normalize(player.position) === normalize(row.position),
    )
  );
}

function findPlayerByName(playerName: string, players: PlayerOption[]) {
  const rankedPlayers = players
    .map((player) => ({
      player,
      score: scorePlayerNameMatch(playerName, player),
    }))
    .filter((entry) => entry.score >= 75)
    .sort((a, b) => b.score - a.score);

  if (rankedPlayers.length === 0) {
    return undefined;
  }

  if (rankedPlayers.length > 1 && rankedPlayers[0].score === rankedPlayers[1].score) {
    return undefined;
  }

  return rankedPlayers[0].player;
}

function findMatchCandidate(data: { match: { date: string | null; opponent: string } }, matches: MatchOption[]) {
  return matches.find((match) => {
    if (!match.calendarEvent || !data.match.date) {
      return false;
    }

    return normalize(match.opponent) === normalize(data.match.opponent) && formatDateInput(match.calendarEvent.startsAt) === data.match.date;
  });
}

function normalize(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9\s,-]/g, " ")
    .replace(/\s+/g, " ");
}

function nameTokens(value: string) {
  return normalize(value)
    .replace(/^\d+\s+/, "")
    .replaceAll(",", " ")
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean);
}

function scorePlayerNameMatch(importedName: string, player: PlayerOption) {
  const importedTokens = nameTokens(importedName);
  const firstNameTokens = nameTokens(player.firstName);
  const lastNameTokens = nameTokens(player.lastName);
  const playerTokens = [...firstNameTokens, ...lastNameTokens];
  const importedNormalized = importedTokens.join(" ");
  const fullName = nameTokens(`${player.firstName} ${player.lastName}`).join(" ");
  const reversedName = nameTokens(`${player.lastName} ${player.firstName}`).join(" ");

  if (!importedNormalized || playerTokens.length === 0) {
    return 0;
  }

  if (importedNormalized === fullName || importedNormalized === reversedName) {
    return 100;
  }

  const containsFullName = importedNormalized.includes(fullName) || importedNormalized.includes(reversedName);
  if (containsFullName) {
    return 96;
  }

  const allPlayerTokensIncluded = playerTokens.every((token) => importedTokens.includes(token));
  if (allPlayerTokensIncluded) {
    return 94;
  }

  const lastNameMatched = lastNameTokens.every((token) => importedTokens.includes(token));
  const firstNameMatched = firstNameTokens.some((token) => importedTokens.includes(token));
  const firstInitialMatched = firstNameTokens.some((token) =>
    importedTokens.some((importedToken) => importedToken.length === 1 && token.startsWith(importedToken)),
  );

  if (lastNameMatched && firstNameMatched) {
    return 92;
  }

  if (lastNameMatched && firstInitialMatched) {
    return 86;
  }

  if (lastNameMatched && importedTokens.length === lastNameTokens.length) {
    return 80;
  }

  if (lastNameMatched) {
    return 76;
  }

  return 0;
}

function formatDateInput(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function sourceTypeLabel(value: string) {
  return value === "AI_URL" ? "AI-URL" : "CSV-Vorlage";
}

function statusLabel(value: string) {
  const labels: Record<string, string> = {
    CONFIRMED: "Bestaetigt",
    DRAFT: "Entwurf",
    FAILED: "Fehler",
    PARSED: "Pruefen",
  };

  return labels[value] ?? value;
}
