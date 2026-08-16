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

import { SubmitButton } from "@/components/submit-button";
import { saveTacticSceneStep } from "@/lib/actions";

// Own, independent copy of the sketch-editor's coordinate model (see
// src/app/training/[exerciseId]/sketch-editor.tsx): elements store x/y (and width/height,
// x1/y1/x2/y2, or a points[] array) as 0-100 percentages of the pitch, the Konva Stage is sized
// to the actual container pixels via ResizeObserver. Deliberately NOT shared/imported from the
// training sketch editor (see the Szenen plan) to avoid any regression risk on that already
// stable feature - a later consolidation is a separate, unscheduled effort.
export const FIELD_WIDTH = 150;

export type PitchType = "FULL_FIELD" | "HALF_FIELD" | "PENALTY_AREA" | "SMALL_FIELD" | "FREE_AREA";

export type PointTool = "PLAYER_BLUE" | "PLAYER_RED" | "PLAYER_YELLOW" | "GOALKEEPER" | "BALL" | "CONE" | "PYLON" | "DUMMY" | "TACTIC_CIRCLE" | "TEXT";
export type GoalTool = "GOAL" | "MINI_GOAL";
export type PathTool = "ARROW" | "SHOT" | "LINE" | "DRIBBLE" | "CURVED_ARROW";
export type AreaTool = "ZONE_RECT" | "ZONE_CIRCLE";
export type PolygonTool = "POLYGON";
export type Tool = PointTool | GoalTool | PathTool | AreaTool | PolygonTool | "SELECT";

export type BaseElement = { id: string; type: Tool };
export type PointElement = BaseElement & { type: PointTool; x: number; y: number; label?: string };
export type PathElement = BaseElement & { type: PathTool; x1: number; y1: number; x2: number; y2: number };
export type AreaElement = BaseElement & { type: AreaTool; x: number; y: number; width: number; height: number };
export type GoalElement = BaseElement & { type: GoalTool; x: number; y: number; width: number; height: number };
export type PolygonElement = BaseElement & { type: PolygonTool; points: { x: number; y: number }[] };
export type SceneElement = PointElement | PathElement | AreaElement | GoalElement | PolygonElement;

export const goalDefaults: Record<GoalTool, { width: number; height: number }> = {
  GOAL: { width: 7, height: 5 },
  MINI_GOAL: { width: 5, height: 3.5 },
};

const pitchOptions: Array<{ value: PitchType; label: string }> = [
  { value: "FULL_FIELD", label: "Ganzes Feld" },
  { value: "HALF_FIELD", label: "Halbes Feld" },
  { value: "PENALTY_AREA", label: "Strafraum" },
  { value: "SMALL_FIELD", label: "Kleinfeld" },
  { value: "FREE_AREA", label: "Freie Flaeche" },
];

const toolGroups: Array<{ title: string; tools: Array<{ value: Tool; label: string; hint: string }> }> = [
  { title: "Bearbeiten", tools: [{ value: "SELECT", label: "Auswahl", hint: "Elemente anklicken und verschieben" }] },
  {
    title: "Spieler",
    tools: [
      { value: "PLAYER_BLUE", label: "Spieler blau", hint: "Eigenes Team" },
      { value: "PLAYER_RED", label: "Spieler rot", hint: "Gegner" },
      { value: "PLAYER_YELLOW", label: "Spieler gelb", hint: "Neutral" },
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
      { value: "GOAL", label: "Tor", hint: "Grosses Tor, per Eckpunkt anpassbar" },
      { value: "MINI_GOAL", label: "Minitor", hint: "Minitor, per Eckpunkt anpassbar" },
    ],
  },
  {
    title: "Analyse",
    tools: [
      { value: "TACTIC_CIRCLE", label: "Nummer", hint: "Nummerierter Kreis fuer Bewegungsreihenfolge" },
      { value: "ZONE_RECT", label: "Zone", hint: "Rechteckige Zone markieren" },
      { value: "ZONE_CIRCLE", label: "Kreiszone", hint: "Runde Zone markieren" },
      { value: "POLYGON", label: "Freiflaeche", hint: "Mehrere Punkte anklicken, mit Doppelklick oder Enter schliessen - fuer Passdreiecke/Raeume" },
      { value: "TEXT", label: "Text", hint: "Kurzen Hinweis platzieren" },
    ],
  },
  {
    title: "Ablauf",
    tools: [
      { value: "ARROW", label: "Pfeil", hint: "Laufweg/Passweg ziehen" },
      { value: "SHOT", label: "Torschuss", hint: "Kraeftiger roter Pfeil" },
      { value: "LINE", label: "Linie", hint: "Gerade Verbindung ziehen" },
      { value: "DRIBBLE", label: "Dribbling", hint: "Gewellte Linie ziehen" },
      { value: "CURVED_ARROW", label: "Bogen", hint: "Gebogenen Laufweg ziehen" },
    ],
  },
];

