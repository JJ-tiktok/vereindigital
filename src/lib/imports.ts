import "server-only";

import { ImportType, LineupStatus, Prisma } from "@prisma/client";

export type ImportIssueSeverity = "error" | "warning";

export type ImportIssue = {
  code: string;
  message: string;
  rowIndex?: number;
  severity: ImportIssueSeverity;
};

export type RosterImportRow = {
  birthDate: string;
  firstName: string;
  lastName: string;
  position: string;
  sourceRow: number;
};

export type MatchStatsImportRow = {
  assists: number;
  goals: number;
  lineupStatus: LineupStatus;
  minutesPlayed: number;
  playerName: string;
  rating: number | null;
  redCards: number;
  sourceRow: number;
  yellowCards: number;
};

export type MatchStatsImportMetadata = {
  date: string | null;
  goalsAgainst: number | null;
  goalsFor: number | null;
  isHomeGame: boolean;
  opponent: string;
  title: string;
};

export type RosterImportData = {
  rows: RosterImportRow[];
};

export type MatchStatsImportData = {
  match: MatchStatsImportMetadata;
  rows: MatchStatsImportRow[];
};

export type ParsedImportData = RosterImportData | MatchStatsImportData;

type CsvRow = Record<string, string>;

const rosterHeaderMap = new Map([
  ["vorname", "firstName"],
  ["firstname", "firstName"],
  ["first name", "firstName"],
  ["nachname", "lastName"],
  ["lastname", "lastName"],
  ["last name", "lastName"],
  ["geburtsdatum", "birthDate"],
  ["geburtstag", "birthDate"],
  ["birthdate", "birthDate"],
  ["position", "position"],
]);

const matchHeaderMap = new Map([
  ["spiel", "title"],
  ["titel", "title"],
  ["datum", "date"],
  ["date", "date"],
  ["gegner", "opponent"],
  ["opponent", "opponent"],
  ["heim/auswaerts", "homeAway"],
  ["heim/auswarts", "homeAway"],
  ["heim auswaerts", "homeAway"],
  ["heim auswarts", "homeAway"],
  ["heim", "homeAway"],
  ["spieler", "playerName"],
  ["player", "playerName"],
  ["tore", "goals"],
  ["goals", "goals"],
  ["vorlagen", "assists"],
  ["assists", "assists"],
  ["gelbe karten", "yellowCards"],
  ["gelb", "yellowCards"],
  ["rote karten", "redCards"],
  ["rot", "redCards"],
  ["minuten", "minutesPlayed"],
  ["einsatzzeit", "minutesPlayed"],
  ["startelf/einwechslung", "lineupStatus"],
  ["startelf", "lineupStatus"],
  ["rolle", "lineupStatus"],
  ["bewertung", "rating"],
  ["note", "rating"],
  ["ergebnis", "score"],
  ["tore fuer", "goalsFor"],
  ["tore fur", "goalsFor"],
  ["tore gegen", "goalsAgainst"],
]);

export function parseRosterCsv(csv: string) {
  const { issues, rows } = parseCsv(csv, rosterHeaderMap);
  const parsedRows: RosterImportRow[] = rows.map((row, index) => ({
    birthDate: normalizeDateString(row.birthDate),
    firstName: row.firstName,
    lastName: row.lastName,
    position: row.position.toUpperCase(),
    sourceRow: index + 2,
  }));

  parsedRows.forEach((row, index) => {
    if (!row.firstName) {
      issues.push(createIssue("missing-first-name", "Vorname fehlt.", index, "error"));
    }

    if (!row.lastName) {
      issues.push(createIssue("missing-last-name", "Nachname fehlt.", index, "error"));
    }

    if (!row.birthDate) {
      issues.push(
        createIssue(
          "missing-birth-date",
          "Geburtsdatum fehlt oder ist ungueltig. Bitte im Review ergaenzen oder die Zeile ueberspringen.",
          index,
          "warning",
        ),
      );
    }

    if (!row.position) {
      issues.push(createIssue("missing-position", "Position fehlt.", index, "error"));
    }
  });

  return {
    data: {
      rows: parsedRows,
    } satisfies RosterImportData,
    issues,
  };
}

