"use client";

import Konva from "konva";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Arrow, Circle, Ellipse, Group, Image as KonvaImageNode, Layer, Line, Path, Rect, Stage, Text, Transformer } from "react-konva";

import { updateTrainingExerciseSketch } from "@/lib/actions";

// Elements store x/y (and width/height, x1/y1/x2/y2) as 0-100 percentages of the field.
// The Konva Stage is sized to the actual container pixels (updated via ResizeObserver), so
// percent -> pixel conversion always uses the current rendered size - no letterboxing, no
// separate viewBox math. FIELD_WIDTH is only the logical unit space the hand-authored icon/
// pitch geometry below was drawn in (a 150-wide x 100-tall canvas); unitScale converts those
// fixed-size units into pixels at the current render size.
const FIELD_WIDTH = 150;

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
      { value: "ARROW", label: "Pfeil", hint: "Ziehen fuer Lauf-/Passweg, Vorschau live sichtbar" },
      { value: "LINE", label: "Linie", hint: "Gerade Verbindung ziehen" },
      { value: "DRIBBLE", label: "Dribbling", hint: "Gewellte Linie ziehen" },
      { value: "CURVED_ARROW", label: "Bogen", hint: "Gebogenen Laufweg ziehen" },
      { value: "TEXT", label: "Text", hint: "Kurzen Hinweis platzieren" },
    ],
  },
];

