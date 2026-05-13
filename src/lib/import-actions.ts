"use server";

import { CalendarEventType, ImportType, LineupStatus, MatchStatus, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireActiveTeam, requireAppContext, requireCoachingStaffTeam } from "@/lib/app-context";
import {
  isMatchStatsImportData,
  isRosterImportData,
  parseImportUrl,
  parseMatchStatsCsv,
  parseRosterCsv,
  toInputJson,
  type ImportIssue,
  type MatchStatsImportData,
  type RosterImportData,
} from "@/lib/imports";
import { prisma } from "@/lib/prisma";

function readString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function readDateValue(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function readDateInputValue(value: string) {
  const date = readDateValue(value);

  if (!date) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function readOptionalInt(formData: FormData, key: string) {
  const value = readString(formData, key);

  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);

  return Number.isNaN(parsed) ? null : parsed;
}

function readInt(formData: FormData, key: string, fallback: number) {
  return readOptionalInt(formData, key) ?? fallback;
}

function readOptionalFloat(formData: FormData, key: string) {
  const value = readString(formData, key).replace(",", ".");

  if (!value) {
    return null;
  }

  const parsed = Number.parseFloat(value);

  return Number.isNaN(parsed) ? null : parsed;
}

function readLineupStatus(formData: FormData, key: string, fallback: LineupStatus) {
  const value = readString(formData, key);

  if (Object.values(LineupStatus).includes(value as LineupStatus)) {
    return value as LineupStatus;
  }

  return fallback;
}

function requiresMatchRating(minutesPlayed: number, lineupStatus: LineupStatus) {
  return minutesPlayed > 0 || lineupStatus !== LineupStatus.NOT_USED;
}

function readMatchRating(formData: FormData, key: string, fallback: number | null, minutesPlayed: number, lineupStatus: LineupStatus) {
  const rawValue = readString(formData, key);
  const parsedRating = rawValue ? readOptionalFloat(formData, key) : null;
  const rating = parsedRating ?? fallback;

  if (!requiresMatchRating(minutesPlayed, lineupStatus) && !rawValue) {
    return null;
  }

  if (!requiresMatchRating(minutesPlayed, lineupStatus) && (rating === null || rating <= 0)) {
    return null;
  }

  return rating;
}

function readRequiredImportType(formData: FormData) {
  const value = readString(formData, "importType");

  return value === "MATCH_STATS" ? ImportType.MATCH_STATS : ImportType.ROSTER;
}

async function readCsvInput(formData: FormData) {
  const pastedCsv = readString(formData, "csv");
  const file = formData.get("file");

  if (file instanceof File && file.size > 0) {
    return {
      fileName: file.name,
      text: await file.text(),
    };
  }

  return {
    fileName: null,
    text: pastedCsv,
  };
}

export async function createRosterTemplateImportJob(formData: FormData) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  requireCoachingStaffTeam(context, activeTeam.id);
  const csvInput = await readCsvInput(formData);

  if (!csvInput.text) {
    redirect("/importe/kader?error=missing-csv");
  }

  const parsed = parseRosterCsv(csvInput.text);
  const job = await prisma.importJob.create({
    data: {
      clubId: context.club.id,
      createdByUserId: context.appUser.id,
      fileName: csvInput.fileName,
      issues: toInputJson(parsed.issues),
      parsedData: toInputJson(parsed.data),
      seasonId: context.activeSeason.id,
      sourceType: "TEMPLATE_CSV",
      status: "PARSED",
      teamId: activeTeam.id,
      type: "ROSTER",
    },
  });

  revalidatePath("/importe");
  redirect(`/importe/${job.id}`);
}

export async function createMatchStatsTemplateImportJob(formData: FormData) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  requireCoachingStaffTeam(context, activeTeam.id);
  const csvInput = await readCsvInput(formData);

  if (!csvInput.text) {
    redirect("/importe/spieltage?error=missing-csv");
  }

  const parsed = parseMatchStatsCsv(csvInput.text);
  const job = await prisma.importJob.create({
    data: {
      clubId: context.club.id,
      createdByUserId: context.appUser.id,
      fileName: csvInput.fileName,
      issues: toInputJson(parsed.issues),
      parsedData: toInputJson(parsed.data),
      seasonId: context.activeSeason.id,
      sourceType: "TEMPLATE_CSV",
      status: "PARSED",
      teamId: activeTeam.id,
      type: "MATCH_STATS",
    },
  });

  revalidatePath("/importe");
  redirect(`/importe/${job.id}`);
}