export function parseMatchStatsCsv(csv: string) {
  const { issues, rows } = parseCsv(csv, matchHeaderMap);
  const firstRow = rows[0] ?? {};
  const score = parseScore(firstRow.score || firstRow.title);
  const goalsFor = readOptionalNumber(firstRow.goalsFor) ?? score?.goalsFor ?? null;
  const goalsAgainst = readOptionalNumber(firstRow.goalsAgainst) ?? score?.goalsAgainst ?? null;
  const parsedRows: MatchStatsImportRow[] = rows.map((row, index) => {
    const lineupStatus = normalizeLineupStatus(row.lineupStatus);
    const minutesPlayed = readNumber(row.minutesPlayed);

    return {
      assists: readNumber(row.assists),
      goals: readNumber(row.goals),
      lineupStatus,
      minutesPlayed,
      playerName: row.playerName,
      rating: normalizeRating(readOptionalNumber(row.rating), minutesPlayed, lineupStatus),
      redCards: readNumber(row.redCards),
      sourceRow: index + 2,
      yellowCards: readNumber(row.yellowCards),
    };
  });
  const metadata: MatchStatsImportMetadata = {
    date: normalizeDateString(firstRow.date),
    goalsAgainst,
    goalsFor,
    isHomeGame: normalizeHomeAway(firstRow.homeAway),
    opponent: firstRow.opponent,
    title: firstRow.title || firstRow.opponent || "Importiertes Spiel",
  };

  if (!metadata.opponent) {
    issues.push(createIssue("missing-opponent", "Gegner fehlt.", undefined, "error"));
  }

  if (!metadata.date) {
    issues.push(createIssue("missing-match-date", "Spieldatum fehlt oder ist ungueltig.", undefined, "error"));
  }

  parsedRows.forEach((row, index) => {
    if (!row.playerName) {
      issues.push(createIssue("missing-player", "Spielername fehlt.", index, "error"));
    }

    if (row.minutesPlayed < 0 || row.minutesPlayed > 120) {
      issues.push(createIssue("invalid-minutes", "Minuten muessen zwischen 0 und 120 liegen.", index, "error"));
    }

    if ([row.goals, row.assists, row.yellowCards, row.redCards].some((value) => value < 0)) {
      issues.push(createIssue("invalid-stat-value", "Statistikwerte duerfen nicht negativ sein.", index, "error"));
    }

    if (requiresRating(row.minutesPlayed, row.lineupStatus) && row.rating === null) {
      issues.push(createIssue("missing-rating", "Bewertung fehlt fuer einen eingesetzten Spieler.", index, "error"));
    }

    if (row.rating !== null && (row.rating < 1 || row.rating > 10)) {
      issues.push(createIssue("invalid-rating", "Bewertung muss zwischen 1.0 und 10.0 liegen.", index, "error"));
    }
  });

  return {
    data: {
      match: metadata,
      rows: parsedRows,
    } satisfies MatchStatsImportData,
    issues,
  };
}

export function toInputJson(value: unknown) {
  return value as Prisma.InputJsonValue;
}

export function isRosterImportData(value: Prisma.JsonValue | null): value is RosterImportData {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  return Array.isArray((value as { rows?: unknown }).rows);
}

export function isMatchStatsImportData(value: Prisma.JsonValue | null): value is MatchStatsImportData {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const candidate = value as { match?: unknown; rows?: unknown };
  return Boolean(candidate.match && Array.isArray(candidate.rows));
}

export function hasBlockingIssues(value: Prisma.JsonValue | null) {
  if (!Array.isArray(value)) {
    return false;
  }

  return value.some(
    (issue) =>
      typeof issue === "object" &&
      issue !== null &&
      "severity" in issue &&
      (issue as { severity?: unknown }).severity === "error",
  );
}

export async function parseImportUrl({
  importType,
  sourceUrl,
}: {
  importType: ImportType;
  sourceUrl: string;
}) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      data: null,
      issues: [createIssue("missing-openai-key", "OPENAI_API_KEY ist nicht konfiguriert.", undefined, "error")],
    };
  }

  let sourceText = "";

  try {
    const response = await fetch(sourceUrl, {
      headers: {
        "user-agent": "VereinDigital Import Preview",
      },
    });

    if (!response.ok) {
      return {
        data: null,
        issues: [
          createIssue(
            "source-fetch-failed",
            "Die URL konnte nicht gelesen werden. Bitte nutze den CSV-Import als Fallback.",
            undefined,
            "error",
          ),
        ],
      };
    }

    sourceText = htmlToText(await response.text()).slice(0, 30000);
  } catch {
    return {
      data: null,
      issues: [
        createIssue(
          "source-fetch-failed",
          "Die URL konnte nicht gelesen werden. Bitte nutze den CSV-Import als Fallback.",
          undefined,
          "error",
        ),
      ],
    };
  }

  const aiResult = await callOpenAiImporter(importType, sourceText);

  if (!aiResult) {
    return {
      data: null,
      issues: [createIssue("ai-parse-failed", "Die Daten konnten nicht sicher aus der URL extrahiert werden.", undefined, "error")],
    };
  }

  return importType === "ROSTER" ? normalizeAiRoster(aiResult) : normalizeAiMatchStats(aiResult);
}

