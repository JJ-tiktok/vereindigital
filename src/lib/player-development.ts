import { PlayerAttributeCategory, PlayerPositionGroup } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type AttributeDefinitionWriter = Pick<typeof prisma, "playerAttributeDefinition">;

const defaultAttributes = [
  ["ball-control", "Ballkontrolle", PlayerAttributeCategory.TECHNICAL, PlayerPositionGroup.ALL, 10],
  ["first-touch", "Erster Kontakt", PlayerAttributeCategory.TECHNICAL, PlayerPositionGroup.ALL, 20],
  ["passing", "Passspiel", PlayerAttributeCategory.TECHNICAL, PlayerPositionGroup.ALL, 30],
  ["finishing", "Abschluss", PlayerAttributeCategory.TECHNICAL, PlayerPositionGroup.ALL, 40],
  ["dribbling", "Dribbling", PlayerAttributeCategory.TECHNICAL, PlayerPositionGroup.ALL, 50],
  ["game-intelligence", "Spielverstaendnis", PlayerAttributeCategory.TACTICAL, PlayerPositionGroup.ALL, 60],
  ["positioning", "Stellungsspiel", PlayerAttributeCategory.TACTICAL, PlayerPositionGroup.ALL, 70],
  ["decision-making", "Entscheidungsverhalten", PlayerAttributeCategory.TACTICAL, PlayerPositionGroup.ALL, 80],
  ["pressing", "Pressingverhalten", PlayerAttributeCategory.TACTICAL, PlayerPositionGroup.ALL, 90],
  ["pace", "Schnelligkeit", PlayerAttributeCategory.PHYSICAL, PlayerPositionGroup.ALL, 100],
  ["stamina", "Ausdauer", PlayerAttributeCategory.PHYSICAL, PlayerPositionGroup.ALL, 110],
  ["strength", "Kraft", PlayerAttributeCategory.PHYSICAL, PlayerPositionGroup.ALL, 120],
  ["agility", "Beweglichkeit", PlayerAttributeCategory.PHYSICAL, PlayerPositionGroup.ALL, 130],
  ["work-rate", "Einsatzbereitschaft", PlayerAttributeCategory.MENTAL, PlayerPositionGroup.ALL, 140],
  ["concentration", "Konzentration", PlayerAttributeCategory.MENTAL, PlayerPositionGroup.ALL, 150],
  ["teamwork", "Teamfaehigkeit", PlayerAttributeCategory.MENTAL, PlayerPositionGroup.ALL, 160],
  ["leadership", "Fuehrungsverhalten", PlayerAttributeCategory.MENTAL, PlayerPositionGroup.ALL, 170],
  ["gk-reflexes", "Reflexe", PlayerAttributeCategory.GOALKEEPER, PlayerPositionGroup.GOALKEEPER, 180],
  ["gk-area-command", "Strafraumbeherrschung", PlayerAttributeCategory.GOALKEEPER, PlayerPositionGroup.GOALKEEPER, 190],
  ["gk-one-on-one", "Eins-gegen-eins", PlayerAttributeCategory.GOALKEEPER, PlayerPositionGroup.GOALKEEPER, 200],
  ["gk-handling", "Fangtechnik", PlayerAttributeCategory.GOALKEEPER, PlayerPositionGroup.GOALKEEPER, 210],
  ["gk-distribution", "Spieleroeffnung", PlayerAttributeCategory.GOALKEEPER, PlayerPositionGroup.GOALKEEPER, 220],
] as const;

export async function ensureDefaultAttributeDefinitions(
  clubId: string,
  client: AttributeDefinitionWriter = prisma,
) {
  const existingCount = await client.playerAttributeDefinition.count({
    where: {
      clubId,
    },
  });

  if (existingCount > 0) {
    return;
  }

  await client.playerAttributeDefinition.createMany({
    data: defaultAttributes.map(([key, name, category, positionGroup, sortOrder]) => ({
      clubId,
      key,
      name,
      category,
      positionGroup,
      sortOrder,
      isSystemDefault: true,
    })),
    skipDuplicates: true,
  });
}

