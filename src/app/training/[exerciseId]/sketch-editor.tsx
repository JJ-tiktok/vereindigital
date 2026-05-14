"use client";

import {
  Copy,
  Download,
  Eraser,
  MousePointer2,
  Save,
  Trash2,
  Type,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
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
  const [title, setTitle] = useState(initialTitle);
  const [pitch, setPitch] = useState<PitchType>(() => normalizePitch(initialSketch?.pitch ?? initialPitch));
  const [elements, setElements] = useState<SketchElement[]>(() => normalizeElements(initialSketch?.elements ?? []));
  const [tool, setTool] = useState<Tool>("SELECT");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [pathStart, setPathStart] = useState<{ x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState(1);
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
  const selectedTool = getToolMeta(tool);
  const canEditLabel = Boolean(selectedElement && isPointElement(selectedElement));

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

  function capturePointer(pointerId: number) {
    try {
      svgRef.current?.setPointerCapture(pointerId);
    } catch {
      // Pointer capture is best-effort across stylus, touch and mouse devices.
    }
  }

  function releasePointer(pointerId: number) {
    try {
      if (svgRef.current?.hasPointerCapture(pointerId)) {
        svgRef.current.releasePointerCapture(pointerId);
      }
    } catch {
      // Some browsers already release capture on pointer cancellation.
    }
  }

  function handleCanvasPointerDown(event: PointerEvent<SVGSVGElement>) {
    capturePointer(event.pointerId);
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
      addElement({
        id: createId(),
        type: tool as PointTool,
        x: point.x,
        y: point.y,
        label: tool === "TEXT" ? "Text" : defaultLabel(tool),
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

  function handlePointerUp(event: PointerEvent<SVGSVGElement>) {
    setDragState(null);
    releasePointer(event.pointerId);
  }

  function handlePointerCancel(event: PointerEvent<SVGSVGElement>) {
    setDragState(null);
    releasePointer(event.pointerId);
  }

  function handleElementPointerDown(element: SketchElement, event: PointerEvent<SVGGElement>) {
    event.stopPropagation();
    capturePointer(event.pointerId);
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

  function updateSelectedLabel(label: string) {
    if (!selectedElement || !isPointElement(selectedElement)) {
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

  function fitStage() {
    setZoom(1);
  }

  function zoomStage(delta: number) {
    setZoom((currentZoom) => clamp(Math.round((currentZoom + delta) * 10) / 10, 0.8, 1.6));
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
    <div className="grid min-h-[calc(100vh-150px)] min-w-0 gap-4 xl:grid-cols-[92px_minmax(0,1fr)_340px] 2xl:grid-cols-[104px_minmax(0,1fr)_380px]">
      <form action={updateTrainingExerciseSketch} className="hidden" id="sketch-save-form">
        <input name="exerciseId" type="hidden" value={exerciseId} />
        <input name="sketchId" type="hidden" value={sketchId ?? ""} />
        <input name="pitchType" type="hidden" value={pitch} />
        <input name="sketchData" type="hidden" value={sketchData} />
        <input name="title" readOnly type="hidden" value={title} />
      </form>

      <ToolPanel
        className="hidden xl:flex"
        onSelect={(nextTool) => {
          setTool(nextTool);
          setPathStart(null);
        }}
        tool={tool}
      />

      <section className="min-w-0 space-y-3">
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-white p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Trainingsgrafik</p>
            <p className="mt-1 text-sm text-slate-600">
              {pathStart
                ? "Zweiten Punkt setzen, um das Element abzuschliessen."
                : selectedElement
                  ? `Ausgewaehlt: ${elementLabel(selectedElement.type)}`
                  : `${selectedTool?.label ?? "Werkzeug"} aktiv. Tippen zum Platzieren, ziehen zum Verschieben.`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <IconButton label="Rueckgaengig" onClick={undo}>
              <Undo2 className="size-4" aria-hidden="true" />
            </IconButton>
            <IconButton disabled={!selectedElement} label="Duplizieren" onClick={duplicateSelected}>
              <Copy className="size-4" aria-hidden="true" />
            </IconButton>
            <IconButton disabled={!selectedElement} label="Loeschen" tone="danger" onClick={deleteSelected}>
              <Trash2 className="size-4" aria-hidden="true" />
            </IconButton>
            <IconButton label="Leeren" onClick={clearSketch}>
              <Eraser className="size-4" aria-hidden="true" />
            </IconButton>
            <IconButton label="Export" onClick={downloadSketchImage}>
              <Download className="size-4" aria-hidden="true" />
            </IconButton>
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white transition hover:bg-primary-strong"
              form="sketch-save-form"
              type="submit"
            >
              <Save className="size-4" aria-hidden="true" />
              Speichern
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-slate-200 p-2 shadow-sm sm:p-3">
          <div className="flex min-h-[520px] items-center justify-center overflow-auto rounded-xl bg-slate-300/60 p-2 lg:min-h-[calc(100vh-260px)]">
            <div className="min-w-[560px] max-w-none md:min-w-0" style={{ width: `${zoom * 100}%` }}>
              <svg
                aria-label="Trainingsskizze Editor"
                className="block aspect-[4/3] w-full touch-none rounded-xl bg-slate-100 shadow-inner"
                onPointerCancel={handlePointerCancel}
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
          </div>
        </div>

        <ToolPanel
          className="sticky bottom-3 z-20 flex xl:hidden"
          compact
          onSelect={(nextTool) => {
            setTool(nextTool);
            setPathStart(null);
          }}
          tool={tool}
        />

        <InspectorPanel
          canEditLabel={canEditLabel}
          className="xl:hidden"
          elements={elements}
          fitStage={fitStage}
          pitch={pitch}
          selectedElement={selectedElement}
          setPitch={(nextPitch) => {
            setPitch(nextPitch);
            setPathStart(null);
          }}
          setTitle={setTitle}
          title={title}
          updateSelectedLabel={updateSelectedLabel}
          zoom={zoom}
          zoomStage={zoomStage}
        />
      </section>

      <InspectorPanel
        canEditLabel={canEditLabel}
        className="hidden xl:block"
        elements={elements}
        fitStage={fitStage}
        pitch={pitch}
        selectedElement={selectedElement}
        setPitch={(nextPitch) => {
          setPitch(nextPitch);
          setPathStart(null);
        }}
        setTitle={setTitle}
        title={title}
        updateSelectedLabel={updateSelectedLabel}
        zoom={zoom}
        zoomStage={zoomStage}
      />
    </div>
  );
}

function ToolPanel({
  className,
  compact = false,
  onSelect,
  tool,
}: {
  className?: string;
  compact?: boolean;
  onSelect: (tool: Tool) => void;
  tool: Tool;
}) {
  return (
    <aside className={`rounded-2xl border border-border bg-white p-2 shadow-sm ${className ?? ""}`}>
      <div className={compact ? "flex gap-3 overflow-x-auto" : "flex h-full flex-col gap-4 overflow-y-auto"}>
        {toolGroups.map((group) => (
          <div className={compact ? "flex shrink-0 items-center gap-2" : "space-y-2"} key={group.title}>
            <p className={compact ? "sr-only" : "px-1 text-[10px] font-bold uppercase tracking-[0.18em] text-muted"}>
              {group.title}
            </p>
            <div className={compact ? "flex gap-2" : "grid gap-2"}>
              {group.tools.map((item) => {
                const active = tool === item.value;

                return (
                  <button
                    className={`inline-flex min-h-12 min-w-12 items-center justify-center rounded-xl border px-3 text-xs font-bold transition ${
                      active
                        ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                        : "border-border bg-slate-50 text-slate-700 hover:border-blue-300 hover:bg-white"
                    } ${compact ? "shrink-0" : "w-full"}`}
                    key={item.value}
                    onClick={() => onSelect(item.value)}
                    title={`${group.title}: ${item.hint}`}
                    type="button"
                  >
                    <span className={compact ? "whitespace-nowrap" : "text-center leading-4"}>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

function InspectorPanel({
  canEditLabel,
  className,
  elements,
  fitStage,
  pitch,
  selectedElement,
  setPitch,
  setTitle,
  title,
  updateSelectedLabel,
  zoom,
  zoomStage,
}: {
  canEditLabel: boolean;
  className?: string;
  elements: SketchElement[];
  fitStage: () => void;
  pitch: PitchType;
  selectedElement: SketchElement | null | undefined;
  setPitch: (pitch: PitchType) => void;
  setTitle: (title: string) => void;
  title: string;
  updateSelectedLabel: (label: string) => void;
  zoom: number;
  zoomStage: (delta: number) => void;
}) {
  const selectedLabel = selectedElement ? elementLabel(selectedElement.type) : "Kein Element";
  const labelValue = selectedElement && isPointElement(selectedElement) ? selectedElement.label ?? "" : "";

  return (
    <aside className={`space-y-3 rounded-2xl border border-border bg-white p-4 shadow-sm ${className ?? ""}`}>
      <section>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Skizze</p>
        <label className="mt-3 block">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Titel</span>
          <input
            className="mt-2 h-11 w-full rounded-lg border border-border px-3 text-sm font-semibold outline-none transition focus:border-primary focus:ring-2 focus:ring-blue-100"
            onChange={(event) => setTitle(event.target.value)}
            value={title}
          />
        </label>
      </section>

      <section className="border-t border-border pt-3">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Feldvorlage</p>
        <div className="mt-3 grid gap-2">
          {pitchOptions.map((option) => (
            <button
              className={`rounded-lg border p-3 text-left transition ${
                pitch === option.value
                  ? "border-blue-500 bg-blue-50 text-blue-950"
                  : "border-border bg-white text-slate-700 hover:border-blue-300"
              }`}
              key={option.value}
              onClick={() => setPitch(option.value)}
              type="button"
            >
              <span className="block text-sm font-bold">{option.label}</span>
              <span className="mt-1 block text-xs text-muted">{option.description}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="border-t border-border pt-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Ansicht</p>
            <p className="mt-1 text-sm font-semibold tabular-nums text-slate-900">{Math.round(zoom * 100)}%</p>
          </div>
          <div className="flex gap-2">
            <IconButton label="Verkleinern" onClick={() => zoomStage(-0.1)}>
              <ZoomOut className="size-4" aria-hidden="true" />
            </IconButton>
            <IconButton label="Vergroessern" onClick={() => zoomStage(0.1)}>
              <ZoomIn className="size-4" aria-hidden="true" />
            </IconButton>
          </div>
        </div>
        <button
          className="mt-3 h-10 w-full rounded-lg border border-border bg-white px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          onClick={fitStage}
          type="button"
        >
          Auf Flaeche einpassen
        </button>
      </section>

      <section className="border-t border-border pt-3">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Inspector</p>
        <div className="mt-3 rounded-lg bg-slate-50 p-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-950">
            {selectedElement ? <MousePointer2 className="size-4 text-primary" aria-hidden="true" /> : <Type className="size-4 text-muted" aria-hidden="true" />}
            {selectedLabel}
          </div>
          <p className="mt-1 text-xs leading-5 text-muted">
            {selectedElement
              ? "Elemente koennen direkt auf der Flaeche gezogen werden."
              : `${elements.length} Elemente auf dieser Skizze.`}
          </p>
        </div>

        <label className="mt-3 block">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Label</span>
          <input
            className="mt-2 h-10 w-full rounded-lg border border-border px-3 text-sm outline-none transition disabled:bg-slate-100 disabled:text-slate-400 focus:border-primary focus:ring-2 focus:ring-blue-100"
            disabled={!canEditLabel}
            onChange={(event) => updateSelectedLabel(event.target.value)}
            placeholder="Element auswaehlen"
            value={labelValue}
          />
        </label>
      </section>

      <button
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white transition hover:bg-primary-strong"
        form="sketch-save-form"
        type="submit"
      >
        <Save className="size-4" aria-hidden="true" />
        Skizze speichern
      </button>
    </aside>
  );
}

function IconButton({
  children,
  disabled,
  label,
  onClick,
  tone = "default",
}: {
  children: ReactNode;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  tone?: "default" | "danger";
}) {
  return (
    <button
      aria-label={label}
      className={`inline-flex size-10 items-center justify-center rounded-lg border text-sm font-bold transition disabled:opacity-40 ${
        tone === "danger"
          ? "border-red-200 bg-white text-red-700 hover:bg-red-50"
          : "border-border bg-white text-slate-700 hover:bg-slate-50"
      }`}
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
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
        <path d={path} fill="none" stroke="transparent" strokeLinecap="round" strokeWidth="7" />
        <path d={path} fill="none" markerEnd={markerEnd} stroke={stroke} strokeDasharray={element.type === "DRIBBLE" ? "1.3 1" : undefined} strokeLinecap="round" strokeWidth="0.9" />
        {outline}
      </g>
    );
  }

  if (isAreaElement(element)) {
    return (
      <g className="cursor-move" onPointerDown={onPointerDown}>
        <rect fill="transparent" height={element.height + 6} width={element.width + 6} x={element.x - 3} y={element.y - 3} />
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
      <circle fill="transparent" r="8" />
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
  return getToolMeta(type)?.label ?? type;
}

function getToolMeta(type: Tool) {
  for (const group of toolGroups) {
    const item = group.tools.find((toolItem) => toolItem.value === type);
    if (item) {
      return item;
    }
  }

  return null;
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