function parseCsv(csv: string, headerMap: Map<string, string>) {
  const delimiter = csv.split(/\r?\n/, 1)[0]?.includes(";") ? ";" : ",";
  const records = readCsvRecords(csv, delimiter);
  const issues: ImportIssue[] = [];

  if (records.length < 2) {
    return {
      issues: [createIssue("empty-csv", "Die CSV enthaelt keine Datenzeilen.", undefined, "error")],
      rows: [] as CsvRow[],
    };
  }

  const headers = records[0].map((header) => headerMap.get(normalizeHeader(header)) ?? normalizeHeader(header));
  const rows = records.slice(1).map((record) =>
    headers.reduce<CsvRow>((row, header, index) => {
      row[header] = String(record[index] ?? "").trim();
      return row;
    }, {}),
  );

  return {
    issues,
    rows: rows.filter((row) => Object.values(row).some(Boolean)),
  };
}

function readCsvRecords(csv: string, delimiter: "," | ";") {
  const records: string[][] = [];
  let current = "";
  let row: string[] = [];
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];

    if (char === "\"" && quoted && next === "\"") {
      current += "\"";
      index += 1;
      continue;
    }

    if (char === "\"") {
      quoted = !quoted;
      continue;
    }

    if (char === delimiter && !quoted) {
      row.push(current.trim());
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(current.trim());
      records.push(row);
      current = "";
      row = [];
      continue;
    }

    current += char;
  }

  row.push(current.trim());
  records.push(row);

  return records.filter((record) => record.some(Boolean));
}

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\s+/g, " ");
}

function normalizeDateString(value?: string | null) {
  const raw = String(value ?? "").trim();

  if (!raw) {
    return "";
  }

  const germanMatch = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  if (germanMatch) {
    const year = germanMatch[3].length === 2 ? `20${germanMatch[3]}` : germanMatch[3];
    const date = new Date(Number(year), Number(germanMatch[2]) - 1, Number(germanMatch[1]));

    return Number.isNaN(date.getTime()) ? "" : toDateInputValue(date);
  }

  const date = new Date(raw);

  return Number.isNaN(date.getTime()) ? "" : toDateInputValue(date);
}

function readNumber(value?: string | null) {
  const parsed = Number.parseInt(String(value ?? "0").trim(), 10);

  return Number.isNaN(parsed) ? 0 : parsed;
}

function readOptionalNumber(value?: string | null) {
  const raw = String(value ?? "").trim().replace(",", ".");

  if (!raw) {
    return null;
  }

  const parsed = Number.parseFloat(raw);

  return Number.isNaN(parsed) ? null : parsed;
}

function normalizeLineupStatus(value?: string | null) {
  const normalized = String(value ?? "").trim().toLowerCase();

  if (["startelf", "starter", "start", "s"].includes(normalized)) {
    return LineupStatus.STARTER;
  }

  if (["einwechslung", "eingewechselt", "substitute", "bank", "sub"].includes(normalized)) {
    return LineupStatus.SUBSTITUTE;
  }

  return LineupStatus.NOT_USED;
}

function requiresRating(minutesPlayed: number, lineupStatus: LineupStatus) {
  return minutesPlayed > 0 || lineupStatus !== LineupStatus.NOT_USED;
}

function normalizeRating(value: number | null, minutesPlayed: number, lineupStatus: LineupStatus) {
  if (!requiresRating(minutesPlayed, lineupStatus) && (value === null || value <= 0)) {
    return null;
  }

  return value;
}

function normalizeHomeAway(value?: string | null) {
  const normalized = String(value ?? "").trim().toLowerCase();

  return !["auswaerts", "auswarts", "away", "a"].includes(normalized);
}

function parseScore(value?: string | null) {
  const match = String(value ?? "").match(/(\d+)\s*[:-]\s*(\d+)/);

  if (!match) {
    return null;
  }

  return {
    goalsAgainst: Number.parseInt(match[2], 10),
    goalsFor: Number.parseInt(match[1], 10),
  };
}