const categoryTabs: Array<{ id: string; label: string }> = [
  { id: "feldvorlage", label: "Feldvorlage" },
  ...toolGroups.map((group) => ({ id: group.title.toLowerCase(), label: group.title })),
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

type SketchEditorContextValue = {
  exerciseId: string;
  sketchId: string | null;
  initialTitle: string;
  pitch: PitchType;
  elements: SketchElement[];
  tool: Tool;
  toolCategory: string;
  selectedId: string | null;
  selectedElement: SketchElement | null | undefined;
  sketchData: string;
  multiPlace: boolean;
  setMultiPlace: (value: boolean) => void;
  selectPitch: (value: PitchType) => void;
  selectTool: (value: Tool) => void;
  setToolCategory: (value: string) => void;
  addElement: (element: SketchElement) => void;
  updateElement: (id: string, patch: Partial<SketchElement>) => void;
  selectElement: (id: string | null) => void;
  undo: () => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  editSelectedText: () => void;
  clearSketch: () => void;
};

const SketchEditorContext = createContext<SketchEditorContextValue | null>(null);

function useSketchEditorContext() {
  const value = useContext(SketchEditorContext);

  if (!value) {
    throw new Error("SketchToolPanel/SketchCanvasPanel must be used within a SketchEditorProvider");
  }

  return value;
}

export function SketchEditorProvider({
  exerciseId,
  sketchId,
  initialTitle,
  initialPitch,
  initialSketch,
  children,
}: SketchEditorProps & { children: ReactNode }) {
  const [pitch, setPitch] = useState<PitchType>(() => normalizePitch(initialSketch?.pitch ?? initialPitch));
  const [elements, setElements] = useState<SketchElement[]>(() => normalizeElements(initialSketch?.elements ?? []));
  const [tool, setTool] = useState<Tool>("SELECT");
  const [toolCategory, setToolCategory] = useState<string>("feldvorlage");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [multiPlace, setMultiPlace] = useState(false);
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

  function pushHistory() {
    setHistory((currentHistory) => [...currentHistory.slice(-24), elements]);
  }

  function addElement(element: SketchElement) {
    pushHistory();
    setElements((currentElements) => [...currentElements, element]);
    setSelectedId(element.id);
    if (!multiPlace) {
      setTool("SELECT");
    }
  }

  function updateElement(id: string, patch: Partial<SketchElement>) {
    pushHistory();
    setElements((currentElements) =>
      currentElements.map((element) => (element.id === id ? ({ ...element, ...patch } as SketchElement) : element)),
    );
  }

  function selectElement(id: string | null) {
    setSelectedId(id);
  }

  function selectPitch(value: PitchType) {
    setPitch(value);
  }

  function selectTool(value: Tool) {
    setTool(value);
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
  }

  return (
    <SketchEditorContext.Provider
      value={{
        exerciseId,
        sketchId,
        initialTitle,
        pitch,
        elements,
        tool,
        toolCategory,
        selectedId,
        selectedElement,
        sketchData,
        multiPlace,
        setMultiPlace,
        selectPitch,
        selectTool,
        setToolCategory,
        addElement,
        updateElement,
        selectElement,
        undo,
        deleteSelected,
        duplicateSelected,
        editSelectedText,
        clearSketch,
      }}
    >
      {children}
    </SketchEditorContext.Provider>
  );
}

export function SketchToolPanel() {
  const { pitch, tool, toolCategory, multiPlace, setMultiPlace, selectPitch, selectTool, setToolCategory } = useSketchEditorContext();

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-surface p-3 shadow-sm">
      <div className="flex flex-wrap gap-1 border-b border-border pb-2">
        {categoryTabs.map((tab) => (
          <button
            className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
              toolCategory === tab.id ? "bg-primary text-white shadow-sm" : "text-muted hover:bg-surface-muted"
            }`}
            key={tab.id}
            onClick={() => setToolCategory(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      <label className="flex items-center gap-2 text-xs font-semibold text-muted">
        <input checked={multiPlace} className="accent-primary" onChange={(event) => setMultiPlace(event.target.checked)} type="checkbox" />
        Mehrfach platzieren (Werkzeug nach dem Platzieren behalten)
      </label>

      {toolCategory === "feldvorlage" ? (
        <div className="grid gap-1.5">
          {pitchOptions.map((option) => (
            <button
              className={`rounded-lg border p-2 text-left transition ${
                pitch === option.value
                  ? "border-primary bg-primary-soft text-primary"
                  : "border-border bg-surface text-foreground hover:border-primary"
              }`}
              key={option.value}
              onClick={() => selectPitch(option.value)}
              type="button"
            >
              <span className="block text-sm font-bold">{option.label}</span>
              <span className="mt-0.5 block text-xs text-muted">{option.description}</span>
            </button>
          ))}
        </div>
      ) : (
        toolGroups
          .filter((group) => group.title.toLowerCase() === toolCategory)
          .map((group) => (
            <div className="grid grid-cols-2 gap-1.5" key={group.title}>
              {group.tools.map((item) => (
                <button
                  className={`min-h-10 rounded-lg border px-2.5 py-1.5 text-left text-xs font-semibold transition ${
                    tool === item.value
                      ? "border-primary bg-primary text-white shadow-sm"
                      : "border-border bg-surface-muted text-foreground hover:border-primary hover:bg-surface"
                  }`}
                  key={item.value}
                  onClick={() => selectTool(item.value)}
                  title={item.hint}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </div>
          ))
      )}
    </div>
  );
}

type Point = { x: number; y: number };

export function SketchCanvasPanel() {
  const {
    exerciseId,
    sketchId,
    initialTitle,
    pitch,
    elements,
    tool,
    selectedId,
    selectedElement,
    sketchData,
    addElement,
    updateElement,
    selectElement,
    undo,
    deleteSelected,
    duplicateSelected,
    editSelectedText,
    clearSketch,
  } = useSketchEditorContext();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const shapeRefs = useRef<Record<string, Konva.Node | null>>({});

  const [mounted, setMounted] = useState(false);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [drawStart, setDrawStart] = useState<Point | null>(null);
  const [drawPreview, setDrawPreview] = useState<Point | null>(null);
  const [pitchImage, setPitchImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    // Konva needs a real DOM/canvas, so the Stage must only ever render on the client -
    // this mount-gate intentionally differs between the SSR pass and the first client
    // render to avoid handing Konva to the server.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    // Measure synchronously up front - some environments (or a ResizeObserver that only
    // fires on genuine size *changes*, not on initial observe) would otherwise leave the
    // Stage stuck at 0x0 forever since nothing else would ever trigger a re-measure.
    const rect = element.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setSize({ width: rect.width, height: rect.height });
    }

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const uri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(pitchSvgMarkup(pitch))}`;
    const image = new window.Image();
    image.onload = () => setPitchImage(image);
    image.src = uri;
  }, [pitch]);

  useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) {
      return;
    }

    const selected = elements.find((element) => element.id === selectedId);
    const node = selectedId ? shapeRefs.current[selectedId] : null;

    if (node && selected && isAreaElement(selected)) {
      transformer.nodes([node]);
    } else {
      transformer.nodes([]);
    }
    transformer.getLayer()?.batchDraw();
  }, [selectedId, elements]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const activeTag = document.activeElement?.tagName;
      if (activeTag === "INPUT" || activeTag === "TEXTAREA") {
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteSelected();
      } else if (event.key === "Escape") {
        setDrawStart(null);
        setDrawPreview(null);
        selectElement(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteSelected, selectElement]);

  const unitScale = size.width > 0 ? size.width / FIELD_WIDTH : 0;

  const toStageX = useCallback((percent: number) => (percent / 100) * size.width, [size.width]);
  const toStageY = useCallback((percent: number) => (percent / 100) * size.height, [size.height]);
  const toPercentX = useCallback((px: number) => (size.width ? (px / size.width) * 100 : 0), [size.width]);
  const toPercentY = useCallback((px: number) => (size.height ? (px / size.height) * 100 : 0), [size.height]);

  function getRelativePoint(): Point | null {
    const stage = stageRef.current;
    if (!stage) {
      return null;
    }
    const pos = stage.getPointerPosition();
    if (!pos) {
      return null;
    }
    return { x: clamp(toPercentX(pos.x), 0, 100), y: clamp(toPercentY(pos.y), 0, 100) };
  }

  function finalizePath(endPoint: Point) {
    if (!drawStart) {
      return;
    }
    addElement({
      id: createId(),
      type: tool as PathTool,
      x1: drawStart.x,
      y1: drawStart.y,
      x2: endPoint.x,
      y2: endPoint.y,
    });
    setDrawStart(null);
    setDrawPreview(null);
  }

  function handleStageMouseDown() {
    const point = getRelativePoint();
    if (!point) {
      return;
    }

    if (tool === "SELECT") {
      selectElement(null);
      return;
    }

    if (pathToolTypes.has(tool)) {
      if (!drawStart) {
        setDrawStart(point);
        setDrawPreview(point);
      } else {
        finalizePath(point);
      }
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

  function handleStageMouseMove() {
    if (!drawStart) {
      return;
    }
    const point = getRelativePoint();
    if (point) {
      setDrawPreview(point);
    }
  }

  function handleStageMouseUp() {
    if (!drawStart || !drawPreview) {
      return;
    }
    const distance = Math.hypot(drawPreview.x - drawStart.x, drawPreview.y - drawStart.y);
    if (distance > 3) {
      finalizePath(drawPreview);
    }
  }

  function handleDownload() {
    const stage = stageRef.current;
    if (!stage) {
      return;
    }
    const uri = stage.toDataURL({ pixelRatio: 2 });
    const link = document.createElement("a");
    link.download = `training-skizze-${sketchId ?? exerciseId}.png`;
    link.href = uri;
    link.click();
  }

  const hint = drawStart
    ? "Loslassen oder zweiten Punkt setzen, um das Element abzuschliessen."
    : selectedElement
      ? `Ausgewaehlt: ${elementLabel(selectedElement.type)}`
      : "Werkzeug waehlen, aufs Feld ziehen/klicken und Elemente direkt verschieben.";

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <div>
          <p className="text-sm font-bold text-foreground">Trainingsgrafik</p>
          <p className="text-sm text-muted">{hint}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="rounded-xl border border-border px-4 py-2 text-sm font-bold text-foreground" onClick={undo} type="button">
            Rueckgaengig
          </button>
          <button
            className="rounded-xl border border-border px-4 py-2 text-sm font-bold text-foreground disabled:opacity-40"
            disabled={!selectedElement}
            onClick={duplicateSelected}
            type="button"
          >
            Duplizieren
          </button>
          <button
            className="rounded-xl border border-border px-4 py-2 text-sm font-bold text-foreground disabled:opacity-40"
            disabled={!selectedElement || !isPointElement(selectedElement)}
            onClick={editSelectedText}
            type="button"
          >
            Label
          </button>
          <button
            className="rounded-xl border border-danger-soft px-4 py-2 text-sm font-bold text-danger disabled:opacity-40"
            disabled={!selectedElement}
            onClick={deleteSelected}
            type="button"
          >
            Loeschen
          </button>
          <button className="rounded-xl border border-border px-4 py-2 text-sm font-bold text-foreground" onClick={clearSketch} type="button">
            Leeren
          </button>
          <button className="rounded-xl border border-border px-4 py-2 text-sm font-bold text-foreground" onClick={handleDownload} type="button">
            Bild exportieren
          </button>
        </div>
      </div>

      <div className="relative aspect-[3/2] w-full overflow-hidden rounded-2xl border border-border bg-surface-muted shadow-sm" ref={containerRef}>
        {mounted && size.width > 0 && size.height > 0 ? (
          <Stage
            height={size.height}
            onMouseDown={handleStageMouseDown}
            onMouseMove={handleStageMouseMove}
            onMouseUp={handleStageMouseUp}
            onTouchEnd={handleStageMouseUp}
            onTouchMove={handleStageMouseMove}
            onTouchStart={handleStageMouseDown}
            ref={stageRef}
            width={size.width}
          >
            <Layer>
              {pitchImage ? <KonvaImageNode height={size.height} image={pitchImage} listening={false} width={size.width} /> : null}
              {elements.map((element) => (
                <ElementNode
                  element={element}
                  hovered={element.id === hoveredId}
                  key={element.id}
                  onDragEnd={(patch) => updateElement(element.id, patch)}
                  onHover={(isHovered) => setHoveredId(isHovered ? element.id : null)}
                  onSelect={() => selectElement(element.id)}
                  onTransformEnd={(patch) => updateElement(element.id, patch)}
                  registerRef={(node) => {
                    shapeRefs.current[element.id] = node;
                  }}
                  selected={element.id === selectedId}
                  toPercentX={toPercentX}
                  toPercentY={toPercentY}
                  toStageX={toStageX}
                  toStageY={toStageY}
                  unitScale={unitScale}
                />
              ))}
              {drawStart && drawPreview ? (
                <PreviewPath
                  end={drawPreview}
                  start={drawStart}
                  toStageX={toStageX}
                  toStageY={toStageY}
                  type={tool as PathTool}
                  unitScale={unitScale}
                />
              ) : null}
              <Transformer ref={transformerRef} rotateEnabled={false} />
            </Layer>
          </Stage>
        ) : null}
      </div>

      <form action={updateTrainingExerciseSketch} className="flex flex-wrap justify-end gap-3">
        <input name="exerciseId" type="hidden" value={exerciseId} />
        <input name="sketchId" type="hidden" value={sketchId ?? ""} />
        <input name="pitchType" type="hidden" value={pitch} />
        <input name="sketchData" type="hidden" value={sketchData} />
        <label className="mr-auto w-full sm:max-w-xs">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Skizzentitel</span>
          <input
            className="mt-2 h-11 w-full rounded-xl border border-border px-3 text-sm font-semibold outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
            defaultValue={initialTitle}
            name="title"
            placeholder="z.B. Phase 1: Aufbau"
          />
        </label>
        <button className="rounded-xl border border-border px-5 py-3 text-sm font-bold text-foreground" onClick={undo} type="button">
          Rueckgaengig
        </button>
        <button className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-primary-strong" type="submit">
          Skizze speichern
        </button>
      </form>
    </section>
  );
}

