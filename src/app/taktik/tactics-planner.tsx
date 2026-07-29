"use client";

import Link from "next/link";
import { useMemo, useRef, useState, type PointerEvent } from "react";

import { deleteTactic, renameTactic, saveTactic, saveTacticAsNew } from "@/lib/actions";
import {
  createSlotsFromFormation,
  dutyAbbreviation,
  dutyLabel,
  dutyValues,
  formationOptions,
  positionCodeLabel,
  positionCodes,
  positionRoles,
  sliderDefs,
  sliderLevelLabel,
  type DutyValue,
  type PositionCode,
  type TacticPhaseValue,
  type TacticSlotState,
} from "@/lib/tactics";

export type SquadPlayer = { id: string; name: string; jerseyNumber: number | null };

export type SavedTactic = {
  id: string;
  name: string;
  formation: string;
  defenseFormation: string;
  styleValue: number;
  lineValue: number;
  pressingValue: number;
  widthValue: number;
  tempoValue: number;
  slots: { OFFENSE: TacticSlotState[]; DEFENSE: TacticSlotState[] };
  arrows: { phase: TacticPhaseValue; x1: number; y1: number; x2: number; y2: number; sortOrder: number }[];
};

type ArrowState = { x1: number; y1: number; x2: number; y2: number };
type PhaseMap<T> = { OFFENSE: T; DEFENSE: T };

const PITCH_WIDTH = 700;
const PITCH_HEIGHT = 1000;
const phaseLabel: Record<TacticPhaseValue, string> = { OFFENSE: "Offensiv", DEFENSE: "Defensiv" };

function findInitialTactic(savedTactics: SavedTactic[], initialTacticId: string | null) {
  return savedTactics.find((tactic) => tactic.id === initialTacticId) ?? null;
}

function JerseyIcon({ color }: { color: string }) {
  return (
    <svg className="h-11 w-11" viewBox="0 0 48 48">
      <path
        d="M14 4 L4 12 L10 20 L14 16 V44 H34 V16 L38 20 L44 12 L34 4 L28 8 H20 Z"
        fill={color}
        stroke="#111827"
        strokeWidth={1.5}
      />
    </svg>
  );
}