export async function createAiUrlImportJob(formData: FormData) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  requireCoachingStaffTeam(context, activeTeam.id);
  const sourceUrl = readString(formData, "sourceUrl");
  const importType = readRequiredImportType(formData);

  if (!sourceUrl) {
    redirect(importType === "ROSTER" ? "/importe/kader?error=missing-url" : "/importe/spieltage?error=missing-url");
  }

  const parsed = await parseImportUrl({
    importType,
    sourceUrl,
  });
  const job = await prisma.importJob.create({
    data: {
      clubId: context.club.id,
      createdByUserId: context.appUser.id,
      issues: toInputJson(parsed.issues),
      parsedData: parsed.data ? toInputJson(parsed.data) : Prisma.JsonNull,
      seasonId: context.activeSeason.id,
      sourceType: "AI_URL",
      sourceUrl,
      status: parsed.data ? "PARSED" : "FAILED",
      teamId: activeTeam.id,
      type: importType,
    },
  });

  revalidatePath("/importe");
  redirect(`/importe/${job.id}`);
}

export async function saveImportReviewData(formData: FormData) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  requireCoachingStaffTeam(context, activeTeam.id);
  const job = await findImportJob(readString(formData, "jobId"), context.club.id, activeTeam.id);

  if (!job) {
    redirect("/importe");
  }

  const reviewData =
    job.type === "ROSTER" && isRosterImportData(job.parsedData)
      ? buildRosterReviewData(formData, job.parsedData)
      : job.type === "MATCH_STATS" && isMatchStatsImportData(job.parsedData)
        ? buildMatchStatsReviewData(formData, job.parsedData)
        : null;

  if (!reviewData) {
    redirect(`/importe/${job.id}?error=unresolved`);
  }

  await prisma.importJob.update({
    where: {
      id: job.id,
    },
    data: {
      issues: toInputJson(reviewData.issues),
      parsedData: toInputJson(reviewData.data),
      status: job.status === "FAILED" ? "PARSED" : job.status,
    },
  });

  revalidatePath("/importe");
  revalidatePath(`/importe/${job.id}`);
  redirect(`/importe/${job.id}?saved=1`);
}

export async function confirmRosterImportJob(formData: FormData) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  requireCoachingStaffTeam(context, activeTeam.id);
  const job = await findImportJob(readString(formData, "jobId"), context.club.id, activeTeam.id);

  if (!job || job.type !== "ROSTER" || !isRosterImportData(job.parsedData)) {
    redirect(job ? `/importe/${job.id}?error=unresolved` : "/importe");
  }

  const originalImportData = job.parsedData;
  const reviewData = buildRosterReviewData(formData, originalImportData);
  const playerRole = await prisma.role.findUniqueOrThrow({
    where: {
      clubId_key: {
        clubId: context.club.id,
        key: "player",
      },
    },
  });

  await prisma.$transaction(async (tx) => {
    for (const [index, row] of originalImportData.rows.entries()) {
      const action = readString(formData, `action-${index}`) || "create";
      const skipRow = readString(formData, `skip-${index}`) === "true";
      const playerProfileId = readString(formData, `player-${index}`);
      const firstName = readString(formData, `firstName-${index}`) || row.firstName;
      const lastName = readString(formData, `lastName-${index}`) || row.lastName;
      const birthDateValue = readString(formData, `birthDate-${index}`) || row.birthDate;
      const position = (readString(formData, `position-${index}`) || row.position).toUpperCase();

      if (skipRow || action === "skip") {
        continue;
      }

      const birthDate = readDateValue(birthDateValue);
      if (!firstName || !lastName || !birthDate || !position) {
        redirect(`/importe/${job.id}?error=invalid-roster-row`);
      }

      const player =
        action === "update" && playerProfileId
          ? await tx.playerProfile.update({
              where: {
                id: playerProfileId,
                clubId: context.club.id,
              },
              data: {
                birthDate,
                firstName,
                lastName,
                position,
              },
            })
          : await tx.playerProfile.create({
              data: {
                birthDate,
                clubId: context.club.id,
                firstName,
                lastName,
                position,
              },
            });

      await tx.teamMembership.upsert({
        where: {
          teamId_playerProfileId_roleId: {
            playerProfileId: player.id,
            roleId: playerRole.id,
            teamId: activeTeam.id,
          },
        },
        create: {
          playerProfileId: player.id,
          roleId: playerRole.id,
          teamId: activeTeam.id,
        },
        update: {
          status: "ACTIVE",
        },
      });
    }

    await tx.importJob.update({
      where: {
        id: job.id,
      },
      data: {
        issues: toInputJson(reviewData.issues),
        parsedData: toInputJson(reviewData.data),
        status: "CONFIRMED",
      },
    });
  });

  revalidatePath("/importe");
  revalidatePath("/kader");
  revalidatePath("/dashboard");
  redirect("/kader?imported=1");
}

