"use client";

import { CircleDot, LayoutGrid, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { assignMatchLineupSlotPlayer } from "@/lib/actions";
import { SortableHeader } from "@/components/sortable-header";
import { positionCodeLabel } from "@/lib/tactics";

type PlayerRow = {
  assists: number;
  goals: number;
  id: string;
  initials: string;
  jerseyNumber: number | null;
  lineupStatus: string;
  minutesPlayed: number;
  name: string;
  played: boolean;
  position: string;
  rating: number | null;
  redCards: number;
  saved: boolean;
  unavailable: boolean;
  yellowCards: number;
};

type FormationSlot = {
  id: string;
  x: number;
  y: number;
  positionCode: string;
  playerProfileId: string | null;
};

type SortKey = "name" | "minutesPlayed" | "goals" | "assists" | "yellowCards" | "redCards" | "rating";

const gridCols = "lg:grid-cols-[minmax(220px,1fr)_120px_62px_52px_52px_58px_58px_70px]";

export function MatchLineupEditor({
  canManageMatch,
  formationSlots,
  matchId,
  players,
  tacticFormation,
  tacticName,
}: {
  canManageMatch: boolean;
  formationSlots: FormationSlot[];
  matchId: string;
  players: PlayerRow[];
  tacticFormation: string | null;
  tacticName: string | null;
}) {
  const [statusById, setStatusById] = useState<Record<string, string>>(() =>
    Object.fromEntries(players.map((player) => [player.id, player.lineupStatus])),
  );
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const playerById = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);

  function getStatus(playerId: string) {
    return statusById[playerId] ?? playerById.get(playerId)?.lineupStatus ?? "NOT_USED";
  }

  function setStatus(playerId: string, status: string) {
    setStatusById((current) => ({ ...current, [playerId]: status }));
  }

  function toggleStarter(playerId: string) {
    setStatusById((current) => ({
      ...current,
      [playerId]: getStatus(playerId) === "STARTER" ? "NOT_USED" : "STARTER",
    }));
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const [activeTab, setActiveTab] = useState<"aufstellung" | "statistiken">("aufstellung");

  const usedPlayers = players.filter((player) => getStatus(player.id) !== "NOT_USED");
  const benchPlayers = players.filter((player) => getStatus(player.id) === "NOT_USED");

  const sortedUsedPlayers = useMemo(() => {
    if (!sortKey) {
      return usedPlayers;
    }

    const dir = sortDir === "asc" ? 1 : -1;

    return [...usedPlayers].sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.name.localeCompare(b.name) * dir;
        case "minutesPlayed":
          return (a.minutesPlayed - b.minutesPlayed) * dir;
        case "goals":
          return (a.goals - b.goals) * dir;
        case "assists":
          return (a.assists - b.assists) * dir;
        case "yellowCards":
          return (a.yellowCards - b.yellowCards) * dir;
        case "redCards":
          return (a.redCards - b.redCards) * dir;
        case "rating": {
          const aValue = a.rating ?? -Infinity;
          const bValue = b.rating ?? -Infinity;
          return (aValue - bValue) * dir;
        }
        default:
          return 0;
      }
    });
  }, [usedPlayers, sortKey, sortDir]);

  const sortedBenchPlayers = useMemo(
    () => [...benchPlayers].sort((a, b) => a.name.localeCompare(b.name)),
    [benchPlayers],
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-border">
        <TabButton
          active={activeTab === "aufstellung"}
          label="Aufstellung"
          onClick={() => setActiveTab("aufstellung")}
        />
        <TabButton
          active={activeTab === "statistiken"}
          label={`Statistiken (${sortedUsedPlayers.length})`}
          onClick={() => setActiveTab("statistiken")}
        />
      </div>

      <div className={activeTab === "aufstellung" ? "" : "hidden"}>
        <FormationPitch
          canManageMatch={canManageMatch}
          formationSlots={formationSlots}
          getStatus={getStatus}
          matchId={matchId}
          onSetStatus={setStatus}
          onToggleStarter={toggleStarter}
          playerById={playerById}
          players={players}
          tacticFormation={tacticFormation}
          tacticName={tacticName}
        />
      </div>

      <div className={activeTab === "statistiken" ? "overflow-hidden rounded-lg border border-border bg-surface" : "hidden"}>
        {sortedUsedPlayers.length > 0 ? (
          <>
            <div className={`hidden gap-3 border-b border-border bg-surface-muted px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted lg:grid ${gridCols}`}>
              <SortableHeader label="Spieler" onClick={() => toggleSort("name")} sortDir={sortKey === "name" ? sortDir : null} />
              <span>Status</span>
              <SortableHeader label="Min" onClick={() => toggleSort("minutesPlayed")} sortDir={sortKey === "minutesPlayed" ? sortDir : null} />
              <SortableHeader label="T" onClick={() => toggleSort("goals")} sortDir={sortKey === "goals" ? sortDir : null} />
              <SortableHeader label="V" onClick={() => toggleSort("assists")} sortDir={sortKey === "assists" ? sortDir : null} />
              <SortableHeader label="Gelb" onClick={() => toggleSort("yellowCards")} sortDir={sortKey === "yellowCards" ? sortDir : null} />
              <SortableHeader label="Rot" onClick={() => toggleSort("redCards")} sortDir={sortKey === "redCards" ? sortDir : null} />
              <SortableHeader label="Note" onClick={() => toggleSort("rating")} sortDir={sortKey === "rating" ? sortDir : null} />
            </div>
            <div className="divide-y divide-border">
              {sortedUsedPlayers.map((player) => (
                <PlayerStatRow
                  key={player.id}
                  onRemoveStarter={() => toggleStarter(player.id)}
                  onStatusChange={(status) => setStatus(player.id, status)}
                  player={player}
                  status={getStatus(player.id)}
                />
              ))}
            </div>
          </>
        ) : (
          <p className="p-5 text-sm text-muted">
            Noch niemand aufgestellt. Wechsle zum Tab &quot;Aufstellung&quot; und klicke Spieler im Feld an, um sie als
            Startelf festzulegen.
          </p>
        )}

        {sortedBenchPlayers.length > 0 ? (
          <div className="border-t border-border">
            <p className="bg-surface-muted px-4 py-2 text-xs font-bold uppercase tracking-wide text-muted">
              Kader ohne Einsatz ({sortedBenchPlayers.length})
            </p>
            <div className="divide-y divide-border">
              {sortedBenchPlayers.map((player) => (
                <BenchRow key={player.id} onStatusChange={(status) => setStatus(player.id, status)} player={player} />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TabButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-bold transition ${
        active ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function FormationPitch({
  canManageMatch,
  formationSlots,
  getStatus,
  matchId,
  onSetStatus,
  onToggleStarter,
  playerById,
  players,
  tacticFormation,
  tacticName,
}: {
  canManageMatch: boolean;
  formationSlots: FormationSlot[];
  getStatus: (playerId: string) => string;
  matchId: string;
  onSetStatus: (playerId: string, status: string) => void;
  onToggleStarter: (playerId: string) => void;
  playerById: Map<string, PlayerRow>;
  players: PlayerRow[];
  tacticFormation: string | null;
  tacticName: string | null;
}) {
  const router = useRouter();
  const [assigningSlotId, setAssigningSlotId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const assignedPlayerIds = useMemo(
    () => new Set(formationSlots.map((slot) => slot.playerProfileId).filter((id): id is string => Boolean(id))),
    [formationSlots],
  );

  async function handleAssign(slotId: string, previousPlayerProfileId: string | null, playerProfileId: string) {
    setPending(true);
    const formData = new FormData();
    formData.set("slotId", slotId);
    formData.set("matchId", matchId);
    formData.set("playerProfileId", playerProfileId);

    try {
      await assignMatchLineupSlotPlayer(formData);
      // Assigning a player to a position slot puts them straight into the Startelf - no extra
      // click on the jersey needed. Clearing a slot (or replacing its player) drops whoever
      // used to occupy it back out of the lineup.
      if (previousPlayerProfileId && previousPlayerProfileId !== playerProfileId) {
        onSetStatus(previousPlayerProfileId, "NOT_USED");
      }
      if (playerProfileId) {
        onSetStatus(playerProfileId, "STARTER");
      }
      router.refresh();
    } finally {
      setPending(false);
      setAssigningSlotId(null);
    }
  }

  return (
    <section className="rounded-lg border border-border bg-surface p-5">
      <div className="flex flex-col gap-2 border-b border-border pb-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-primary">Aufstellung</p>
          <h2 className="mt-1 text-xl font-bold text-foreground">{tacticName ?? "Positionsuebersicht"}</h2>
        </div>
        <p className="text-sm text-muted">
          {tacticName
            ? canManageMatch
              ? `Formation ${tacticFormation}. Trikot anklicken setzt/entfernt die Startelf, Positionsbeschriftung anklicken weist einen Spieler zu.`
              : `Formation ${tacticFormation}. Klicke einen Spieler an, um ihn als Startelf zu setzen oder zu entfernen.`
            : "Noch keine Taktik fuer dieses Spiel ausgewaehlt."}
        </p>
      </div>
      {formationSlots.length > 0 ? (
        <div
          className="relative mx-auto mt-5 w-full max-w-[520px] overflow-hidden rounded-lg border border-slate-800 shadow-sm"
          style={{ aspectRatio: "700 / 1000" }}
        >
          <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 700 1000">
            <rect fill="#2f5f3a" height={1000} width={700} x="0" y="0" />
            {[0, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((y) => (
              <rect fill="#33643d" height={50} key={y} width={700} x="0" y={y} />
            ))}
            <rect fill="none" height={980} stroke="#ffffff" strokeWidth={2} width={680} x={10} y={10} />
            <line stroke="#ffffff" strokeWidth={2} x1={10} x2={690} y1={500} y2={500} />
            <circle cx={350} cy={500} fill="none" r={70} stroke="#ffffff" strokeWidth={2} />
            <circle cx={350} cy={500} fill="#ffffff" r={4} />
            <rect fill="none" height={120} stroke="#ffffff" strokeWidth={2} width={300} x={200} y={10} />
            <rect fill="none" height={120} stroke="#ffffff" strokeWidth={2} width={300} x={200} y={870} />
            <path d="M 260 130 A 90 90 0 0 0 440 130" fill="none" stroke="#ffffff" strokeWidth={2} />
            <path d="M 260 870 A 90 90 0 0 1 440 870" fill="none" stroke="#ffffff" strokeWidth={2} />
          </svg>
          {formationSlots.map((slot) => {
            const player = slot.playerProfileId ? playerById.get(slot.playerProfileId) : null;
            const isStarter = player ? getStatus(player.id) === "STARTER" : false;
            const isAssigning = assigningSlotId === slot.id;
            const candidates = players
              .filter((candidate) => candidate.id === slot.playerProfileId || !assignedPlayerIds.has(candidate.id))
              .sort((a, b) => a.name.localeCompare(b.name));

            return (
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2"
                key={slot.id}
                style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
              >
                {isAssigning ? (
                  <select
                    autoFocus
                    className="w-36 rounded-lg border border-primary bg-white px-2 py-1.5 text-xs font-semibold text-slate-900 shadow-lg"
                    defaultValue={slot.playerProfileId ?? ""}
                    disabled={pending}
                    onBlur={() => setAssigningSlotId(null)}
                    onChange={(event) => handleAssign(slot.id, slot.playerProfileId, event.target.value)}
                  >
                    <option value="">Kein Spieler</option>
                    {candidates.map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.jerseyNumber ? `#${candidate.jerseyNumber} ` : ""}
                        {candidate.name}
                      </option>
                    ))}
                  </select>
                ) : player ? (
                  <div className="flex flex-col items-center gap-1">
                    <button className="flex flex-col items-center gap-1" onClick={() => onToggleStarter(player.id)} type="button">
                      <div
                        className={`relative flex h-12 w-14 items-center justify-center rounded-b-lg rounded-t-sm text-lg font-black tabular-nums shadow-md before:absolute before:-left-2 before:top-1 before:size-5 before:rounded-sm after:absolute after:-right-2 after:top-1 after:size-5 after:rounded-sm ${
                          isStarter
                            ? "bg-primary text-white before:bg-primary after:bg-primary"
                            : "border-2 border-dashed border-white/70 bg-white/20 text-white/80 before:bg-white/20 after:bg-white/20"
                        }`}
                      >
                        {player.jerseyNumber ?? "-"}
                      </div>
                      <p className="max-w-24 truncate rounded-full bg-white/90 px-2 py-0.5 text-xs font-bold text-slate-900">
                        {shortPlayerName(player.name)}
                      </p>
                    </button>
                    <button
                      className="rounded-full bg-slate-950/70 px-2 py-0.5 text-[10px] font-bold uppercase text-white hover:bg-slate-950"
                      disabled={!canManageMatch}
                      onClick={() => setAssigningSlotId(slot.id)}
                      title={canManageMatch ? "Spieler fuer diese Position wechseln" : undefined}
                      type="button"
                    >
                      {positionCodeLabel(slot.positionCode)}
                      {player.rating ? ` / ${player.rating.toFixed(1)}` : ""}
                    </button>
                  </div>
                ) : (
                  <button
                    className="flex flex-col items-center gap-1 opacity-70 disabled:cursor-default"
                    disabled={!canManageMatch}
                    onClick={() => setAssigningSlotId(slot.id)}
                    title={canManageMatch ? "Spieler fuer diese Position waehlen" : undefined}
                    type="button"
                  >
                    <div className="flex h-12 w-14 items-center justify-center rounded-b-lg rounded-t-sm border-2 border-dashed border-white/60 text-lg font-black text-white/70">
                      +
                    </div>
                    <p className="rounded-full bg-slate-950/70 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                      {positionCodeLabel(slot.positionCode)}
                    </p>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-5 flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-surface-muted p-8 text-center">
          <LayoutGrid className="size-8 text-muted" aria-hidden="true" />
          <p className="max-w-sm text-sm text-muted">
            Waehle links eine Taktik aus, um die Formation auf dem Feld anzuzeigen. Danach kannst du Spieler den
            Positionen zuweisen - sie zaehlen dann automatisch als Startelf.
          </p>
          {canManageMatch ? (
            <a
              className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-bold text-white"
              href="#taktik-form"
            >
              Taktik auswaehlen
            </a>
          ) : null}
        </div>
      )}
    </section>
  );
}

function PlayerStatRow({
  onRemoveStarter,
  onStatusChange,
  player,
  status,
}: {
  onRemoveStarter: () => void;
  onStatusChange: (status: string) => void;
  player: PlayerRow;
  status: string;
}) {
  const isStarter = status === "STARTER";

  return (
    <div className={`grid gap-3 p-4 transition hover:bg-surface-muted ${gridCols} lg:items-center`}>
      <input name="playerProfileId" type="hidden" value={player.id} />
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary">
          {player.jerseyNumber ?? player.initials}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-bold text-foreground">{player.name}</p>
            <CircleDot className="size-3 text-primary" aria-hidden="true" />
            {player.unavailable ? (
              <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">
                Abwesend
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs font-bold uppercase tracking-wide text-muted lg:hidden">{player.position}</p>
        </div>
      </div>
      {isStarter ? (
        <div className="flex items-center gap-2">
          <input name={`lineupStatus-${player.id}`} readOnly type="hidden" value="STARTER" />
          <span className="rounded-lg bg-primary-soft px-2 py-1.5 text-xs font-bold uppercase text-primary">Startelf</span>
          <button
            aria-label="Aus Startelf entfernen"
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg border border-border text-muted transition hover:border-danger-soft hover:text-danger"
            onClick={onRemoveStarter}
            type="button"
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <label className="text-xs font-semibold uppercase text-muted lg:sr-only">
          Status
          <select
            className="mt-1 h-9 w-full rounded-lg border border-border bg-surface px-2 text-sm font-normal text-foreground"
            name={`lineupStatus-${player.id}`}
            onChange={(event) => onStatusChange(event.target.value)}
            value={status}
          >
            <option value="SUBSTITUTE">Einwechslung</option>
            <option value="NOT_USED">Kein Einsatz</option>
          </select>
        </label>
      )}
      <CompactNumber label="Min" max={120} name={`minutesPlayed-${player.id}`} value={player.minutesPlayed} />
      <CompactNumber label="T" name={`goals-${player.id}`} value={player.goals} />
      <CompactNumber label="V" name={`assists-${player.id}`} value={player.assists} />
      <CompactNumber accent={player.yellowCards > 0 ? "yellow" : undefined} label="Gelb" name={`yellowCards-${player.id}`} value={player.yellowCards} />
      <CompactNumber accent={player.redCards > 0 ? "red" : undefined} label="Rot" name={`redCards-${player.id}`} value={player.redCards} />
      <CompactNumber label="Note" max={10} name={`rating-${player.id}`} step="0.1" value={player.rating ?? undefined} />
    </div>
  );
}

function BenchRow({
  onStatusChange,
  player,
}: {
  onStatusChange: (status: string) => void;
  player: PlayerRow;
}) {
  return (
    <div className="flex items-center gap-3 p-3">
      <input name="playerProfileId" type="hidden" value={player.id} />
      <input name={`lineupStatus-${player.id}`} type="hidden" value="NOT_USED" />
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-bold text-muted">
        {player.jerseyNumber ?? player.initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{player.name}</p>
        <p className="text-xs text-muted">{player.position}</p>
      </div>
      {player.unavailable ? (
        <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">
          Abwesend
        </span>
      ) : null}
      <select
        className="h-9 shrink-0 rounded-lg border border-border bg-surface px-2 text-sm text-foreground"
        onChange={(event) => onStatusChange(event.target.value)}
        value="NOT_USED"
      >
        <option value="NOT_USED">Kein Einsatz</option>
        <option value="SUBSTITUTE">Einwechslung</option>
      </select>
    </div>
  );
}

function CompactNumber({
  accent,
  label,
  max,
  name,
  step = "1",
  value,
}: {
  accent?: "red" | "yellow";
  label: string;
  max?: number;
  name: string;
  step?: string;
  value?: number;
}) {
  const accentClass =
    accent === "yellow" ? "border-warning-soft bg-warning-soft" : accent === "red" ? "border-danger-soft bg-danger-soft" : "border-border bg-surface";

  return (
    <label className="text-xs font-semibold uppercase text-muted">
      <span className="lg:sr-only">{label}</span>
      <input
        aria-label={label}
        className={`mt-1 h-9 w-full rounded-lg border px-2 text-sm font-semibold tabular-nums text-foreground ${accentClass}`}
        defaultValue={value ?? ""}
        max={max}
        min={0}
        name={name}
        step={step}
        type="number"
      />
    </label>
  );
}

function shortPlayerName(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);

  if (parts.length <= 1) {
    return name;
  }

  return parts.at(-1) ?? name;
}
