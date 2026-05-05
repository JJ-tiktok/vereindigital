"use client";

import { useMemo, useRef, useState, type PointerEvent, type ReactNode } from "react";

import { updateTrainingExerciseSketch } from "@/lib/actions";

type PitchType = "FULL_FIELD" | "HALF_FIELD" | "PENALTY_AREA" | "SMALL_FIELD" | "FREE_AREA";

type PointTool =
  | "PLAYER_BLUE"
  | "PLAYER_RED"
  | "PLAYER_YELLOW"
  | "GOALKEEPER"
  | "BALL"
  | "CONE"
  | "PYLON"
  | "DUMMY"
  | "GOAL"
  | "MINI_GOAL"
  | "TACTIC_CIRCLE"
  | "TACTIC_TRIANGLE"
  | "TEXT";

type PathTool = "ARROW" | "LINE" | "DRIBBLE" | "CURVED_ARROW";
type AreaTool = "ZONE_RECT" | "ZONE_CIRCLE";
type Tool = PointTool | PathTool | AreaTool | "SELECT";

type BaseElement = {
  id: string;
  type: Tool;
};

type PointElement = BaseElement & {
  type: PointTool;
  x: number;
  y: number;
  label?: string;
};

type PathElement = BaseElement & {
  type: PathTool;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

type AreaElement = BaseElement & {
  type: AreaTool;
  x: number;
  y: number;
  width: number;
  height: number;
};

type SketchElement = PointElement | PathElement | AreaElement;

type SketchData = {
  pitch: string;
  elements: unknown[];
};

type DragState =
  | {
      id: string;
      kind: "point";
      offsetX: number;
      offsetY: number;
    }
  | {
      id: string;
      kind: "path";
      startX: number;
      startY: number;
      original: PathElement;
    }
  | {
      id: string;
      kind: "area";
      offsetX: number;
      offsetY: number;
    };

type SketchEditorProps = {
  exerciseId: string;
  sketchId: string | null;
  initialTitle: string;
  initialPitch: string;
  initialSketch: SketchData | null;
};

const pitchOptions: Array<{ value: PitchType; label: string; description: string }> = [
  { value: "FULL_FIELD", label: "Ganzes Feld", description: "Kompletter Platz im Querformat" },
  { value: "HALF_FIELD", label: "Halbes Feld", description: "Eine Spielhaelfte fuer Spielformen" },
  { value: "PENALTY_AREA", label: "Strafraum", description: "16er, Torraum und Abschlusszone" },
  { value: "SMALL_FIELD", label: "Kleinfeld", description: "Kompakte Spielfeldform" },
  { value: "FREE_AREA", label: "Freie Flaeche", description: "Raster fuer freie Organisationsformen" },
];

const toolGroups: Array<{
  title: string;
  tools: Array<{ value: Tool; label: string; hint: string }>;
}> = [
  {
    title: "Bearbeiten",
    tools: [{ value: "SELECT", label: "Auswahl", hint: "Elemente anklicken und verschieben" }],
  },
  {
    title: "Spieler",
    tools: [
      { value: "PLAYER_BLUE", label: "Spieler blau", hint: "Feldspieler blau platzieren" },
      { value: "PLAYER_RED", label: "Spieler rot", hint: "Gegenspieler rot platzieren" },
      { value: "PLAYER_YELLOW", label: "Spieler gelb", hint: "Neutraler Spieler platzieren" },
      { value: "GOALKEEPER", label: "Torhueter", hint: "Torhueter platzieren" },
    ],
  },
  {
    title: "Material",
    tools: [
      { value: "BALL", label: "Ball", hint: "Ball platzieren" },
      { value: "CONE", label: "Huetchen", hint: "Flaches Huetchen platzieren" },
      { value: "PYLON", label: "Pylon", hint: "Pylon platzieren" },
      { value: "DUMMY", label: "Dummy", hint: "Trainingsdummy platzieren" },
      { value: "GOAL", label: "Tor", hint: "Grosses Tor platzieren" },
      { value: "MINI_GOAL", label: "Minitor", hint: "Minitor platzieren" },
    ],
  },
  {
    title: "Taktik",
    tools: [
      { value: "TACTIC_CIRCLE", label: "Kreis", hint: "Taktikmarker Kreis" },
      { value: "TACTIC_TRIANGLE", label: "Dreieck", hint: "Taktikmarker Dreieck" },
      { value: "ZONE_RECT", label: "Zone", hint: "Rechteckige Zone markieren" },
      { value: "ZONE_CIRCLE", label: "Kreiszone", hint: "Runde Zone markieren" },
    ],
  },
  {
    title: "Ablauf",
    tools: [
      { value: "ARROW", label: "Pfeil", hint: "Zwei Punkte fuer Lauf-/Passweg setzen" },
      { value: "LINE", label: "Linie", hint: "Gerade Verbindung zeichnen" },
      { value: "DRIBBLE", label: "Dribbling", hint: "Gewellte Linie zeichnen" },
      { value: "CURVED_ARROW", label: "Bogen", hint: "Gebogenen Laufweg zeichnen" },
      { value: "TEXT", label: "Text", hint: "Kurzen Hinweis platzieren" },
    ],
  },
];

const pointToolTypes = new Set<Tool>([
  "PLAYER_BLUE",
  "PLAYER_RED",
  "PLAYER_YELLOW",
  "GOALKEEPER",
  "BALL",
  "CONE",
  "PYLON",
  "DUMMY",
  "GOAL",
  "MINI_GOAL",
  "TACTIC_CIRCLE",
  "TACTIC_TRIANGLE",
  "TEXT",
]);
const pathToolTypes = new Set<Tool>(["ARROW", "LINE", "DRIBBLE", "CURVED_ARROW"]);
const areaToolTypes = new Set<Tool>(["ZONE_RECT", "ZONE_CIRCLE"]);

export function SketchEditor({ exerciseId, sketchId, initialTitle, initialPitch, initialSketch }: SketchEditorProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [pitch, setPitch] = useState<PitchType>(() => normalizePitch(initialSketch?.pitch ?? initialPitch));
  const [elements, setElements] = useState<SketchElement[]>(() => normalizeElements(initialSketch?.elements ?? []));
  const [tool, setTool] = useState<Tool>("SELECT");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [pathStart, setPathStart] = useState<{ x: number; y: number } | null>(null);
  const [, setHistory] = useState<SketchElement[][]>([]);

  const sketchData = useMemo(
    () =>
      JSON.stringify({
        pitch,
        elements,
      }),
    [elements, pitch],
  );
  const selectedElement = selectedId ? elements.find((element) => element.id === selectedId) : null;

  function pushHistory(currentElements = elements) {
    setHistory((currentHistory) => [...currentHistory.slice(-24), currentElements]);
  }

  function updateElements(nextElements: SketchElement[]) {
    setElements(nextElements);
  }

  function addElement(element: SketchElement) {
    pushHistory();
    setElements((currentElements) => [...currentElements, element]);
    setSelectedId(element.id);
  }

  function handleCanvasPointerDown(event: PointerEvent<SVGSVGElement>) {
    const point = getSvgPoint(event);
    if (!point) {
      return;
    }

    if (tool === "SELECT") {
      setSelectedId(null);
      return;
    }

    if (pathToolTypes.has(tool)) {
      if (!pathStart) {
        setPathStart(point);
        return;
      }

      addElement({
        id: createId(),
        type: tool as PathTool,
        x1: pathStart.x,
        y1: pathStart.y,
        x2: point.x,
        y2: point.y,
      });
      setPathStart(null);
      return;
    }

    if (areaToolTypes.has(tool)) {
      addElement({
        id: createId(),
        type: tool as AreaTool,
        x: clamp(point.x - 10, 2, 78),
        y: clamp(point.y - 7, 2, 84),
        width: tool === "ZONE_RECT" ? 20 : 16,
        height: tool === "ZONE_RECT" ? 14 : 16,
      });
      return;
    }

    if (pointToolTypes.has(tool)) {
      const label = tool === "TEXT" ? window.prompt("Text fuer die Skizze", "Coachingpunkt")?.trim() : undefined;
      if (tool === "TEXT" && !label) {
        return;
      }

      addElement({
        id: createId(),
        type: tool as PointTool,
        x: point.x,
        y: point.y,
        label: tool === "TEXT" ? label : defaultLabel(tool),
      });
    }
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    if (!dragState) {
      return;
    }

    const point = getSvgPoint(event);
    if (!point) {
      return;
    }

    updateElements(
      elements.map((element) => {
        if (element.id !== dragState.id) {
          return element;
        }

        if (dragState.kind === "point" && isPointElement(element)) {
          return {
            ...element,
            x: clamp(point.x - dragState.offsetX, 1, 99),
            y: clamp(point.y - dragState.offsetY, 1, 99),
          };
        }

        if (dragState.kind === "path" && isPathElement(element)) {
          const dx = point.x - dragState.startX;
          const dy = point.y - dragState.startY;

          return {
            ...element,
            x1: clamp(dragState.original.x1 + dx, 0, 100),
            y1: clamp(dragState.original.y1 + dy, 0, 100),
            x2: clamp(dragState.original.x2 + dx, 0, 100),
            y2: clamp(dragState.original.y2 + dy, 0, 100),
          };
        }

        if (dragState.kind === "area" && isAreaElement(element)) {
          return {
            ...element,
            x: clamp(point.x - dragState.offsetX, 0, 100 - element.width),
            y: clamp(point.y - dragState.offsetY, 0, 100 - element.height),
          };
        }

        return element;
      }),
    );
  }

  function handlePointerUp() {
    setDragState(null);
  }

  function handleElementPointerDown(element: SketchElement, event: PointerEvent<SVGGElement>) {
    event.stopPropagation();
    const point = getSvgPoint(event);
    if (!point) {
      return;
    }

    setSelectedId(element.id);
    pushHistory();

    if (isPointElement(element)) {
      setDragState({
        id: element.id,
        kind: "point",
        offsetX: point.x - element.x,
        offsetY: point.y - element.y,
      });
      return;
    }

    if (isPathElement(element)) {
      setDragState({
        id: element.id,
        kind: "path",
        startX: point.x,
        startY: point.y,
        original: element,
      });
      return;
    }

    setDragState({
      id: element.id,
      kind: "area",
      offsetX: point.x - element.x,
      offsetY: point.y - element.y,
    });
  }

  function getSvgPoint(event: PointerEvent<SVGSVGElement | SVGGElement>) {
    const svg = svgRef.current;
    if (!svg) {
      return null;
    }

    const rect = svg.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    return {
      x: clamp(x, 0, 100),
      y: clamp(y, 0, 100),
    };
  }

  function undo() {
    setHistory((currentHistory) => {
      const previous = currentHistory.at(-1);
      if (!previous) {
        return currentHistory;
      }

      setElements(previous);
      setSelectedId(null);
      return currentHistory.slice(0, -1);
    });
  }

  function deleteSelected() {
    if (!selectedId) {
      return;
    }

    pushHistory();
    setElements((currentElements) => currentElements.filter((element) => element.id !== selectedId));
    setSelectedId(null);
  }

  function duplicateSelected() {
    if (!selectedElement) {
      return;
    }

    const duplicate = duplicateElement(selectedElement);
    addElement(duplicate);
  }

  function editSelectedText() {
    if (!selectedElement || !isPointElement(selectedElement)) {
      return;
    }

    const label = window.prompt("Label bearbeiten", selectedElement.label ?? "")?.trim();
    if (!label) {
      return;
    }

    pushHistory();
    setElements((currentElements) =>
      currentElements.map((element) => (element.id === selectedElement.id ? { ...element, label } : element)),
    );
  }

  function clearSketch() {
    if (elements.length === 0) {
      return;
    }

    pushHistory();
    setElements([]);
    setSelectedId(null);
    setPathStart(null);
  }

  async function downloadSketchImage() {
    const svg = svgRef.current;
    if (!svg) {
      return;
    }

    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", "1600");
    clone.setAttribute("height", "1200");
    const svgText = new XMLSerializer().serializeToString(clone);
    const svgBlob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    try {
      const image = new Image();
      image.decoding = "async";
      const loaded = new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = reject;
      });
      image.src = url;
      await loaded;

      const canvas = document.createElement("canvas");
      canvas.width = 1600;
      canvas.height = 1200;
      const context = canvas.getContext("2d");
      if (!context) {
        return;
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const pngUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `training-skizze-${sketchId ?? exerciseId}.png`;
      link.href = pngUrl;
      link.click();
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[280px_1fr]">
      <aside className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-700">Feldvorlage</p>
          <div className="mt-3 grid gap-2">
            {pitchOptions.map((option) => (
              <button
                className={`rounded-xl border p-3 text-left transition ${
                  pitch === option.value
                    ? "border-blue-500 bg-blue-50 text-blue-950"
                    : "border-slate-200 bg-white text-slate-700 hover:border-blue-300"
                }`}
                key={option.value}
                onClick={() => {
                  setPitch(option.value);
                  setPathStart(null);
                }}
                type="button"
              >
                <span className="block text-sm font-bold">{option.label}</span>
                <span className="mt-1 block text-xs text-slate-500">{option.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {toolGroups.map((group) => (
            <div key={group.title}>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{group.title}</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {group.tools.map((item) => (
                  <button
                    className={`min-h-12 rounded-xl border px-3 py-2 text-left text-xs font-semibold transition ${
                      tool === item.value
                        ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-300 hover:bg-white"
                    }`}
                    key={item.value}
                    onClick={() => {
                      setTool(item.value);
                      setPathStart(null);
                    }}
                    title={item.hint}
                    type="button"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </aside>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <p className="text-sm font-bold text-slate-950">Trainingsgrafik</p>
            <p className="text-sm text-slate-500">
              {pathStart
                ? "Zweiten Punkt setzen, um das Element abzuschliessen."
                : selectedElement
                  ? `Ausgewaehlt: ${elementLabel(selectedElement.type)}`
                  : "Werkzeug waehlen, ins Feld klicken und Elemente verschieben."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700" onClick={undo} type="button">
              Rueckgaengig
            </button>
            <button
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-40"
              disabled={!selectedElement}
              onClick={duplicateSelected}
              type="button"
            >
              Duplizieren
            </button>
            <button
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-40"
              disabled={!selectedElement || !isPointElement(selectedElement)}
              onClick={editSelectedText}
              type="button"
            >
              Label
            </button>
            <button
              className="rounded-xl border border-red-200 px-4 py-2 text-sm font-bold text-red-700 disabled:opacity-40"
              disabled={!selectedElement}
              onClick={deleteSelected}
              type="button"
            >
              Loeschen
            </button>
            <button className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700" onClick={clearSketch} type="button">
              Leeren
            </button>
            <button className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700" onClick={downloadSketchImage} type="button">
              Bild exportieren
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm">
          <svg
            aria-label="Trainingsskizze Editor"
            className="block aspect-[4/3] w-full touch-none bg-slate-100"
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            ref={svgRef}
            role="img"
            viewBox="0 0 100 100"
          >
            <defs>
              <marker id="sketch-arrow" markerHeight="4" markerWidth="4" orient="auto" refX="3" refY="2" viewBox="0 0 4 4">
                <path d="M0,0 L4,2 L0,4 Z" fill="#0f172a" />
              </marker>
              <marker id="sketch-blue-arrow" markerHeight="4" markerWidth="4" orient="auto" refX="3" refY="2" viewBox="0 0 4 4">
                <path d="M0,0 L4,2 L0,4 Z" fill="#0b63ce" />
              </marker>
              <pattern height="8" id="grid-pattern" patternUnits="userSpaceOnUse" width="8">
                <path d="M 8 0 L 0 0 0 8" fill="none" stroke="#cbd5e1" strokeWidth="0.2" />
              </pattern>
            </defs>

            <PitchTemplate pitch={pitch} />
            {pathStart ? <circle cx={pathStart.x} cy={pathStart.y} fill="#0b63ce" r="1.2" /> : null}
            {elements.map((element) => (
              <SketchElementView
                element={element}
                key={element.id}
                onPointerDown={(event) => handleElementPointerDown(element, event)}
                selected={element.id === selectedId}
              />
            ))}
          </svg>
        </div>

        <form action={updateTrainingExerciseSketch} className="flex flex-wrap justify-end gap-3">
          <input name="exerciseId" type="hidden" value={exerciseId} />
          <input name="sketchId" type="hidden" value={sketchId ?? ""} />
          <input name="pitchType" type="hidden" value={pitch} />
          <input name="sketchData" type="hidden" value={sketchData} />
          <label className="mr-auto w-full sm:max-w-xs">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Skizzentitel</span>
            <input
              className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              defaultValue={initialTitle}
              name="title"
              placeholder="z.B. Phase 1: Aufbau"
            />
          </label>
          <button className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700" type="button" onClick={undo}>
            Rueckgaengig
          </button>
          <button className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-700" type="submit">
            Skizze speichern
          </button>
        </form>
      </section>
    </div>
  );
}

function PitchTemplate({ pitch }: { pitch: PitchType }) {
  if (pitch === "FREE_AREA") {
    return (
      <>
        <rect fill="#f8fafc" height="100" width="100" />
        <rect fill="url(#grid-pattern)" height="100" width="100" />
        <rect fill="none" height="86" rx="2" stroke="#94a3b8" strokeDasharray="2 2" strokeWidth="0.5" width="88" x="6" y="7" />
      </>
    );
  }

  if (pitch === "PENALTY_AREA") {
    return (
      <FieldBase>
        <rect fill="none" height="46" stroke="#fff" strokeWidth="0.65" width="72" x="14" y="14" />
        <rect fill="none" height="18" stroke="#fff" strokeWidth="0.65" width="32" x="34" y="14" />
        <rect fill="none" height="6" stroke="#fff" strokeWidth="0.65" width="14" x="43" y="14" />
        <path d="M34 60 A16 16 0 0 0 66 60" fill="none" stroke="#fff" strokeWidth="0.65" />
        <circle cx="50" cy="44" fill="#fff" r="0.55" />
        <rect fill="#fff" height="1.8" width="16" x="42" y="12.2" />
      </FieldBase>
    );
  }

  if (pitch === "HALF_FIELD") {
    return (
      <FieldBase>
        <rect fill="none" height="82" stroke="#fff" strokeWidth="0.65" width="88" x="6" y="9" />
        <line stroke="#fff" strokeWidth="0.65" x1="6" x2="94" y1="91" y2="91" />
        <rect fill="none" height="23" stroke="#fff" strokeWidth="0.65" width="52" x="24" y="9" />
        <rect fill="none" height="10" stroke="#fff" strokeWidth="0.65" width="24" x="38" y="9" />
        <path d="M37 32 A13 13 0 0 0 63 32" fill="none" stroke="#fff" strokeWidth="0.65" />
        <circle cx="50" cy="50" fill="none" r="8.5" stroke="#fff" strokeWidth="0.65" />
        <circle cx="50" cy="50" fill="#fff" r="0.55" />
        <rect fill="#fff" height="1.8" width="16" x="42" y="7.2" />
      </FieldBase>
    );
  }

  if (pitch === "SMALL_FIELD") {
    return (
      <FieldBase>
        <rect fill="none" height="70" stroke="#fff" strokeWidth="0.65" width="84" x="8" y="15" />
        <line stroke="#fff" strokeWidth="0.65" x1="50" x2="50" y1="15" y2="85" />
        <circle cx="50" cy="50" fill="none" r="7" stroke="#fff" strokeWidth="0.65" />
        <circle cx="50" cy="50" fill="#fff" r="0.55" />
        <rect fill="none" height="18" stroke="#fff" strokeWidth="0.65" width="16" x="8" y="41" />
        <rect fill="none" height="18" stroke="#fff" strokeWidth="0.65" width="16" x="76" y="41" />
        <rect fill="#fff" height="10" width="1.6" x="6.4" y="45" />
        <rect fill="#fff" height="10" width="1.6" x="92" y="45" />
      </FieldBase>
    );
  }

  return (
    <FieldBase>
      <rect fill="none" height="82" stroke="#fff" strokeWidth="0.65" width="88" x="6" y="9" />
      <line stroke="#fff" strokeWidth="0.65" x1="50" x2="50" y1="9" y2="91" />
      <circle cx="50" cy="50" fill="none" r="7.8" stroke="#fff" strokeWidth="0.65" />
      <circle cx="50" cy="50" fill="#fff" r="0.55" />
      <rect fill="none" height="43" stroke="#fff" strokeWidth="0.65" width="16" x="6" y="28.5" />
      <rect fill="none" height="20" stroke="#fff" strokeWidth="0.65" width="6" x="6" y="40" />
      <path d="M22 39 A13 13 0 0 1 22 61" fill="none" stroke="#fff" strokeWidth="0.65" />
      <circle cx="15" cy="50" fill="#fff" r="0.55" />
      <rect fill="none" height="43" stroke="#fff" strokeWidth="0.65" width="16" x="78" y="28.5" />
      <rect fill="none" height="20" stroke="#fff" strokeWidth="0.65" width="6" x="88" y="40" />
      <path d="M78 39 A13 13 0 0 0 78 61" fill="none" stroke="#fff" strokeWidth="0.65" />
      <circle cx="85" cy="50" fill="#fff" r="0.55" />
      <rect fill="#fff" height="10" width="1.6" x="4.4" y="45" />
      <rect fill="#fff" height="10" width="1.6" x="94" y="45" />
    </FieldBase>
  );
}

function FieldBase({ children }: { children: ReactNode }) {
  return (
    <>
      <rect fill="#a8d08d" height="100" width="100" />
      {Array.from({ length: 10 }, (_, index) => (
        <rect fill={index % 2 === 0 ? "#7dbb68" : "#a8d08d"} height="100" key={index} width="10" x={index * 10} />
      ))}
      {children}
    </>
  );
}

function SketchElementView({
  element,
  selected,
  onPointerDown,
}: {
  element: SketchElement;
  selected: boolean;
  onPointerDown: (event: PointerEvent<SVGGElement>) => void;
}) {
  const outline = selected ? <Selection element={element} /> : null;

  if (isPathElement(element)) {
    const path = pathData(element);
    const stroke = element.type === "DRIBBLE" ? "#f97316" : element.type === "LINE" ? "#334155" : "#0f172a";
    const markerEnd = element.type === "LINE" ? undefined : element.type === "DRIBBLE" ? "url(#sketch-blue-arrow)" : "url(#sketch-arrow)";

    return (
      <g className="cursor-move" onPointerDown={onPointerDown}>
        <path d={path} fill="none" stroke="transparent" strokeLinecap="round" strokeWidth="5" />
        <path d={path} fill="none" markerEnd={markerEnd} stroke={stroke} strokeDasharray={element.type === "DRIBBLE" ? "1.3 1" : undefined} strokeLinecap="round" strokeWidth="0.9" />
        {outline}
      </g>
    );
  }

  if (isAreaElement(element)) {
    return (
      <g className="cursor-move" onPointerDown={onPointerDown}>
        {element.type === "ZONE_RECT" ? (
          <rect fill="#0b63ce22" height={element.height} rx="1.4" stroke="#0b63ce" strokeDasharray="1.8 1.3" strokeWidth="0.55" width={element.width} x={element.x} y={element.y} />
        ) : (
          <ellipse
            cx={element.x + element.width / 2}
            cy={element.y + element.height / 2}
            fill="#f9731622"
            rx={element.width / 2}
            ry={element.height / 2}
            stroke="#f97316"
            strokeDasharray="1.8 1.3"
            strokeWidth="0.55"
          />
        )}
        {outline}
      </g>
    );
  }

  return (
    <g className="cursor-move" onPointerDown={onPointerDown} transform={`translate(${element.x} ${element.y})`}>
      <PointSymbol element={element} />
      {outline}
    </g>
  );
}

function PointSymbol({ element }: { element: PointElement }) {
  if (element.type === "BALL") {
    return (
      <g>
        <circle fill="#fff" r="2.3" stroke="#111827" strokeWidth="0.4" />
        <path d="M0 -1.7 1.4 -0.6 0.9 1.1 -0.9 1.1 -1.4 -0.6 Z" fill="#111827" />
      </g>
    );
  }

  if (element.type === "CONE") {
    return (
      <g>
        <ellipse cx="0" cy="1.8" fill="#f97316" rx="2.3" ry="0.8" stroke="#111827" strokeWidth="0.25" />
        <path d="M-1.4 1.4 L0 -2 L1.4 1.4 Z" fill="#fb923c" stroke="#111827" strokeWidth="0.25" />
      </g>
    );
  }

  if (element.type === "PYLON") {
    return (
      <g>
        <path d="M-1.6 2.2 L0 -3 L1.6 2.2 Z" fill="#fb923c" stroke="#111827" strokeWidth="0.25" />
        <rect fill="#f97316" height="0.8" rx="0.2" width="4.2" x="-2.1" y="2" />
      </g>
    );
  }

  if (element.type === "DUMMY") {
    return (
      <g>
        <circle cx="0" cy="-2.3" fill="#f97316" r="1" />
        <path d="M-1.1 -1.3 Q0 -2 1.1 -1.3 L1.6 2.9 L-1.6 2.9 Z" fill="#f97316" stroke="#111827" strokeWidth="0.2" />
      </g>
    );
  }

  if (element.type === "GOAL" || element.type === "MINI_GOAL") {
    const width = element.type === "GOAL" ? 10 : 7;
    const height = element.type === "GOAL" ? 5 : 3.5;

    return (
      <g transform={`translate(${-width / 2} ${-height / 2})`}>
        <rect fill="#f8fafc" height={height} stroke="#334155" strokeWidth="0.45" width={width} />
        <path d={`M1 0 V${height} M${width / 2} 0 V${height} M${width - 1} 0 V${height} M0 ${height / 2} H${width}`} stroke="#cbd5e1" strokeWidth="0.25" />
      </g>
    );
  }

  if (element.type === "TACTIC_CIRCLE") {
    return (
      <g>
        <circle fill="#ef4444" r="3.2" stroke="#111827" strokeWidth="0.35" />
        <path d="M-3.2 0 A3.2 3.2 0 0 1 3.2 0 L-3.2 0 Z" fill="#111827" />
        <text dominantBaseline="middle" fill="#fff" fontSize="3.2" fontWeight="700" textAnchor="middle" y="0.55">
          {element.label ?? "1"}
        </text>
      </g>
    );
  }

  if (element.type === "TACTIC_TRIANGLE") {
    return (
      <g>
        <path d="M0 -4 L3.7 3.2 H-3.7 Z" fill="#0b63ce" stroke="#111827" strokeWidth="0.25" />
        <path d="M0 -4 L1.1 -1.8 H-1.1 Z" fill="#111827" />
        <text dominantBaseline="middle" fill="#fff" fontSize="3.2" fontWeight="700" textAnchor="middle" y="1">
          {element.label ?? "1"}
        </text>
      </g>
    );
  }

  if (element.type === "TEXT") {
    return (
      <g>
        <rect fill="#ffffffe8" height="5.5" rx="1" stroke="#94a3b8" strokeWidth="0.25" width={Math.max(10, (element.label?.length ?? 1) * 2.2)} x="-1" y="-3" />
        <text fill="#0f172a" fontSize="3" fontWeight="700" y="1">
          {element.label}
        </text>
      </g>
    );
  }

  const palette =
    element.type === "PLAYER_RED"
      ? { shirt: "#ef4444", shorts: "#111827" }
      : element.type === "PLAYER_YELLOW"
        ? { shirt: "#facc15", shorts: "#1e293b" }
        : element.type === "GOALKEEPER"
          ? { shirt: "#a855f7", shorts: "#111827" }
          : { shirt: "#0b63ce", shorts: "#ffffff" };

  return (
    <g>
      <circle cx="0" cy="-3.1" fill="#f2c29c" r="1.05" stroke="#111827" strokeWidth="0.18" />
      <path d="M-1.8 -1.6 Q0 -2.5 1.8 -1.6 L1.15 1.4 H-1.15 Z" fill={palette.shirt} stroke="#111827" strokeWidth="0.2" />
      <path d="M-1.1 1.4 H1.1 L0.7 2.8 H-0.7 Z" fill={palette.shorts} stroke="#111827" strokeWidth="0.16" />
      <path d="M-1.4 2.8 L-2.1 4.2 M1.4 2.8 L2.1 4.2 M-1.8 -0.8 L-3.1 0.8 M1.8 -0.8 L3.1 0.8" stroke="#111827" strokeLinecap="round" strokeWidth="0.35" />
      {element.label ? (
        <text dominantBaseline="middle" fill="#fff" fontSize="2" fontWeight="700" textAnchor="middle" y="-0.2">
          {element.label}
        </text>
      ) : null}
    </g>
  );
}

function Selection({ element }: { element: SketchElement }) {
  if (isPointElement(element)) {
    return <circle fill="none" r="5.1" stroke="#0b63ce" strokeDasharray="1 1" strokeWidth="0.35" />;
  }

  if (isPathElement(element)) {
    return (
      <>
        <circle cx={element.x1} cy={element.y1} fill="#fff" r="1.1" stroke="#0b63ce" strokeWidth="0.35" />
        <circle cx={element.x2} cy={element.y2} fill="#fff" r="1.1" stroke="#0b63ce" strokeWidth="0.35" />
      </>
    );
  }

  return (
    <rect
      fill="none"
      height={element.height + 2}
      rx="1"
      stroke="#0b63ce"
      strokeDasharray="1 1"
      strokeWidth="0.35"
      width={element.width + 2}
      x={element.x - 1}
      y={element.y - 1}
    />
  );
}

function pathData(element: PathElement) {
  if (element.type === "CURVED_ARROW") {
    const midX = (element.x1 + element.x2) / 2;
    const midY = (element.y1 + element.y2) / 2 - 10;
    return `M ${element.x1} ${element.y1} Q ${midX} ${midY} ${element.x2} ${element.y2}`;
  }

  if (element.type === "DRIBBLE") {
    return wavePath(element.x1, element.y1, element.x2, element.y2);
  }

  return `M ${element.x1} ${element.y1} L ${element.x2} ${element.y2}`;
}

function wavePath(x1: number, y1: number, x2: number, y2: number) {
  const segments = 8;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy) || 1;
  const normalX = -dy / length;
  const normalY = dx / length;
  const points = Array.from({ length: segments + 1 }, (_, index) => {
    const t = index / segments;
    const offset = (index % 2 === 0 ? 1 : -1) * 1.2;

    return {
      x: x1 + dx * t + normalX * offset,
      y: y1 + dy * t + normalY * offset,
    };
  });

  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

function normalizeElements(elements: unknown[]): SketchElement[] {
  const normalized: Array<SketchElement | null> = elements.map((element) => {
    if (!element || typeof element !== "object") {
      return null;
    }

    const value = element as Record<string, unknown>;
    if (!value.id || typeof value.id !== "string" || !value.type || typeof value.type !== "string") {
      return null;
    }

    if (pathToolTypes.has(value.type as Tool) && hasNumber(value, "x1") && hasNumber(value, "y1") && hasNumber(value, "x2") && hasNumber(value, "y2")) {
      return {
        id: value.id,
        type: value.type as PathTool,
        x1: Number(value.x1),
        y1: Number(value.y1),
        x2: Number(value.x2),
        y2: Number(value.y2),
      };
    }

    if (areaToolTypes.has(value.type as Tool) && hasNumber(value, "x") && hasNumber(value, "y") && hasNumber(value, "width") && hasNumber(value, "height")) {
      return {
        id: value.id,
        type: value.type as AreaTool,
        x: Number(value.x),
        y: Number(value.y),
        width: Number(value.width),
        height: Number(value.height),
      };
    }

    if (pointToolTypes.has(value.type as Tool) && hasNumber(value, "x") && hasNumber(value, "y")) {
      return {
        id: value.id,
        type: value.type as PointTool,
        x: Number(value.x),
        y: Number(value.y),
        label: typeof value.label === "string" ? value.label : defaultLabel(value.type as Tool),
      };
    }

    return null;
  });

  return normalized.filter((element): element is SketchElement => Boolean(element));
}

function duplicateElement(element: SketchElement): SketchElement {
  if (isPathElement(element)) {
    return {
      ...element,
      id: createId(),
      x1: clamp(element.x1 + 4, 0, 100),
      y1: clamp(element.y1 + 4, 0, 100),
      x2: clamp(element.x2 + 4, 0, 100),
      y2: clamp(element.y2 + 4, 0, 100),
    };
  }

  if (isAreaElement(element)) {
    return {
      ...element,
      id: createId(),
      x: clamp(element.x + 4, 0, 100 - element.width),
      y: clamp(element.y + 4, 0, 100 - element.height),
    };
  }

  return {
    ...element,
    id: createId(),
    x: clamp(element.x + 4, 0, 100),
    y: clamp(element.y + 4, 0, 100),
  };
}

function defaultLabel(toolType: Tool) {
  if (toolType === "TACTIC_CIRCLE" || toolType === "TACTIC_TRIANGLE") {
    return "1";
  }

  return undefined;
}

function elementLabel(type: Tool) {
  for (const group of toolGroups) {
    const item = group.tools.find((toolItem) => toolItem.value === type);
    if (item) {
      return item.label;
    }
  }

  return type;
}

function isPointElement(element: SketchElement): element is PointElement {
  return pointToolTypes.has(element.type);
}

function isPathElement(element: SketchElement): element is PathElement {
  return pathToolTypes.has(element.type);
}

function isAreaElement(element: SketchElement): element is AreaElement {
  return areaToolTypes.has(element.type);
}

function hasNumber(value: object, key: string) {
  return key in value && typeof (value as Record<string, unknown>)[key] === "number";
}

function normalizePitch(value: string): PitchType {
  return pitchOptions.some((option) => option.value === value) ? (value as PitchType) : "FULL_FIELD";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function createId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `element-${Date.now()}-${Math.random()}`;
}