export async function confirmMatchStatsImportJob(formData: FormData) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  requireCoachingStaffTeam(context, activeTeam.id);
  const job = await findImportJob(readString(formData, "jobId"), context.club.id, activeTeam.id);

  if (!job || job.type !== "MATCH_STATS" || !isMatchStatsImportData(job.parsedData)) {
    redirect(job ? `/importe/${job.id}?error=unresolved` : "/importe");
  }

  const originalImportData = job.parsedData;
  const reviewData = buildMatchStatsReviewData(formData, originalImportData);
  const selectedRows = originalImportData.rows
    .map((row, index) => {
      const lineupStatus = readLineupStatus(formData, `lineupStatus-${index}`, row.lineupStatus);
      const minutesPlayed = readInt(formData, `minutesPlayed-${index}`, row.minutesPlayed);

      return {
        assists: readInt(formData, `assists-${index}`, row.assists),
        goals: readInt(formData, `goals-${index}`, row.goals),
        lineupStatus,
        minutesPlayed,
        playerProfileId: readString(formData, `player-${index}`),
        rating: readMatchRating(formData, `rating-${index}`, row.rating, minutesPlayed, lineupStatus),
        redCards: readInt(formData, `redCards-${index}`, row.redCards),
        skipRow: readString(formData, `skip-${index}`) === "true",
        yellowCards: readInt(formData, `yellowCards-${index}`, row.yellowCards),
      };
    })
    .filter((entry) => !entry.skipRow);

  if (selectedRows.some((entry) => !entry.playerProfileId)) {
    redirect(`/importe/${job.id}?error=no-player-mapping`);
  }

  const goalsFor = reviewData.data.match.goalsFor;
  const goalsAgainst = reviewData.data.match.goalsAgainst;

  if (
    selectedRows.some(
      (entry) =>
        entry.goals < 0 ||
        entry.assists < 0 ||
        entry.yellowCards < 0 ||
        entry.redCards < 0 ||
        entry.minutesPlayed < 0 ||
        entry.minutesPlayed > 120 ||
        (requiresMatchRating(entry.minutesPlayed, entry.lineupStatus) && entry.rating === null) ||
        (entry.rating !== null && (entry.rating < 1 || entry.rating > 10)),
    ) ||
    (goalsFor !== null && goalsFor < 0) ||
    (goalsAgainst !== null && goalsAgainst < 0)
  ) {
    redirect(`/importe/${job.id}?error=invalid-match-row`);
  }

  const matchId = await ensureMatchForImport(formData, reviewData.data, activeTeam.id, context.appUser.id, {
    goalsAgainst,
    goalsFor,
  });

  await prisma.$transaction(async (tx) => {
    if (goalsFor !== null || goalsAgainst !== null) {
      await tx.match.update({
        where: {
          id: matchId,
          teamId: activeTeam.id,
        },
        data: {
          goalsAgainst,
          goalsFor,
          status: MatchStatus.FINISHED,
        },
      });
    }

    for (const entry of selectedRows) {
      await tx.playerMatchStat.upsert({
        where: {
          matchId_playerProfileId: {
            matchId,
            playerProfileId: entry.playerProfileId,
          },
        },
        create: {
          assists: entry.assists,
          goals: entry.goals,
          lineupStatus: entry.lineupStatus,
          matchId,
          minutesPlayed: entry.minutesPlayed,
          playerProfileId: entry.playerProfileId,
          rating: entry.rating,
          redCards: entry.redCards,
          yellowCards: entry.yellowCards,
        },
        update: {
          assists: entry.assists,
          goals: entry.goals,
          lineupStatus: entry.lineupStatus,
          minutesPlayed: entry.minutesPlayed,
          rating: entry.rating,
          redCards: entry.redCards,
          yellowCards: entry.yellowCards,
        },
      });
    }

    await tx.importJob.update({
      where: {
        id: job.id,
      },
      data: {
        issues: toInputJson(reviewData.issues),
        parsedData: toInputJson(reviewData.data),
        status: "CONFIRMED",
      },
    });
  });

  revalidatePath("/importe");
  revalidatePath("/spiele");
  revalidatePath(`/spiele/${matchId}`);
  revalidatePath("/dashboard");
  redirect(`/spiele/${matchId}?imported=1`);
}