const categoryTabs: Array<{ id: string; label: string }> = [
  { id: "feldvorlage", label: "Feldvorlage" },
  ...toolGroups.map((group) => ({ id: group.title.toLowerCase(), label: group.title })),
];

const pointToolTypes = new Set<Tool>(["PLAYER_BLUE", "PLAYER_RED", "PLAYER_YELLOW", "GOALKEEPER", "BALL", "CONE", "PYLON", "DUMMY", "TACTIC_CIRCLE", "TEXT"]);
const pathToolTypes = new Set<Tool>(["ARROW", "SHOT", "LINE", "DRIBBLE", "CURVED_ARROW"]);
const areaToolTypes = new Set<Tool>(["ZONE_RECT", "ZONE_CIRCLE"]);
const goalToolTypes = new Set<Tool>(["GOAL", "MINI_GOAL"]);

type Point = { x: number; y: number };

type SceneEditorContextValue = {
  sceneId: string;
  stepId: string | null;
  pitch: PitchType;
  elements: SceneElement[];
  tool: Tool;
  toolCategory: string;
  selectedId: string | null;
  selectedElement: SceneElement | null | undefined;
  elementsData: string;
  selectPitch: (value: PitchType) => void;
  selectTool: (value: Tool) => void;
  setToolCategory: (value: string) => void;
  addElement: (element: SceneElement) => void;
  updateElement: (id: string, patch: Partial<SceneElement>) => void;
  selectElement: (id: string | null) => void;
  deleteSelected: () => void;
  editSelectedText: () => void;
  clearScene: () => void;
};

const SceneEditorContext = createContext<SceneEditorContextValue | null>(null);

function useSceneEditorContext() {
  const value = useContext(SceneEditorContext);
  if (!value) {
    throw new Error("SceneToolPanel/SceneCanvasPanel must be used within a SceneEditorProvider");
  }
  return value;
}

export function SceneEditorProvider({
  sceneId,
  stepId,
  initialPitch,
  initialElements,
  children,
}: {
  sceneId: string;
  stepId: string | null;
  initialPitch: string;
  initialElements: unknown[];
  children: ReactNode;
}) {
  const [pitch, setPitch] = useState<PitchType>(() => normalizePitch(initialPitch));
  const [elements, setElements] = useState<SceneElement[]>(() => normalizeElements(initialElements));
  const [tool, setTool] = useState<Tool>("SELECT");
  const [toolCategory, setToolCategory] = useState<string>("feldvorlage");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const elementsData = useMemo(() => JSON.stringify(elements), [elements]);
  const selectedElement = selectedId ? elements.find((element) => element.id === selectedId) : null;

  function addElement(element: SceneElement) {
    setElements((current) => [...current, element]);
    setSelectedId(element.id);
    setTool("SELECT");
  }

  function updateElement(id: string, patch: Partial<SceneElement>) {
    setElements((current) => current.map((element) => (element.id === id ? ({ ...element, ...patch } as SceneElement) : element)));
  }

  function selectElement(id: string | null) {
    setSelectedId(id);
  }

  function deleteSelected() {
    if (!selectedId) {
      return;
    }
    setElements((current) => current.filter((element) => element.id !== selectedId));
    setSelectedId(null);
  }

  function editSelectedText() {
    if (!selectedElement || !isPointElement(selectedElement)) {
      return;
    }
    const label = window.prompt("Label bearbeiten", selectedElement.label ?? "")?.trim();
    if (!label) {
      return;
    }
    setElements((current) => current.map((element) => (element.id === selectedElement.id ? { ...element, label } : element)));
  }

  function clearScene() {
    if (elements.length === 0) {
      return;
    }
    setElements([]);
    setSelectedId(null);
  }

  return (
    <SceneEditorContext.Provider
      value={{
        sceneId,
        stepId,
        pitch,
        elements,
        tool,
        toolCategory,
        selectedId,
        selectedElement,
        elementsData,
        selectPitch: setPitch,
        selectTool: setTool,
        setToolCategory,
        addElement,
        updateElement,
        selectElement,
        deleteSelected,
        editSelectedText,
        clearScene,
      }}
    >
      {children}
    </SceneEditorContext.Provider>
  );
}