type ElementNodeProps = {
  element: SketchElement;
  selected: boolean;
  hovered: boolean;
  unitScale: number;
  toStageX: (percent: number) => number;
  toStageY: (percent: number) => number;
  toPercentX: (px: number) => number;
  toPercentY: (px: number) => number;
  registerRef: (node: Konva.Node | null) => void;
  onSelect: () => void;
  onHover: (hovered: boolean) => void;
  onDragEnd: (patch: Partial<SketchElement>) => void;
  onTransformEnd: (patch: Partial<SketchElement>) => void;
};

function ElementNode({
  element,
  selected,
  hovered,
  unitScale,
  toStageX,
  toStageY,
  toPercentX,
  toPercentY,
  registerRef,
  onSelect,
  onHover,
  onDragEnd,
  onTransformEnd,
}: ElementNodeProps) {
  if (isPointElement(element)) {
    const iconScale = unitScale * 0.7;
    const hitRadius = Math.max(16, 6 * unitScale);

    return (
      <Group
        draggable
        onClick={onSelect}
        onDragEnd={(event) => onDragEnd({ x: toPercentX(event.target.x()), y: toPercentY(event.target.y()) })}
        onDragStart={onSelect}
        onMouseEnter={() => onHover(true)}
        onMouseLeave={() => onHover(false)}
        onTap={onSelect}
        ref={registerRef}
        x={toStageX(element.x)}
        y={toStageY(element.y)}
      >
        <Circle fill="transparent" radius={hitRadius} />
        {hovered && !selected ? <Circle radius={4.6 * iconScale} stroke="#0b63ce" strokeWidth={1} /> : null}
        <Group scaleX={iconScale} scaleY={iconScale}>
          <PointSymbolKonva element={element} />
        </Group>
        {selected ? <Circle dash={[2, 2]} radius={5.1 * iconScale} stroke="#0b63ce" strokeWidth={1} /> : null}
      </Group>
    );
  }

  if (isPathElement(element)) {
    const x1px = toStageX(element.x1);
    const y1px = toStageY(element.y1);
    const dx = toStageX(element.x2) - x1px;
    const dy = toStageY(element.y2) - y1px;
    const points = pathPoints(element.type, dx, dy, unitScale);
    const stroke = element.type === "DRIBBLE" ? "#f97316" : element.type === "LINE" ? "#334155" : "#0f172a";
    const showArrowHead = element.type !== "LINE";
    const strokeWidth = Math.max(1, 0.7 * unitScale);
    const hitStrokeWidth = Math.max(18, 6 * unitScale);

    return (
      <Group
        draggable
        onClick={onSelect}
        onDragEnd={(event) => {
          const newX1 = toPercentX(event.target.x());
          const newY1 = toPercentY(event.target.y());
          onDragEnd({
            x1: newX1,
            y1: newY1,
            x2: newX1 + (element.x2 - element.x1),
            y2: newY1 + (element.y2 - element.y1),
          });
        }}
        onDragStart={onSelect}
        onMouseEnter={() => onHover(true)}
        onMouseLeave={() => onHover(false)}
        onTap={onSelect}
        ref={registerRef}
        x={x1px}
        y={y1px}
      >
        <Line hitStrokeWidth={hitStrokeWidth} points={points} stroke="transparent" strokeWidth={hitStrokeWidth} />
        <Arrow
          dash={element.type === "DRIBBLE" ? [1.1 * unitScale, 0.9 * unitScale] : undefined}
          fill={stroke}
          lineCap="round"
          listening={false}
          points={points}
          pointerLength={showArrowHead ? Math.max(5, 3 * unitScale) : 0}
          pointerWidth={showArrowHead ? Math.max(5, 3 * unitScale) : 0}
          stroke={stroke}
          strokeWidth={strokeWidth}
          tension={element.type === "CURVED_ARROW" ? 0.5 : 0}
        />
        {selected ? (
          <>
            <Circle
              draggable
              fill="#fff"
              onDragEnd={(event) => {
                event.cancelBubble = true;
                const newX1 = toPercentX(x1px + event.target.x());
                const newY1 = toPercentY(y1px + event.target.y());
                onDragEnd({ x1: newX1, y1: newY1 });
              }}
              onDragMove={(event) => {
                event.cancelBubble = true;
              }}
              onDragStart={(event) => {
                event.cancelBubble = true;
              }}
              onMouseDown={(event) => {
                event.cancelBubble = true;
              }}
              radius={Math.max(4.5, 1.6 * unitScale)}
              stroke="#0b63ce"
              strokeWidth={1.5}
              x={0}
              y={0}
            />
            <Circle
              draggable
              fill="#fff"
              onDragEnd={(event) => {
                event.cancelBubble = true;
                const newX2 = toPercentX(x1px + event.target.x());
                const newY2 = toPercentY(y1px + event.target.y());
                onDragEnd({ x2: newX2, y2: newY2 });
              }}
              onDragMove={(event) => {
                event.cancelBubble = true;
              }}
              onDragStart={(event) => {
                event.cancelBubble = true;
              }}
              onMouseDown={(event) => {
                event.cancelBubble = true;
              }}
              radius={Math.max(4.5, 1.6 * unitScale)}
              stroke="#0b63ce"
              strokeWidth={1.5}
              x={dx}
              y={dy}
            />
          </>
        ) : null}
      </Group>
    );
  }

  const xPx = toStageX(element.x);
  const yPx = toStageY(element.y);
  const widthPx = toStageX(element.width);
  const heightPx = toStageY(element.height);
  const isCircle = element.type === "ZONE_CIRCLE";
  const fill = isCircle ? "#f9731622" : "#0b63ce22";
  const stroke = isCircle ? "#f97316" : "#0b63ce";
  const dash = [1.8 * unitScale, 1.3 * unitScale];
  const strokeWidth = Math.max(1, 0.55 * unitScale);

  return (
    <Group
      draggable
      onClick={onSelect}
      onDragEnd={(event) => onDragEnd({ x: toPercentX(event.target.x()), y: toPercentY(event.target.y()) })}
      onDragStart={onSelect}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onTap={onSelect}
      onTransformEnd={(event) => {
        const node = event.target;
        const newWidthPx = widthPx * node.scaleX();
        const newHeightPx = heightPx * node.scaleY();
        node.scaleX(1);
        node.scaleY(1);
        onTransformEnd({
          x: toPercentX(node.x()),
          y: toPercentY(node.y()),
          width: clamp(toPercentX(newWidthPx), 4, 100),
          height: clamp(toPercentY(newHeightPx), 4, 100),
        });
      }}
      ref={registerRef}
      x={xPx}
      y={yPx}
    >
      {isCircle ? (
        <Ellipse
          dash={dash}
          fill={fill}
          radiusX={widthPx / 2}
          radiusY={heightPx / 2}
          stroke={stroke}
          strokeWidth={strokeWidth}
          x={widthPx / 2}
          y={heightPx / 2}
        />
      ) : (
        <Rect cornerRadius={4 * unitScale} dash={dash} fill={fill} height={heightPx} stroke={stroke} strokeWidth={strokeWidth} width={widthPx} />
      )}
      {selected ? (
        <Rect dash={[3, 3]} fill="transparent" height={heightPx} listening={false} stroke="#0b63ce" strokeWidth={Math.max(1, 0.35 * unitScale)} width={widthPx} />
      ) : null}
    </Group>
  );
}