function buildRosterReviewData(formData: FormData, importData: RosterImportData) {
  const issues: ImportIssue[] = [];
  const rows = importData.rows
    .map((row, index) => {
      const firstName = readString(formData, `firstName-${index}`) || row.firstName;
      const lastName = readString(formData, `lastName-${index}`) || row.lastName;
      const birthDate = readDateInputValue(readString(formData, `birthDate-${index}`) || row.birthDate);
      const position = (readString(formData, `position-${index}`) || row.position).toUpperCase();
      const skipRow = readString(formData, `skip-${index}`) === "true" || readString(formData, `action-${index}`) === "skip";

      if (!skipRow) {
        if (!firstName) {
          issues.push(createIssue("missing-first-name", "Vorname fehlt.", index, "error"));
        }

        if (!lastName) {
          issues.push(createIssue("missing-last-name", "Nachname fehlt.", index, "error"));
        }

        if (!birthDate) {
          issues.push(createIssue("missing-birth-date", "Geburtsdatum fehlt oder ist ungueltig.", index, "warning"));
        }

        if (!position) {
          issues.push(createIssue("missing-position", "Position fehlt.", index, "error"));
        }
      }

      return {
        birthDate,
        firstName,
        lastName,
        position,
        skipRow,
        sourceRow: row.sourceRow,
      };
    })
    .filter((row) => !row.skipRow)
    .map((row) => ({
      birthDate: row.birthDate,
      firstName: row.firstName,
      lastName: row.lastName,
      position: row.position,
      sourceRow: row.sourceRow,
    }));

  return {
    data: {
      rows,
    } satisfies RosterImportData,
    issues,
  };
}

