"use client";

import { useMemo, useState } from "react";

import { RadarChart, type RadarChartAxis } from "@/components/radar-chart";
import { formatDate } from "@/lib/format";

export type GoalkeeperSnapshotTarget = {
  id: string;
  playerId: string;
  playerName: string;
  title: string;
  ratedAt: string;
  ratings: { attributeDefinitionId: string; value: number }[];
};

type GoalkeeperDefinition = { id: string; name: string; subgroup: string | null };
type GoalkeeperSection = { title: string; subgroups: string[] };

function averageForSubgroups(
  ratings: GoalkeeperSnapshotTarget["ratings"],
  definitions: GoalkeeperDefinition[],
  subgroups: string[],
) {
  const definitionSubgroups = new Map(definitions.map((definition) => [definition.id, definition.subgroup]));
  const values = ratings
    .filter((rating) => {
      const subgroup = definitionSubgroups.get(rating.attributeDefinitionId);
      return subgroup && subgroups.includes(subgroup);
    })
    .map((rating) => rating.value);

  if (values.length === 0) {
    return null;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function targetLabel(target: GoalkeeperSnapshotTarget | null) {
  if (!target) {
    return null;
  }

  return `${target.playerName} – ${target.title} (${formatDate(new Date(target.ratedAt))})`;
}

export function GoalkeeperAnalysis({
  currentPlayerId,
  definitions,
  detailSections,
  overviewGroups,
  targets,
}: {
  currentPlayerId: string;
  definitions: GoalkeeperDefinition[];
  detailSections: GoalkeeperSection[];
  overviewGroups: GoalkeeperSection[];
  targets: GoalkeeperSnapshotTarget[];
}) {
  const ownTargets = useMemo(
    () => targets.filter((target) => target.playerId === currentPlayerId),
    [targets, currentPlayerId],
  );

  const [selectedAId, setSelectedAId] = useState(ownTargets[0]?.id ?? "");
  const [selectedBId, setSelectedBId] = useState(ownTargets[1]?.id ?? "");

  const playerGroups = useMemo(() => {
    const map = new Map<string, { playerId: string; playerName: string; snapshots: GoalkeeperSnapshotTarget[] }>();

    for (const target of targets) {
      const existing = map.get(target.playerId);

      if (existing) {
        existing.snapshots.push(target);
      } else {
        map.set(target.playerId, { playerId: target.playerId, playerName: target.playerName, snapshots: [target] });
      }
    }

    return [...map.values()];
  }, [targets]);

  if (ownTargets.length === 0) {
    return <p className="p-5 text-sm text-muted">Noch keine Bewertungsstaende erfasst.</p>;
  }

  const targetA = targets.find((target) => target.id === selectedAId) ?? null;
  const targetB = targets.find((target) => target.id === selectedBId) ?? null;

  const overviewAxes: RadarChartAxis[] = overviewGroups.map((group) => ({
    key: group.title,
    label: group.title,
    value: targetA ? averageForSubgroups(targetA.ratings, definitions, group.subgroups) : null,
    previousValue: targetB ? averageForSubgroups(targetB.ratings, definitions, group.subgroups) : null,
  }));

  const detailRadars = detailSections.map((section) => {
    const sectionDefinitions = definitions.filter(
      (definition) => definition.subgroup && section.subgroups.includes(definition.subgroup),
    );
    const axes: RadarChartAxis[] = sectionDefinitions.map((definition) => ({
      key: definition.id,
      label: definition.name,
      value: targetA?.ratings.find((rating) => rating.attributeDefinitionId === definition.id)?.value ?? null,
      previousValue: targetB?.ratings.find((rating) => rating.attributeDefinitionId === definition.id)?.value ?? null,
    }));

    return { title: section.title, axes };
  });

  const currentLabel = targetLabel(targetA) ?? "Aktuell";
  const previousLabel = targetLabel(targetB);

  return (
    <div>
      <div className="grid gap-3 border-b border-border p-5 sm:grid-cols-2">
        <label className="text-sm font-semibold text-foreground">
          Vergleich A
          <select
            className="mt-2 h-10 w-full rounded-lg border border-border px-3 text-sm font-normal"
            onChange={(event) => setSelectedAId(event.target.value)}
            value={selectedAId}
          >
            {playerGroups.map((player) => (
              <optgroup key={player.playerId} label={player.playerName}>
                {player.snapshots.map((snapshot) => (
                  <option key={snapshot.id} value={snapshot.id}>
                    {snapshot.title} ({formatDate(new Date(snapshot.ratedAt))})
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold text-foreground">
          Vergleich B (optional)
          <select
            className="mt-2 h-10 w-full rounded-lg border border-border px-3 text-sm font-normal"
            onChange={(event) => setSelectedBId(event.target.value)}
            value={selectedBId}
          >
            <option value="">Kein Vergleich</option>
            {playerGroups.map((player) => (
              <optgroup key={player.playerId} label={player.playerName}>
                {player.snapshots.map((snapshot) => (
                  <option key={snapshot.id} value={snapshot.id}>
                    {snapshot.title} ({formatDate(new Date(snapshot.ratedAt))})
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-6 p-5 xl:grid-cols-2">
        <article className="rounded-lg border border-border p-4">
          <p className="text-sm font-semibold text-foreground">Uebersicht</p>
          <div className="mt-3 flex justify-center">
            <RadarChart axes={overviewAxes} currentLabel={currentLabel} previousLabel={previousLabel} size={300} />
          </div>
        </article>
        {detailRadars
          .filter((radar) => radar.axes.length >= 3)
          .map((radar) => (
            <article className="rounded-lg border border-border p-4" key={radar.title}>
              <p className="text-sm font-semibold text-foreground">{radar.title}</p>
              <div className="mt-3 flex justify-center">
                <RadarChart axes={radar.axes} currentLabel={currentLabel} previousLabel={previousLabel} size={300} />
              </div>
            </article>
          ))}
      </div>
    </div>
  );
}