function PreviewPath({
  type,
  start,
  end,
  unitScale,
  toStageX,
  toStageY,
}: {
  type: PathTool;
  start: Point;
  end: Point;
  unitScale: number;
  toStageX: (percent: number) => number;
  toStageY: (percent: number) => number;
}) {
  const x1px = toStageX(start.x);
  const y1px = toStageY(start.y);
  const dx = toStageX(end.x) - x1px;
  const dy = toStageY(end.y) - y1px;
  const points = pathPoints(type, dx, dy, unitScale);
  const showArrowHead = type !== "LINE";

  return (
    <Arrow
      dash={type === "DRIBBLE" ? [1.1 * unitScale, 0.9 * unitScale] : [2, 2]}
      fill="#0b63ce"
      lineCap="round"
      listening={false}
      opacity={0.6}
      points={points}
      pointerLength={showArrowHead ? Math.max(5, 3 * unitScale) : 0}
      pointerWidth={showArrowHead ? Math.max(5, 3 * unitScale) : 0}
      stroke="#0b63ce"
      strokeWidth={Math.max(1, 0.9 * unitScale)}
      tension={type === "CURVED_ARROW" ? 0.5 : 0}
      x={x1px}
      y={y1px}
    />
  );
}

function pathPoints(type: PathTool, dx: number, dy: number, unitScale: number): number[] {
  if (type === "CURVED_ARROW") {
    return [0, 0, dx / 2, dy / 2 - 10 * unitScale, dx, dy];
  }

  if (type === "DRIBBLE") {
    const segments = 8;
    const length = Math.hypot(dx, dy) || 1;
    const normalX = -dy / length;
    const normalY = dx / length;
    const amplitude = 1.2 * unitScale;
    const points: number[] = [];

    for (let index = 0; index <= segments; index += 1) {
      const t = index / segments;
      const offset = (index % 2 === 0 ? 1 : -1) * amplitude;
      points.push(dx * t + normalX * offset, dy * t + normalY * offset);
    }

    return points;
  }

  return [0, 0, dx, dy];
}