function createIssue(code: string, message: string, rowIndex?: number, severity: ImportIssueSeverity = "warning") {
  return {
    code,
    message,
    rowIndex,
    severity,
  } satisfies ImportIssue;
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function htmlToText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

async function callOpenAiImporter(importType: ImportType, sourceText: string) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    body: JSON.stringify({
      input: [
        {
          content:
            importType === "ROSTER"
              ? "Extrahiere eine Fussball-Kaderliste. Antworte nur mit schema-konformen Daten."
              : "Extrahiere Fussball-Spieldaten und Spielerstatistiken. Antworte nur mit schema-konformen Daten.",
          role: "system",
        },
        {
          content: sourceText,
          role: "user",
        },
      ],
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      text: {
        format: {
          name: importType === "ROSTER" ? "roster_import" : "match_stats_import",
          schema: importType === "ROSTER" ? rosterJsonSchema : matchStatsJsonSchema,
          strict: true,
          type: "json_schema",
        },
      },
    }),
    headers: {
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "content-type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as OpenAiResponsePayload;
  const text = extractOpenAiOutputText(payload);

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function extractOpenAiOutputText(payload: OpenAiResponsePayload) {
  if (payload.output_text) {
    return payload.output_text;
  }

  return payload.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => content.text ?? "")
    .join("")
    .trim();
}

function normalizeAiRoster(value: unknown) {
  const rows = Array.isArray((value as { rows?: unknown }).rows) ? (value as { rows: unknown[] }).rows : [];
  const csv = [
    "Vorname;Nachname;Geburtsdatum;Position",
    ...rows.map((row) => {
      const candidate = row as Partial<Record<"birthDate" | "firstName" | "lastName" | "position", string>>;
      return [candidate.firstName, candidate.lastName, candidate.birthDate, candidate.position].map((entry) => entry ?? "").join(";");
    }),
  ].join("\n");

  return parseRosterCsv(csv);
}

function normalizeAiMatchStats(value: unknown) {
  const candidate = value as {
    match?: Partial<Record<"date" | "goalsAgainst" | "goalsFor" | "homeAway" | "opponent" | "title", string>>;
    rows?: unknown[];
  };
  const match = candidate.match ?? {};
  const csv = [
    "Spiel;Datum;Gegner;Heim/Auswaerts;Spieler;Tore;Vorlagen;Gelbe Karten;Rote Karten;Minuten;Startelf/Einwechslung;Bewertung;Tore fuer;Tore gegen",
    ...(candidate.rows ?? []).map((row) => {
      const stat = row as Partial<
        Record<
          | "assists"
          | "goals"
          | "lineupStatus"
          | "minutesPlayed"
          | "playerName"
          | "rating"
          | "redCards"
          | "yellowCards",
          string | number
        >
      >;
      return [
        match.title,
        match.date,
        match.opponent,
        match.homeAway,
        stat.playerName,
        stat.goals,
        stat.assists,
        stat.yellowCards,
        stat.redCards,
        stat.minutesPlayed,
        stat.lineupStatus,
        stat.rating,
        match.goalsFor,
        match.goalsAgainst,
      ]
        .map((entry) => entry ?? "")
        .join(";");
    }),
  ].join("\n");

  return parseMatchStatsCsv(csv);
}

type OpenAiResponsePayload = {
  output?: {
    content?: {
      text?: string;
      type?: string;
    }[];
  }[];
  output_text?: string;
};

const rosterJsonSchema = {
  additionalProperties: false,
  properties: {
    rows: {
      items: {
        additionalProperties: false,
        properties: {
          birthDate: { type: "string" },
          firstName: { type: "string" },
          lastName: { type: "string" },
          position: { type: "string" },
        },
        required: ["firstName", "lastName", "birthDate", "position"],
        type: "object",
      },
      type: "array",
    },
  },
  required: ["rows"],
  type: "object",
};

const matchStatsJsonSchema = {
  additionalProperties: false,
  properties: {
    match: {
      additionalProperties: false,
      properties: {
        date: { type: "string" },
        goalsAgainst: { type: "string" },
        goalsFor: { type: "string" },
        homeAway: { type: "string" },
        opponent: { type: "string" },
        title: { type: "string" },
      },
      required: ["title", "date", "opponent", "homeAway", "goalsFor", "goalsAgainst"],
      type: "object",
    },
    rows: {
      items: {
        additionalProperties: false,
        properties: {
          assists: { type: "integer" },
          goals: { type: "integer" },
          lineupStatus: { enum: ["STARTER", "SUBSTITUTE", "NOT_USED"], type: "string" },
          minutesPlayed: { type: "integer" },
          playerName: { type: "string" },
          rating: { type: ["number", "null"] },
          redCards: { type: "integer" },
          yellowCards: { type: "integer" },
        },
        required: [
          "playerName",
          "goals",
          "assists",
          "yellowCards",
          "redCards",
          "minutesPlayed",
          "lineupStatus",
          "rating",
        ],
        type: "object",
      },
      type: "array",
    },
  },
  required: ["match", "rows"],
  type: "object",
};