export function TacticsPlanner({
  squad,
  savedTactics,
  initialTacticId,
}: {
  squad: SquadPlayer[];
  savedTactics: SavedTactic[];
  initialTacticId: string | null;
}) {
  const initialTactic = useMemo(() => findInitialTactic(savedTactics, initialTacticId), [savedTactics, initialTacticId]);
  const pitchRef = useRef<HTMLDivElement | null>(null);

  const tacticId = initialTactic?.id ?? null;
  const [name, setName] = useState(initialTactic?.name ?? "Neue Taktik");
  const [formationByPhase, setFormationByPhase] = useState<PhaseMap<string>>({
    OFFENSE: initialTactic?.formation ?? formationOptions[0],
    DEFENSE: initialTactic?.defenseFormation ?? formationOptions[0],
  });
  const [slotsByPhase, setSlotsByPhase] = useState<PhaseMap<TacticSlotState[]>>(() => ({
    OFFENSE: initialTactic?.slots.OFFENSE.length ? initialTactic.slots.OFFENSE : createSlotsFromFormation(formationOptions[0]),
    DEFENSE: initialTactic?.slots.DEFENSE.length ? initialTactic.slots.DEFENSE : createSlotsFromFormation(formationOptions[0]),
  }));
  const [sliders, setSliders] = useState({
    styleValue: initialTactic?.styleValue ?? 2,
    lineValue: initialTactic?.lineValue ?? 2,
    pressingValue: initialTactic?.pressingValue ?? 2,
    widthValue: initialTactic?.widthValue ?? 2,
    tempoValue: initialTactic?.tempoValue ?? 2,
  });
  const [arrows, setArrows] = useState<PhaseMap<ArrowState[]>>(() => ({
    OFFENSE: (initialTactic?.arrows ?? [])
      .filter((arrow) => arrow.phase === "OFFENSE")
      .map((arrow) => ({ x1: arrow.x1, y1: arrow.y1, x2: arrow.x2, y2: arrow.y2 })),
    DEFENSE: (initialTactic?.arrows ?? [])
      .filter((arrow) => arrow.phase === "DEFENSE")
      .map((arrow) => ({ x1: arrow.x1, y1: arrow.y1, x2: arrow.x2, y2: arrow.y2 })),
  }));

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<TacticPhaseValue>("OFFENSE");
  const [drawMode, setDrawMode] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);

  const activeSlots = slotsByPhase[activeTab];
  const selectedSlot = selectedIndex !== null ? activeSlots[selectedIndex] : null;

  const slotsData = useMemo(
    () =>
      JSON.stringify([
        ...slotsByPhase.OFFENSE.map((slot, index) => ({ ...slot, phase: "OFFENSE", sortOrder: index })),
        ...slotsByPhase.DEFENSE.map((slot, index) => ({ ...slot, phase: "DEFENSE", sortOrder: index })),
      ]),
    [slotsByPhase],
  );
  const arrowsData = useMemo(
    () =>
      JSON.stringify([
        ...arrows.OFFENSE.map((arrow, index) => ({ ...arrow, phase: "OFFENSE", sortOrder: index })),
        ...arrows.DEFENSE.map((arrow, index) => ({ ...arrow, phase: "DEFENSE", sortOrder: index })),
      ]),
    [arrows],
  );

  function updateActiveSlots(updater: (slots: TacticSlotState[]) => TacticSlotState[]) {
    setSlotsByPhase((current) => ({ ...current, [activeTab]: updater(current[activeTab]) }));
  }

  function toPitchPercent(clientX: number, clientY: number) {
    const rect = pitchRef.current?.getBoundingClientRect();
    if (!rect) {
      return { x: 0, y: 0 };
    }

    const x = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100));

    return { x, y };
  }

  function switchTab(tab: TacticPhaseValue) {
    setActiveTab(tab);
    setSelectedIndex(null);
    setDrawStart(null);
  }

  function handleFormationChange(nextFormation: string) {
    setFormationByPhase((current) => ({ ...current, [activeTab]: nextFormation }));
    updateActiveSlots(() => createSlotsFromFormation(nextFormation));
    setSelectedIndex(null);
  }

  function handleSlotPointerDown(index: number, event: PointerEvent<HTMLDivElement>) {
    event.stopPropagation();
    setDraggingIndex(index);
    setSelectedIndex(index);
  }

  function handlePitchPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (draggingIndex === null) {
      return;
    }

    const point = toPitchPercent(event.clientX, event.clientY);
    updateActiveSlots((currentSlots) =>
      currentSlots.map((slot, index) => (index === draggingIndex ? { ...slot, x: point.x, y: point.y } : slot)),
    );
  }

  function handlePitchPointerUp() {
    setDraggingIndex(null);
  }

  function handlePitchPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!drawMode) {
      setSelectedIndex(null);
      return;
    }

    const point = toPitchPercent(event.clientX, event.clientY);

    if (!drawStart) {
      setDrawStart(point);
      return;
    }

    const start = drawStart;
    setArrows((current) => ({
      ...current,
      [activeTab]: [...current[activeTab], { x1: start.x, y1: start.y, x2: point.x, y2: point.y }],
    }));
    setDrawStart(null);
  }

  function updateSelectedSlot(patch: Partial<TacticSlotState>) {
    if (selectedIndex === null) {
      return;
    }

    updateActiveSlots((currentSlots) =>
      currentSlots.map((slot, index) => (index === selectedIndex ? { ...slot, ...patch } : slot)),
    );
  }

  function handlePositionCodeChange(nextCode: PositionCode) {
    updateSelectedSlot({ positionCode: nextCode, role: positionRoles[nextCode][0] });
  }

  async function handleRename(tactic: SavedTactic) {
    const nextName = window.prompt("Neuer Name", tactic.name);

    if (!nextName) {
      return;
    }

    const formData = new FormData();
    formData.set("tacticId", tactic.id);
    formData.set("name", nextName);
    await renameTactic(formData);
  }

  async function handleDelete(tactic: SavedTactic) {
    if (!window.confirm(`"${tactic.name}" wirklich loeschen?`)) {
      return;
    }

    const formData = new FormData();
    formData.set("tacticId", tactic.id);
    await deleteTactic(formData);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[260px_1fr_300px]">
      <aside className="space-y-4">
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
            Formation ({phaseLabel[activeTab]})
          </p>
          <select
            className="mt-3 h-10 w-full rounded-xl border border-border px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
            onChange={(event) => handleFormationChange(event.target.value)}
            value={formationByPhase[activeTab]}
          >
            {formationOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs leading-5 text-muted">
            Vorlage laden, danach Spieler frei auf dem Feld verschieben. Offensiv- und Defensiv-Phase haben eigene
            Formationen.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Gespeicherte Taktiken</p>
          <div className="mt-3 space-y-1.5">
            {savedTactics.length > 0 ? (
              savedTactics.map((tactic) => (
                <div
                  className={`flex items-center justify-between gap-2 rounded-xl border p-2 transition ${
                    tactic.id === tacticId ? "border-primary bg-primary-soft" : "border-border bg-surface hover:border-primary"
                  }`}
                  key={tactic.id}
                >
                  <Link className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground" href={`/taktik?tacticId=${tactic.id}`}>
                    {tactic.name}
                  </Link>
                  <div className="flex shrink-0 gap-1">
                    <button
                      className="rounded-lg border border-border px-2 py-1 text-xs font-semibold text-muted hover:border-primary"
                      onClick={() => handleRename(tactic)}
                      type="button"
                    >
                      Umbenennen
                    </button>
                    <button
                      className="rounded-lg border border-danger-soft px-2 py-1 text-xs font-semibold text-danger hover:border-danger"
                      onClick={() => handleDelete(tactic)}
                      type="button"
                    >
                      Loeschen
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted">Noch keine Taktik gespeichert.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Mannschaftstaktik</p>
          <div className="mt-3 space-y-4">
            {sliderDefs.map((def) => (
              <div key={def.key}>
                <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                  <span>{def.label}</span>
                  <span className="text-primary">{sliderLevelLabel(sliders[def.key])}</span>
                </div>
                <input
                  className="mt-1.5 w-full accent-primary"
                  max={4}
                  min={0}
                  onChange={(event) =>
                    setSliders((current) => ({ ...current, [def.key]: Number(event.target.value) }))
                  }
                  type="range"
                  value={sliders[def.key]}
                />
                <div className="flex justify-between text-[10px] text-muted">
                  <span>{def.lowLabel}</span>
                  <span>{def.highLabel}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <div className="flex gap-1">
            <button
              className={`rounded-t-lg border border-b-0 px-3 py-1.5 text-sm font-semibold transition ${
                activeTab === "OFFENSE" ? "border-primary bg-primary-soft text-primary" : "border-border text-muted"
              }`}
              onClick={() => switchTab("OFFENSE")}
              type="button"
            >
              Offensiv-Phase
            </button>
            <button
              className={`rounded-t-lg border border-b-0 px-3 py-1.5 text-sm font-semibold transition ${
                activeTab === "DEFENSE" ? "border-primary bg-primary-soft text-primary" : "border-border text-muted"
              }`}
              onClick={() => switchTab("DEFENSE")}
              type="button"
            >
              Defensiv-Phase
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className={`rounded-xl border px-4 py-2 text-sm font-bold transition ${
                drawMode ? "border-primary bg-primary-soft text-primary" : "border-border text-foreground"
              }`}
              onClick={() => {
                setDrawMode((current) => !current);
                setDrawStart(null);
              }}
              type="button"
            >
              {drawMode ? "Zeichnen beenden" : "Laufweg zeichnen"}
            </button>
            <button
              className="rounded-xl border border-border px-4 py-2 text-sm font-bold text-foreground"
              onClick={() => setArrows((current) => ({ ...current, [activeTab]: [] }))}
              type="button"
            >
              Laufwege leeren
            </button>
          </div>
        </div>

        <p className="text-sm text-muted">
          Spieler ziehen, um die Formation frei anzupassen. Auf eine leere Feldstelle klicken, um die Auswahl
          aufzuheben.
          {drawMode ? " Start- und Endpunkt fuer den Laufweg anklicken." : ""}
        </p>

        <div
          className="relative overflow-hidden rounded-2xl border border-border shadow-sm"
          onPointerDown={handlePitchPointerDown}
          onPointerLeave={handlePitchPointerUp}
          onPointerMove={handlePitchPointerMove}
          onPointerUp={handlePitchPointerUp}
          ref={pitchRef}
          style={{ aspectRatio: `${PITCH_WIDTH} / ${PITCH_HEIGHT}`, cursor: drawMode ? "crosshair" : draggingIndex !== null ? "grabbing" : "default" }}
        >
          <svg
            className="absolute inset-0 h-full w-full"
            preserveAspectRatio="none"
            viewBox={`0 0 ${PITCH_WIDTH} ${PITCH_HEIGHT}`}
          >
            <rect fill="#2f5f3a" height={PITCH_HEIGHT} width={PITCH_WIDTH} x="0" y="0" />
            {[0, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((y) => (
              <rect fill="#33643d" height={50} key={y} width={PITCH_WIDTH} x="0" y={y} />
            ))}
            <rect fill="none" height={980} stroke="#ffffff" strokeWidth={2} width={680} x={10} y={10} />
            <line stroke="#ffffff" strokeWidth={2} x1={10} x2={690} y1={500} y2={500} />
            <circle cx={350} cy={500} fill="none" r={70} stroke="#ffffff" strokeWidth={2} />
            <circle cx={350} cy={500} fill="#ffffff" r={4} />
            <rect fill="none" height={120} stroke="#ffffff" strokeWidth={2} width={300} x={200} y={10} />
            <rect fill="none" height={120} stroke="#ffffff" strokeWidth={2} width={300} x={200} y={870} />
            <path d="M 260 130 A 90 90 0 0 0 440 130" fill="none" stroke="#ffffff" strokeWidth={2} />
            <path d="M 260 870 A 90 90 0 0 1 440 870" fill="none" stroke="#ffffff" strokeWidth={2} />
            <defs>
              <marker id="tactics-arrowhead" markerHeight={9} markerWidth={9} orient="auto" refX={5} refY={3}>
                <path d="M0,0 L6,3 L0,6 Z" fill="#f4c453" />
              </marker>
            </defs>
            {arrows[activeTab].map((arrow, index) => (
              <line
                key={index}
                markerEnd="url(#tactics-arrowhead)"
                stroke="#f4c453"
                strokeWidth={4}
                x1={(arrow.x1 / 100) * PITCH_WIDTH}
                x2={(arrow.x2 / 100) * PITCH_WIDTH}
                y1={(arrow.y1 / 100) * PITCH_HEIGHT}
                y2={(arrow.y2 / 100) * PITCH_HEIGHT}
              />
            ))}
            {drawStart ? (
              <circle cx={(drawStart.x / 100) * PITCH_WIDTH} cy={(drawStart.y / 100) * PITCH_HEIGHT} fill="#f4c453" r={6} />
            ) : null}
          </svg>

          {activeSlots.map((slot, index) => {
            const isSelected = index === selectedIndex;
            const player = squad.find((candidate) => candidate.id === slot.playerProfileId);
            const jerseyColor = slot.positionCode === "TW" ? "#7c3aed" : "#dc2626";

            return (
              <div
                className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
                key={index}
                onPointerDown={(event) => handleSlotPointerDown(index, event)}
                style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
              >
                <div
                  className={`relative flex size-11 cursor-grab touch-none select-none items-center justify-center rounded-lg ${
                    isSelected ? "ring-4 ring-blue-400" : ""
                  }`}
                >
                  <JerseyIcon color={jerseyColor} />
                  <span className="absolute inset-0 flex items-center justify-center pt-1.5 text-sm font-bold text-white">
                    {player?.jerseyNumber ?? ""}
                  </span>
                </div>
                <div className="mt-1 min-w-16 max-w-24 rounded-md bg-slate-900/90 px-1.5 py-1 text-center leading-tight">
                  <p className="text-xs font-bold text-white">
                    {slot.positionCode} - {dutyAbbreviation(slot.duty)}
                  </p>
                  <p className="truncate text-xs text-slate-200">{player?.name ?? "-"}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <aside className="space-y-4">
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          {selectedSlot ? (
            <>
              <p className="text-sm font-bold text-foreground">
                {positionCodeLabel(selectedSlot.positionCode)} - Position {(selectedIndex ?? 0) + 1}
              </p>
              <p className="mt-1 text-xs text-muted">Position, Rolle und Spieler fuer diesen Platz festlegen.</p>

              <label className="mt-4 block text-xs font-semibold uppercase text-muted">
                Position
                <select
                  className="mt-1.5 h-10 w-full rounded-xl border border-border px-3 text-sm font-normal text-foreground"
                  onChange={(event) => handlePositionCodeChange(event.target.value as PositionCode)}
                  value={selectedSlot.positionCode}
                >
                  {positionCodes.map((code) => (
                    <option key={code} value={code}>
                      {positionCodeLabel(code)} ({code})
                    </option>
                  ))}
                </select>
              </label>

              <label className="mt-4 block text-xs font-semibold uppercase text-muted">
                Rolle
                <select
                  className="mt-1.5 h-10 w-full rounded-xl border border-border px-3 text-sm font-normal text-foreground"
                  onChange={(event) => updateSelectedSlot({ role: event.target.value })}
                  value={selectedSlot.role}
                >
                  {positionRoles[selectedSlot.positionCode].map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>

              <label className="mt-4 block text-xs font-semibold uppercase text-muted">
                Anweisung
                <select
                  className="mt-1.5 h-10 w-full rounded-xl border border-border px-3 text-sm font-normal text-foreground"
                  onChange={(event) => updateSelectedSlot({ duty: event.target.value as DutyValue })}
                  value={selectedSlot.duty}
                >
                  {dutyValues.map((duty) => (
                    <option key={duty} value={duty}>
                      {dutyLabel(duty)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="mt-4 block text-xs font-semibold uppercase text-muted">
                Spieler
                <select
                  className="mt-1.5 h-10 w-full rounded-xl border border-border px-3 text-sm font-normal text-foreground"
                  onChange={(event) => updateSelectedSlot({ playerProfileId: event.target.value || null })}
                  value={selectedSlot.playerProfileId ?? ""}
                >
                  <option value="">Platzhalter (kein Spieler)</option>
                  {squad.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.name}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-foreground">Positionsdetails</p>
              <p className="mt-1 text-xs text-muted">
                Auf eine Position im Feld klicken, um Position, Rolle, Anweisung und Spieler zuzuweisen.
              </p>
            </>
          )}
        </div>
      </aside>

      <form action={saveTactic} className="xl:col-span-3 flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <input name="tacticId" type="hidden" value={tacticId ?? ""} />
        <input name="formation" type="hidden" value={formationByPhase.OFFENSE} />
        <input name="defenseFormation" type="hidden" value={formationByPhase.DEFENSE} />
        <input name="styleValue" type="hidden" value={sliders.styleValue} />
        <input name="lineValue" type="hidden" value={sliders.lineValue} />
        <input name="pressingValue" type="hidden" value={sliders.pressingValue} />
        <input name="widthValue" type="hidden" value={sliders.widthValue} />
        <input name="tempoValue" type="hidden" value={sliders.tempoValue} />
        <input name="slotsData" type="hidden" value={slotsData} />
        <input name="arrowsData" type="hidden" value={arrowsData} />
        <label className="min-w-56 flex-1 text-xs font-semibold uppercase text-muted">
          Taktikname
          <input
            className="mt-1.5 h-10 w-full rounded-xl border border-border px-3 text-sm font-normal text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
            name="name"
            onChange={(event) => setName(event.target.value)}
            value={name}
          />
        </label>
        <button
          className="h-10 rounded-xl border border-border px-4 text-sm font-bold text-foreground"
          formAction={saveTacticAsNew}
          type="submit"
        >
          Als neue Taktik speichern
        </button>
        <button className="h-10 rounded-xl bg-primary px-4 text-sm font-bold text-white" type="submit">
          Speichern
        </button>
      </form>
    </div>
  );
}
