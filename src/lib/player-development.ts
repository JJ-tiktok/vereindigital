import { prisma } from "@/lib/prisma";

import { defaultAttributes, deprecatedAttributeKeys } from "@/lib/attribute-groups";

export {
  attributeCategoryLabel,
  defaultAttributes,
  deprecatedAttributeKeys,
  fileEntryTypeLabel,
  fileEntryVisibilityLabel,
  goalkeeperDetailSections,
  goalkeeperOverviewGroups,
  goalkeeperSubgroups,
  mapPositionToGroup,
} from "@/lib/attribute-groups";

type AttributeDefinitionWriter = Pick<typeof prisma, "playerAttributeDefinition">;

export async function ensureDefaultAttributeDefinitions(
  clubId: string,
  client: AttributeDefinitionWriter = prisma,
) {
  const existingDefinitions = await client.playerAttributeDefinition.findMany({
    where: {
      clubId,
    },
    select: {
      id: true,
      key: true,
      _count: {
        select: {
          ratings: true,
        },
      },
    },
  });

  const existingKeys = new Set(existingDefinitions.map((definition) => definition.key));
  const missing = defaultAttributes.filter((attribute) => !existingKeys.has(attribute.key));

  if (missing.length > 0) {
    await client.playerAttributeDefinition.createMany({
      data: missing.map((attribute) => ({
        clubId,
        key: attribute.key,
        name: attribute.name,
        category: attribute.category,
        positionGroup: attribute.positionGroup,
        subgroup: attribute.subgroup,
        sortOrder: attribute.sortOrder,
        isSystemDefault: true,
      })),
      skipDuplicates: true,
    });
  }

  const unusedDeprecated = existingDefinitions.filter(
    (definition) => deprecatedAttributeKeys.includes(definition.key) && definition._count.ratings === 0,
  );

  if (unusedDeprecated.length > 0) {
    await client.playerAttributeDefinition.deleteMany({
      where: {
        id: {
          in: unusedDeprecated.map((definition) => definition.id),
        },
      },
    });
  }
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