function PointSymbolKonva({ element }: { element: PointElement }) {
  if (element.type === "BALL") {
    return (
      <>
        <Circle fill="#fff" radius={2.3} stroke="#111827" strokeWidth={0.4} />
        <Path data="M0 -1.7 1.4 -0.6 0.9 1.1 -0.9 1.1 -1.4 -0.6 Z" fill="#111827" />
      </>
    );
  }

  if (element.type === "CONE") {
    return (
      <>
        <Ellipse fill="#f97316" radiusX={2.3} radiusY={0.8} stroke="#111827" strokeWidth={0.25} x={0} y={1.8} />
        <Path data="M-1.4 1.4 L0 -2 L1.4 1.4 Z" fill="#fb923c" stroke="#111827" strokeWidth={0.25} />
      </>
    );
  }

  if (element.type === "PYLON") {
    return (
      <>
        <Path data="M-1.6 2.2 L0 -3 L1.6 2.2 Z" fill="#fb923c" stroke="#111827" strokeWidth={0.25} />
        <Rect cornerRadius={0.2} fill="#f97316" height={0.8} width={4.2} x={-2.1} y={2} />
      </>
    );
  }

  if (element.type === "DUMMY") {
    return (
      <>
        <Circle fill="#f97316" radius={1} x={0} y={-2.3} />
        <Path data="M-1.1 -1.3 Q0 -2 1.1 -1.3 L1.6 2.9 L-1.6 2.9 Z" fill="#f97316" stroke="#111827" strokeWidth={0.2} />
      </>
    );
  }

  if (element.type === "GOAL" || element.type === "MINI_GOAL") {
    const width = element.type === "GOAL" ? 10 : 7;
    const height = element.type === "GOAL" ? 5 : 3.5;

    return (
      <Group x={-width / 2} y={-height / 2}>
        <Rect fill="#f8fafc" height={height} stroke="#334155" strokeWidth={0.45} width={width} />
        <Path
          data={`M1 0 V${height} M${width / 2} 0 V${height} M${width - 1} 0 V${height} M0 ${height / 2} H${width}`}
          stroke="#cbd5e1"
          strokeWidth={0.25}
        />
      </Group>
    );
  }

  if (element.type === "TACTIC_CIRCLE") {
    return (
      <>
        <Circle fill="#ef4444" radius={3.2} stroke="#111827" strokeWidth={0.35} />
        <Path data="M-3.2 0 A3.2 3.2 0 0 1 3.2 0 L-3.2 0 Z" fill="#111827" />
        <Text align="center" fill="#fff" fontSize={3.2} fontStyle="bold" height={6.4} text={element.label ?? "1"} verticalAlign="middle" width={6.4} x={-3.2} y={-3.2} />
      </>
    );
  }

  if (element.type === "TACTIC_TRIANGLE") {
    return (
      <>
        <Path data="M0 -4 L3.7 3.2 H-3.7 Z" fill="#0b63ce" stroke="#111827" strokeWidth={0.25} />
        <Path data="M0 -4 L1.1 -1.8 H-1.1 Z" fill="#111827" />
        <Text align="center" fill="#fff" fontSize={3.2} fontStyle="bold" height={5} text={element.label ?? "1"} verticalAlign="middle" width={7.4} x={-3.7} y={-1} />
      </>
    );
  }

  if (element.type === "TEXT") {
    const width = Math.max(10, (element.label?.length ?? 1) * 2.2);
    return (
      <>
        <Rect cornerRadius={1} fill="#ffffffe8" height={5.5} stroke="#94a3b8" strokeWidth={0.25} width={width} x={-1} y={-3} />
        <Text fill="#0f172a" fontSize={3} fontStyle="bold" text={element.label ?? ""} x={0} y={-1.5} />
      </>
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
    <>
      <Circle fill="#f2c29c" radius={1.05} stroke="#111827" strokeWidth={0.18} x={0} y={-3.1} />
      <Path data="M-1.8 -1.6 Q0 -2.5 1.8 -1.6 L1.15 1.4 H-1.15 Z" fill={palette.shirt} stroke="#111827" strokeWidth={0.2} />
      <Path data="M-1.1 1.4 H1.1 L0.7 2.8 H-0.7 Z" fill={palette.shorts} stroke="#111827" strokeWidth={0.16} />
      <Path
        data="M-1.4 2.8 L-2.1 4.2 M1.4 2.8 L2.1 4.2 M-1.8 -0.8 L-3.1 0.8 M1.8 -0.8 L3.1 0.8"
        lineCap="round"
        stroke="#111827"
        strokeWidth={0.35}
      />
      {element.label ? (
        <Text align="center" fill="#fff" fontSize={2} fontStyle="bold" height={2} text={element.label} verticalAlign="middle" width={4} x={-2} y={-1.1} />
      ) : null}
    </>
  );
}

function fieldStripesMarkup(): string {
  const stripeWidth = FIELD_WIDTH / 20;
  let markup = `<rect fill="#a8d08d" width="${FIELD_WIDTH}" height="100" />`;

  for (let index = 0; index < 20; index += 1) {
    const fill = index % 2 === 0 ? "#7dbb68" : "#a8d08d";
    markup += `<rect fill="${fill}" width="${stripeWidth}" height="100" x="${index * stripeWidth}" />`;
  }

  return markup;
}

function pitchSvgMarkup(pitch: PitchType): string {
  let inner: string;

  if (pitch === "FREE_AREA") {
    inner = `
      <rect fill="#f8fafc" width="${FIELD_WIDTH}" height="100" />
      <rect fill="url(#grid-pattern)" width="${FIELD_WIDTH}" height="100" />
      <rect fill="none" width="132" height="86" x="9" y="7" rx="2" stroke="#94a3b8" stroke-width="0.5" stroke-dasharray="2 2" />
    `;
  } else if (pitch === "PENALTY_AREA") {
    inner = `${fieldStripesMarkup()}
      <rect fill="none" width="108" height="46" x="21" y="14" stroke="#fff" stroke-width="0.65" />
      <rect fill="none" width="48" height="18" x="51" y="14" stroke="#fff" stroke-width="0.65" />
      <rect fill="none" width="21" height="6" x="64.5" y="14" stroke="#fff" stroke-width="0.65" />
      <path d="M51 60 A24 24 0 0 0 99 60" fill="none" stroke="#fff" stroke-width="0.65" />
      <circle cx="75" cy="44" r="0.55" fill="#fff" />
      <path d="M63 14 V10 H87 V14" fill="none" stroke="#fff" stroke-width="0.65" />
    `;
  } else if (pitch === "HALF_FIELD") {
    inner = `${fieldStripesMarkup()}
      <rect fill="none" width="132" height="82" x="9" y="9" stroke="#fff" stroke-width="0.65" />
      <line x1="9" x2="141" y1="91" y2="91" stroke="#fff" stroke-width="0.65" />
      <rect fill="none" width="78" height="23" x="36" y="9" stroke="#fff" stroke-width="0.65" />
      <rect fill="none" width="36" height="10" x="57" y="9" stroke="#fff" stroke-width="0.65" />
      <path d="M55.5 32 A19.5 19.5 0 0 0 94.5 32" fill="none" stroke="#fff" stroke-width="0.65" />
      <circle cx="75" cy="50" r="8.5" fill="none" stroke="#fff" stroke-width="0.65" />
      <circle cx="75" cy="50" r="0.55" fill="#fff" />
      <path d="M63 9 V5 H87 V9" fill="none" stroke="#fff" stroke-width="0.65" />
    `;
  } else if (pitch === "SMALL_FIELD") {
    inner = `${fieldStripesMarkup()}
      <rect fill="none" width="126" height="70" x="12" y="15" stroke="#fff" stroke-width="0.65" />
      <line x1="75" x2="75" y1="15" y2="85" stroke="#fff" stroke-width="0.65" />
      <circle cx="75" cy="50" r="7" fill="none" stroke="#fff" stroke-width="0.65" />
      <circle cx="75" cy="50" r="0.55" fill="#fff" />
      <rect fill="none" width="24" height="18" x="12" y="41" stroke="#fff" stroke-width="0.65" />
      <rect fill="none" width="24" height="18" x="114" y="41" stroke="#fff" stroke-width="0.65" />
      <path d="M12 45 H9.6 V55 H12" fill="none" stroke="#fff" stroke-width="0.65" />
      <path d="M138 45 H140.4 V55 H138" fill="none" stroke="#fff" stroke-width="0.65" />
    `;
  } else {
    inner = `${fieldStripesMarkup()}
      <rect fill="none" width="132" height="82" x="9" y="9" stroke="#fff" stroke-width="0.65" />
      <line x1="75" x2="75" y1="9" y2="91" stroke="#fff" stroke-width="0.65" />
      <circle cx="75" cy="50" r="7.8" fill="none" stroke="#fff" stroke-width="0.65" />
      <circle cx="75" cy="50" r="0.55" fill="#fff" />
      <rect fill="none" width="24" height="43" x="9" y="28.5" stroke="#fff" stroke-width="0.65" />
      <rect fill="none" width="9" height="20" x="9" y="40" stroke="#fff" stroke-width="0.65" />
      <path d="M33 39 A13 13 0 0 1 33 61" fill="none" stroke="#fff" stroke-width="0.65" />
      <circle cx="22.5" cy="50" r="0.55" fill="#fff" />
      <rect fill="none" width="24" height="43" x="117" y="28.5" stroke="#fff" stroke-width="0.65" />
      <rect fill="none" width="9" height="20" x="132" y="40" stroke="#fff" stroke-width="0.65" />
      <path d="M117 39 A13 13 0 0 0 117 61" fill="none" stroke="#fff" stroke-width="0.65" />
      <circle cx="127.5" cy="50" r="0.55" fill="#fff" />
      <path d="M9 45 H5.5 V55 H9" fill="none" stroke="#fff" stroke-width="0.65" />
      <path d="M141 45 H144.5 V55 H141" fill="none" stroke="#fff" stroke-width="0.65" />
    `;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${FIELD_WIDTH} 100"><defs><pattern id="grid-pattern" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M 8 0 L 0 0 0 8" fill="none" stroke="#cbd5e1" stroke-width="0.2" /></pattern></defs>${inner}</svg>`;
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