export async function getPlayerSeasonHistory(playerProfileId: string) {
  const [matchStats, trainingPerformances] = await Promise.all([
    prisma.playerMatchStat.findMany({
      where: {
        playerProfileId,
      },
      select: {
        goals: true,
        assists: true,
        minutesPlayed: true,
        rating: true,
        match: {
          select: {
            team: {
              select: {
                seasonId: true,
                seasonRef: {
                  select: {
                    name: true,
                    startsAt: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.playerTrainingPerformance.findMany({
      where: {
        playerProfileId,
      },
      select: {
        rating: true,
        calendarEvent: {
          select: {
            team: {
              select: {
                seasonId: true,
                seasonRef: {
                  select: {
                    name: true,
                    startsAt: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  type SeasonEntry = {
    seasonId: string;
    name: string;
    startsAt: Date;
    goals: number;
    assists: number;
    minutesPlayed: number;
    matchRatings: number[];
    trainingRatings: number[];
  };

  const seasons = new Map<string, SeasonEntry>();

  function ensureSeason(seasonId: string, name: string, startsAt: Date) {
    const existing = seasons.get(seasonId);

    if (existing) {
      return existing;
    }

    const entry: SeasonEntry = {
      seasonId,
      name,
      startsAt,
      goals: 0,
      assists: 0,
      minutesPlayed: 0,
      matchRatings: [],
      trainingRatings: [],
    };
    seasons.set(seasonId, entry);

    return entry;
  }

  for (const stat of matchStats) {
    const entry = ensureSeason(stat.match.team.seasonId, stat.match.team.seasonRef.name, stat.match.team.seasonRef.startsAt);
    entry.goals += stat.goals;
    entry.assists += stat.assists;
    entry.minutesPlayed += stat.minutesPlayed;

    if (stat.rating !== null) {
      entry.matchRatings.push(stat.rating);
    }
  }

  for (const performance of trainingPerformances) {
    const entry = ensureSeason(
      performance.calendarEvent.team.seasonId,
      performance.calendarEvent.team.seasonRef.name,
      performance.calendarEvent.team.seasonRef.startsAt,
    );
    entry.trainingRatings.push(performance.rating);
  }

  return [...seasons.values()]
    .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime())
    .map((entry) => ({
      seasonId: entry.seasonId,
      name: entry.name,
      goals: entry.goals,
      assists: entry.assists,
      minutesPlayed: entry.minutesPlayed,
      matchCount: entry.matchRatings.length,
      trainingCount: entry.trainingRatings.length,
      averageMatchRating: average(entry.matchRatings),
      averageTrainingRating: average(entry.trainingRatings),
    }));
}

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

export function attributeCategoryLabel(category: PlayerAttributeCategory) {
  switch (category) {
    case "TECHNICAL":
      return "Technik";
    case "TACTICAL":
      return "Taktik";
    case "PHYSICAL":
      return "Physis";
    case "MENTAL":
      return "Mentalitaet";
    case "GOALKEEPER":
      return "Torhueter";
    default:
      return "Positionsspezifisch";
  }
}

export function fileEntryTypeLabel(type: string) {
  switch (type) {
    case "PLAYER_TALK":
      return "Spielergespraech";
    case "GOAL_AGREEMENT":
      return "Zielvereinbarung";
    case "FEEDBACK":
      return "Feedback";
    case "TRAINING_OBSERVATION":
      return "Trainingsbeobachtung";
    case "MATCH_OBSERVATION":
      return "Spielbeobachtung";
    case "DISCIPLINE":
      return "Verhalten / Disziplin";
    case "LOAD_INJURY":
      return "Verletzung / Belastung";
    default:
      return "Sonstige Notiz";
  }
}