export function SceneToolPanel() {
  const { pitch, tool, toolCategory, selectPitch, selectTool, setToolCategory } = useSceneEditorContext();

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

      {toolCategory === "feldvorlage" ? (
        <div className="grid gap-1.5">
          {pitchOptions.map((option) => (
            <button
              className={`rounded-lg border p-2 text-left text-sm font-bold transition ${
                pitch === option.value ? "border-primary bg-primary-soft text-primary" : "border-border bg-surface text-foreground hover:border-primary"
              }`}
              key={option.value}
              onClick={() => selectPitch(option.value)}
              type="button"
            >
              {option.label}
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
                    tool === item.value ? "border-primary bg-primary text-white shadow-sm" : "border-border bg-surface-muted text-foreground hover:border-primary hover:bg-surface"
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

export function SceneCanvasPanel() {
  const { sceneId, stepId, pitch, elements, tool, selectedId, selectedElement, elementsData, addElement, updateElement, selectElement, deleteSelected, editSelectedText, clearScene } =
    useSceneEditorContext();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const shapeRefs = useRef<Record<string, Konva.Node | null>>({});

  const [mounted, setMounted] = useState(false);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [drawStart, setDrawStart] = useState<Point | null>(null);
  const [drawPreview, setDrawPreview] = useState<Point | null>(null);
  const [polygonPoints, setPolygonPoints] = useState<Point[]>([]);
  const [pitchImage, setPitchImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }
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
    if (node && selected && isResizableElement(selected)) {
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
      } else if (event.key === "Enter" && polygonPoints.length >= 3) {
        finalizePolygon();
      } else if (event.key === "Escape") {
        setDrawStart(null);
        setDrawPreview(null);
        setPolygonPoints([]);
        selectElement(null);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deleteSelected, selectElement, polygonPoints]);

  const toStageX = useCallback((percent: number) => (percent / 100) * size.width, [size.width]);
  const toStageY = useCallback((percent: number) => (percent / 100) * size.height, [size.height]);
  const toPercentX = useCallback((px: number) => (size.width ? (px / size.width) * 100 : 0), [size.width]);
  const toPercentY = useCallback((px: number) => (size.height ? (px / size.height) * 100 : 0), [size.height]);
  const unitScale = size.width > 0 ? size.width / FIELD_WIDTH : 0;

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
    addElement({ id: createId(), type: tool as PathTool, x1: drawStart.x, y1: drawStart.y, x2: endPoint.x, y2: endPoint.y });
    setDrawStart(null);
    setDrawPreview(null);
  }

  function finalizePolygon() {
    if (polygonPoints.length < 3) {
      return;
    }
    addElement({ id: createId(), type: "POLYGON", points: polygonPoints });
    setPolygonPoints([]);
  }

  function handleStageMouseDown(event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
    const point = getRelativePoint();
    if (!point) {
      return;
    }

    if (tool === "SELECT") {
      // Only clear selection on an actual empty-background click - a mousedown on a shape
      // (or the Transformer's own resize handles) also bubbles up to the Stage, and clearing
      // selection there would detach the Transformer mid-drag (see sketch-editor.tsx fix).
      if (event.target === event.target.getStage()) {
        selectElement(null);
      }
      return;
    }

    if (tool === "POLYGON") {
      if (polygonPoints.length >= 3) {
        const first = polygonPoints[0];
        const distance = Math.hypot(point.x - first.x, point.y - first.y);
        if (distance < 3) {
          finalizePolygon();
          return;
        }
      }
      setPolygonPoints((current) => [...current, point]);
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

    if (goalToolTypes.has(tool)) {
      const { width, height } = goalDefaults[tool as GoalTool];
      addElement({ id: createId(), type: tool as GoalTool, x: clamp(point.x - width / 2, 1, 99 - width), y: clamp(point.y - height / 2, 1, 99 - height), width, height });
      return;
    }

    if (pointToolTypes.has(tool)) {
      const label = tool === "TEXT" ? window.prompt("Text fuer die Szene", "Coachingpunkt")?.trim() : undefined;
      if (tool === "TEXT" && !label) {
        return;
      }
      addElement({ id: createId(), type: tool as PointTool, x: point.x, y: point.y, label: tool === "TEXT" ? label : defaultLabel(tool) });
    }
  }

  function handleStageMouseMove() {
    if (drawStart) {
      const point = getRelativePoint();
      if (point) {
        setDrawPreview(point);
      }
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

  function handleStageDoubleClick() {
    if (tool === "POLYGON" && polygonPoints.length >= 3) {
      finalizePolygon();
    }
  }

  const hint = drawStart
    ? "Loslassen oder zweiten Punkt setzen, um das Element abzuschliessen."
    : polygonPoints.length > 0
      ? `${polygonPoints.length} Punkte gesetzt - weiter klicken, am Startpunkt klicken oder Enter zum Schliessen.`
      : selectedElement
        ? `Ausgewaehlt: ${elementLabel(selectedElement.type)}`
        : "Werkzeug waehlen, aufs Feld klicken und Elemente direkt verschieben.";

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground">Szenen-Zeichenflaeche</p>
          <p className="text-sm text-muted">{hint}</p>
        </div>
        <div className="flex flex-wrap gap-2">
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
          <button className="rounded-xl border border-border px-4 py-2 text-sm font-bold text-foreground" onClick={clearScene} type="button">
            Leeren
          </button>
        </div>
      </div>

      <div className="relative aspect-[3/2] w-full overflow-hidden rounded-2xl border border-border bg-surface-muted shadow-sm" ref={containerRef}>
        {mounted && size.width > 0 && size.height > 0 ? (
          <Stage
            height={size.height}
            onDblClick={handleStageDoubleClick}
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
                  key={element.id}
                  onDragEnd={(patch) => updateElement(element.id, patch)}
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
                <PreviewPath end={drawPreview} start={drawStart} toStageX={toStageX} toStageY={toStageY} type={tool as PathTool} unitScale={unitScale} />
              ) : null}
              {polygonPoints.length > 0 ? (
                <Line
                  closed={false}
                  dash={[3, 3]}
                  points={polygonPoints.flatMap((point) => [toStageX(point.x), toStageY(point.y)])}
                  stroke="#0b63ce"
                  strokeWidth={2}
                />
              ) : null}
              <Transformer ref={transformerRef} rotateEnabled={false} />
            </Layer>
          </Stage>
        ) : null}
      </div>

      <form action={saveTacticSceneStep} className="flex flex-wrap justify-end gap-3">
        <input name="sceneId" type="hidden" value={sceneId} />
        <input name="stepId" type="hidden" value={stepId ?? ""} />
        <input name="elementsData" type="hidden" value={elementsData} />
        <SubmitButton
          className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-60"
          pendingLabel="Speichert..."
        >
          Szene speichern
        </SubmitButton>
      </form>
    </section>
  );
}

type ElementNodeProps = {
  element: SceneElement;
  selected: boolean;
  unitScale: number;
  toStageX: (percent: number) => number;
  toStageY: (percent: number) => number;
  toPercentX: (px: number) => number;
  toPercentY: (px: number) => number;
  registerRef: (node: Konva.Node | null) => void;
  onSelect: () => void;
  onDragEnd: (patch: Partial<SceneElement>) => void;
  onTransformEnd: (patch: Partial<SceneElement>) => void;
};

function ElementNode({ element, selected, unitScale, toStageX, toStageY, toPercentX, toPercentY, registerRef, onSelect, onDragEnd, onTransformEnd }: ElementNodeProps) {
  if (isPointElement(element)) {
    const iconScale = unitScale * 0.7;
    const hitRadius = Math.max(16, 6 * unitScale);

    return (
      <Group
        draggable
        onClick={onSelect}
        onDragEnd={(event) => onDragEnd({ x: toPercentX(event.target.x()), y: toPercentY(event.target.y()) })}
        onDragStart={onSelect}
        onTap={onSelect}
        ref={registerRef}
        x={toStageX(element.x)}
        y={toStageY(element.y)}
      >
        <Circle fill="transparent" radius={hitRadius} />
        <Group scaleX={iconScale} scaleY={iconScale}>
          <PointSymbol element={element} />
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
    const stroke = element.type === "DRIBBLE" ? "#f97316" : element.type === "LINE" ? "#334155" : element.type === "SHOT" ? "#dc2626" : "#0f172a";
    const showArrowHead = element.type !== "LINE";
    const strokeWidth = element.type === "SHOT" ? Math.max(1.6, 1.2 * unitScale) : Math.max(1, 0.7 * unitScale);
    const arrowHeadSize = element.type === "SHOT" ? Math.max(7, 4.2 * unitScale) : Math.max(5, 3 * unitScale);
    const hitStrokeWidth = Math.max(18, 6 * unitScale);

    return (
      <Group
        draggable
        onClick={onSelect}
        onDragEnd={(event) => {
          const newX1 = toPercentX(event.target.x());
          const newY1 = toPercentY(event.target.y());
          onDragEnd({ x1: newX1, y1: newY1, x2: newX1 + (element.x2 - element.x1), y2: newY1 + (element.y2 - element.y1) });
        }}
        onDragStart={onSelect}
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
          pointerLength={showArrowHead ? arrowHeadSize : 0}
          pointerWidth={showArrowHead ? arrowHeadSize : 0}
          stroke={stroke}
          strokeWidth={strokeWidth}
          tension={element.type === "CURVED_ARROW" ? 0.5 : 0}
        />
      </Group>
    );
  }

  if (isPolygonElement(element)) {
    const stagePoints = element.points.flatMap((point) => [toStageX(point.x), toStageY(point.y)]);
    const centerX = element.points.reduce((total, point) => total + point.x, 0) / element.points.length;
    const centerY = element.points.reduce((total, point) => total + point.y, 0) / element.points.length;

    return (
      <Group
        draggable
        onClick={onSelect}
        onDragEnd={(event) => {
          const deltaX = toPercentX(event.target.x()) - centerX;
          const deltaY = toPercentY(event.target.y()) - centerY;
          event.target.position({ x: 0, y: 0 });
          onDragEnd({ points: element.points.map((point) => ({ x: clamp(point.x + deltaX, 0, 100), y: clamp(point.y + deltaY, 0, 100) })) });
        }}
        onDragStart={onSelect}
        onTap={onSelect}
        ref={registerRef}
      >
        <Line closed dash={selected ? [4, 3] : undefined} fill="#0b63ce22" points={stagePoints} stroke="#0b63ce" strokeWidth={Math.max(1, 0.55 * unitScale)} />
      </Group>
    );
  }

  const xPx = toStageX(element.x);
  const yPx = toStageY(element.y);
  const widthPx = toStageX(element.width);
  const heightPx = toStageY(element.height);

  if (isGoalElement(element)) {
    const postWidth = Math.max(1, 0.05 * Math.min(widthPx, heightPx));

    return (
      <Group
        draggable
        onClick={onSelect}
        onDragEnd={(event) => onDragEnd({ x: toPercentX(event.target.x()), y: toPercentY(event.target.y()) })}
        onDragStart={onSelect}
        onTap={onSelect}
        onTransformEnd={(event) => {
          const node = event.target;
          const newWidthPx = widthPx * node.scaleX();
          const newHeightPx = heightPx * node.scaleY();
          node.scaleX(1);
          node.scaleY(1);
          onTransformEnd({ x: toPercentX(node.x()), y: toPercentY(node.y()), width: clamp(toPercentX(newWidthPx), 2, 100), height: clamp(toPercentY(newHeightPx), 2, 100) });
        }}
        ref={registerRef}
        x={xPx}
        y={yPx}
      >
        <Rect fill="#f8fafc" height={heightPx} stroke="#334155" strokeWidth={postWidth} width={widthPx} />
        <Path
          data={`M${widthPx * 0.07} 0 V${heightPx} M${widthPx / 2} 0 V${heightPx} M${widthPx * 0.93} 0 V${heightPx} M0 ${heightPx / 2} H${widthPx}`}
          stroke="#cbd5e1"
          strokeWidth={postWidth * 0.5}
        />
        {selected ? <Rect dash={[3, 3]} fill="transparent" height={heightPx} listening={false} stroke="#0b63ce" strokeWidth={Math.max(1, 0.35 * unitScale)} width={widthPx} /> : null}
      </Group>
    );
  }

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
      onTap={onSelect}
      onTransformEnd={(event) => {
        const node = event.target;
        const newWidthPx = widthPx * node.scaleX();
        const newHeightPx = heightPx * node.scaleY();
        node.scaleX(1);
        node.scaleY(1);
        onTransformEnd({ x: toPercentX(node.x()), y: toPercentY(node.y()), width: clamp(toPercentX(newWidthPx), 4, 100), height: clamp(toPercentY(newHeightPx), 4, 100) });
      }}
      ref={registerRef}
      x={xPx}
      y={yPx}
    >
      {isCircle ? (
        <Ellipse dash={dash} fill={fill} radiusX={widthPx / 2} radiusY={heightPx / 2} stroke={stroke} strokeWidth={strokeWidth} x={widthPx / 2} y={heightPx / 2} />
      ) : (
        <Rect cornerRadius={4 * unitScale} dash={dash} fill={fill} height={heightPx} stroke={stroke} strokeWidth={strokeWidth} width={widthPx} />
      )}
      {selected ? <Rect dash={[3, 3]} fill="transparent" height={heightPx} listening={false} stroke="#0b63ce" strokeWidth={Math.max(1, 0.35 * unitScale)} width={widthPx} /> : null}
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
  const color = type === "SHOT" ? "#dc2626" : "#0b63ce";

  return (
    <Arrow
      dash={type === "DRIBBLE" ? [1.1 * unitScale, 0.9 * unitScale] : [2, 2]}
      fill={color}
      lineCap="round"
      listening={false}
      opacity={0.6}
      points={points}
      pointerLength={showArrowHead ? Math.max(5, 3 * unitScale) : 0}
      pointerWidth={showArrowHead ? Math.max(5, 3 * unitScale) : 0}
      stroke={color}
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

function PointSymbol({ element }: { element: PointElement }) {
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
  if (element.type === "TACTIC_CIRCLE") {
    return (
      <>
        <Circle fill="#ef4444" radius={3.2} stroke="#111827" strokeWidth={0.35} />
        <Text align="center" fill="#fff" fontSize={3.2} fontStyle="bold" height={6.4} text={element.label ?? "1"} verticalAlign="middle" width={6.4} x={-3.2} y={-3.2} />
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
      <Path data="M-1.4 2.8 L-2.1 4.2 M1.4 2.8 L2.1 4.2 M-1.8 -0.8 L-3.1 0.8 M1.8 -0.8 L3.1 0.8" lineCap="round" stroke="#111827" strokeWidth={0.35} />
      {element.label ? <Text align="center" fill="#fff" fontSize={2} fontStyle="bold" height={2} text={element.label} verticalAlign="middle" width={4} x={-2} y={-1.1} /> : null}
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

export function pitchSvgMarkup(pitch: PitchType): string {
  let inner: string;

  if (pitch === "FREE_AREA") {
    inner = `<rect fill="#7dbb68" width="${FIELD_WIDTH}" height="100" />`;
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
      <path d="M61 91 A14 14 0 0 1 89 91" fill="none" stroke="#fff" stroke-width="0.65" />
      <circle cx="75" cy="91" r="0.55" fill="#fff" />
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
      <rect fill="none" width="24" height="43" x="117" y="28.5" stroke="#fff" stroke-width="0.65" />
      <rect fill="none" width="9" height="20" x="132" y="40" stroke="#fff" stroke-width="0.65" />
      <path d="M117 39 A13 13 0 0 0 117 61" fill="none" stroke="#fff" stroke-width="0.65" />
    `;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${FIELD_WIDTH} 100">${inner}</svg>`;
}

export function normalizeElements(elements: unknown[]): SceneElement[] {
  const normalized: Array<SceneElement | null> = (Array.isArray(elements) ? elements : []).map((element) => {
    if (!element || typeof element !== "object") {
      return null;
    }
    const value = element as Record<string, unknown>;
    if (!value.id || typeof value.id !== "string" || !value.type || typeof value.type !== "string") {
      return null;
    }

    if (value.type === "POLYGON" && Array.isArray(value.points)) {
      const points = (value.points as unknown[])
        .map((point) => {
          if (!point || typeof point !== "object") {
            return null;
          }
          const pointValue = point as Record<string, unknown>;
          return hasNumber(pointValue, "x") && hasNumber(pointValue, "y") ? { x: Number(pointValue.x), y: Number(pointValue.y) } : null;
        })
        .filter((point): point is Point => point !== null);
      return points.length >= 3 ? { id: value.id, type: "POLYGON", points } : null;
    }

    if (pathToolTypes.has(value.type as Tool) && hasNumber(value, "x1") && hasNumber(value, "y1") && hasNumber(value, "x2") && hasNumber(value, "y2")) {
      return { id: value.id, type: value.type as PathTool, x1: Number(value.x1), y1: Number(value.y1), x2: Number(value.x2), y2: Number(value.y2) };
    }

    if (areaToolTypes.has(value.type as Tool) && hasNumber(value, "x") && hasNumber(value, "y") && hasNumber(value, "width") && hasNumber(value, "height")) {
      return { id: value.id, type: value.type as AreaTool, x: Number(value.x), y: Number(value.y), width: Number(value.width), height: Number(value.height) };
    }

    if (goalToolTypes.has(value.type as Tool) && hasNumber(value, "x") && hasNumber(value, "y")) {
      const goalType = value.type as GoalTool;
      const defaults = goalDefaults[goalType];
      const hasSize = hasNumber(value, "width") && hasNumber(value, "height");
      const width = hasSize ? Number(value.width) : defaults.width;
      const height = hasSize ? Number(value.height) : defaults.height;
      return { id: value.id, type: goalType, x: Number(value.x), y: Number(value.y), width, height };
    }

    if (pointToolTypes.has(value.type as Tool) && hasNumber(value, "x") && hasNumber(value, "y")) {
      return { id: value.id, type: value.type as PointTool, x: Number(value.x), y: Number(value.y), label: typeof value.label === "string" ? value.label : defaultLabel(value.type as Tool) };
    }

    return null;
  });

  return normalized.filter((element): element is SceneElement => Boolean(element));
}

function defaultLabel(toolType: Tool) {
  if (toolType === "TACTIC_CIRCLE") {
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

export function isPointElement(element: SceneElement): element is PointElement {
  return pointToolTypes.has(element.type);
}

export function isPathElement(element: SceneElement): element is PathElement {
  return pathToolTypes.has(element.type);
}

export function isAreaElement(element: SceneElement): element is AreaElement {
  return areaToolTypes.has(element.type);
}

export function isGoalElement(element: SceneElement): element is GoalElement {
  return goalToolTypes.has(element.type);
}

export function isPolygonElement(element: SceneElement): element is PolygonElement {
  return element.type === "POLYGON";
}

function isResizableElement(element: SceneElement): element is AreaElement | GoalElement {
  return isAreaElement(element) || isGoalElement(element);
}

function hasNumber(value: object, key: string) {
  return key in value && typeof (value as Record<string, unknown>)[key] === "number";
}

export function normalizePitch(value: string): PitchType {
  return pitchOptions.some((option) => option.value === value) ? (value as PitchType) : "FULL_FIELD";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function createId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `element-${Date.now()}-${Math.random()}`;
}