function buildMatchStatsReviewData(formData: FormData, importData: MatchStatsImportData) {
  const issues: ImportIssue[] = [];
  const match = {
    date: readDateInputValue(readString(formData, "matchDate") || importData.match.date || "") || null,
    goalsAgainst: readOptionalInt(formData, "goalsAgainst") ?? importData.match.goalsAgainst,
    goalsFor: readOptionalInt(formData, "goalsFor") ?? importData.match.goalsFor,
    isHomeGame: readString(formData, "isHomeGame") !== "false",
    opponent: readString(formData, "opponent") || importData.match.opponent,
    title: readString(formData, "matchTitle") || importData.match.title || "Importiertes Spiel",
  };
  const rows = importData.rows
    .map((row, index) => {
      const playerName = readString(formData, `playerName-${index}`) || row.playerName;
      const lineupStatus = readLineupStatus(formData, `lineupStatus-${index}`, row.lineupStatus);
      const minutesPlayed = readInt(formData, `minutesPlayed-${index}`, row.minutesPlayed);
      const parsedRow = {
        assists: readInt(formData, `assists-${index}`, row.assists),
        goals: readInt(formData, `goals-${index}`, row.goals),
        lineupStatus,
        minutesPlayed,
        playerName,
        rating: readMatchRating(formData, `rating-${index}`, row.rating, minutesPlayed, lineupStatus),
        redCards: readInt(formData, `redCards-${index}`, row.redCards),
        skipRow: readString(formData, `skip-${index}`) === "true",
        sourceRow: row.sourceRow,
        yellowCards: readInt(formData, `yellowCards-${index}`, row.yellowCards),
      };

      if (!parsedRow.skipRow) {
        if (!parsedRow.playerName) {
          issues.push(createIssue("missing-player", "Spielername fehlt.", index, "error"));
        }

        if (parsedRow.minutesPlayed < 0 || parsedRow.minutesPlayed > 120) {
          issues.push(createIssue("invalid-minutes", "Minuten muessen zwischen 0 und 120 liegen.", index, "error"));
        }

        if ([parsedRow.goals, parsedRow.assists, parsedRow.yellowCards, parsedRow.redCards].some((value) => value < 0)) {
          issues.push(createIssue("invalid-stat-value", "Statistikwerte duerfen nicht negativ sein.", index, "error"));
        }

        if (requiresMatchRating(parsedRow.minutesPlayed, parsedRow.lineupStatus) && parsedRow.rating === null) {
          issues.push(createIssue("missing-rating", "Bewertung fehlt fuer einen eingesetzten Spieler.", index, "error"));
        }

        if (parsedRow.rating !== null && (parsedRow.rating < 1 || parsedRow.rating > 10)) {
          issues.push(createIssue("invalid-rating", "Bewertung muss zwischen 1.0 und 10.0 liegen.", index, "error"));
        }
      }

      return parsedRow;
    })
    .filter((row) => !row.skipRow)
    .map((row) => ({
      assists: row.assists,
      goals: row.goals,
      lineupStatus: row.lineupStatus,
      minutesPlayed: row.minutesPlayed,
      playerName: row.playerName,
      rating: row.rating,
      redCards: row.redCards,
      sourceRow: row.sourceRow,
      yellowCards: row.yellowCards,
    }));

  if (!match.opponent) {
    issues.push(createIssue("missing-opponent", "Gegner fehlt.", undefined, "error"));
  }

  if (!match.date) {
    issues.push(createIssue("missing-match-date", "Spieldatum fehlt oder ist ungueltig.", undefined, "error"));
  }

  if ((match.goalsFor !== null && match.goalsFor < 0) || (match.goalsAgainst !== null && match.goalsAgainst < 0)) {
    issues.push(createIssue("invalid-score", "Das Ergebnis darf keine negativen Tore enthalten.", undefined, "error"));
  }

  return {
    data: {
      match,
      rows,
    } satisfies MatchStatsImportData,
    issues,
  };
}

function createIssue(code: string, message: string, rowIndex?: number, severity: "error" | "warning" = "warning") {
  return {
    code,
    message,
    rowIndex,
    severity,
  } satisfies ImportIssue;
}

async function findImportJob(jobId: string, clubId: string, teamId: string) {
  if (!jobId) {
    return null;
  }

  return prisma.importJob.findFirst({
    where: {
      clubId,
      id: jobId,
      teamId,
    },
  });
}

async function ensureMatchForImport(
  formData: FormData,
  data: MatchStatsImportData,
  teamId: string,
  createdByUserId: string,
  score: {
    goalsAgainst: number | null;
    goalsFor: number | null;
  },
) {
  const selectedMatchId = readString(formData, "matchId");

  if (selectedMatchId) {
    const match = await prisma.match.findFirst({
      where: {
        id: selectedMatchId,
        teamId,
      },
      select: {
        id: true,
      },
    });

    if (match) {
      return match.id;
    }
  }

  const startsAt = data.match.date ? readDateValue(data.match.date) : null;

  if (!startsAt || !data.match.opponent) {
    redirect(`/importe?error=missing-match-target`);
  }

  const event = await prisma.calendarEvent.create({
    data: {
      createdByUserId,
      endsAt: new Date(startsAt.getTime() + 2 * 60 * 60 * 1000),
      startsAt,
      teamId,
      title: data.match.title || `Spiel gegen ${data.match.opponent}`,
      type: CalendarEventType.MATCH,
    },
  });
  const match = await prisma.match.create({
    data: {
      calendarEventId: event.id,
      goalsAgainst: score.goalsAgainst,
      goalsFor: score.goalsFor,
      isHomeGame: data.match.isHomeGame,
      opponent: data.match.opponent,
      status: score.goalsFor !== null || score.goalsAgainst !== null ? MatchStatus.FINISHED : MatchStatus.PLANNED,
      teamId,
    },
  });

  return match.id;
}
