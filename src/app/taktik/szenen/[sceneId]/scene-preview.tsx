"use client";

import Konva from "konva";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Arrow, Circle, Ellipse, Group, Image as KonvaImageNode, Layer, Line, Path, Rect, Stage, Text } from "react-konva";

import {
  FIELD_WIDTH,
  isAreaElement,
  isGoalElement,
  isPathElement,
  isPointElement,
  isPolygonElement,
  normalizeElements,
  normalizePitch,
  pitchSvgMarkup,
  type PathTool,
  type PointElement,
  type SceneElement,
} from "@/app/taktik/szenen/[sceneId]/scene-editor";

type SpeedOption = 0.5 | 1 | 2;

export function ScenePreview({
  pitch,
  steps,
  defaultTransitionMs,
  variant = "editor",
  enableKeyboardShortcuts = false,
}: {
  pitch: string;
  steps: unknown[][];
  defaultTransitionMs: number;
  variant?: "editor" | "presentation";
  enableKeyboardShortcuts?: boolean;
}) {
  const normalizedPitch = useMemo(() => normalizePitch(pitch), [pitch]);
  const normalizedSteps = useMemo(() => steps.map((step) => normalizeElements(step)), [steps]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const nodeRefs = useRef<Record<string, Konva.Node | null>>({});
  const animationRef = useRef<Konva.Animation | null>(null);

  const [mounted, setMounted] = useState(false);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [pitchImage, setPitchImage] = useState<HTMLImageElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [renderedElements, setRenderedElements] = useState<SceneElement[]>(normalizedSteps[0] ?? []);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<SpeedOption>(1);

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
    const uri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(pitchSvgMarkup(normalizedPitch))}`;
    const image = new window.Image();
    image.onload = () => setPitchImage(image);
    image.src = uri;
  }, [normalizedPitch]);

  const toStageX = useCallback((percent: number) => (percent / 100) * size.width, [size.width]);
  const toStageY = useCallback((percent: number) => (percent / 100) * size.height, [size.height]);

  const stopAnimation = useCallback(() => {
    animationRef.current?.stop();
    animationRef.current = null;
  }, []);

  // Transitions between step N and step N+1: elements present in both are interpolated
  // (position/geometry), elements only in the old step fade out in place, elements only in the
  // new step fade in at their final position - see the Szenen plan for why full per-step arrays
  // (not diffs) make this id-based matching straightforward.
  const runTransition = useCallback(
    (fromIndex: number, toIndex: number, durationMs: number, onDone: () => void) => {
      stopAnimation();
      const fromElements = normalizedSteps[fromIndex] ?? [];
      const toElements = normalizedSteps[toIndex] ?? [];
      const fromById = new Map(fromElements.map((element) => [element.id, element]));
      const toById = new Map(toElements.map((element) => [element.id, element]));
      const allIds = new Set([...fromById.keys(), ...toById.keys()]);

      const layer = stageRef.current?.getLayers()[0];
      if (!layer) {
        onDone();
        return;
      }

      let initialized = false;
      const startTime = Date.now();
      const animation = new Konva.Animation(() => {
        if (!initialized) {
          // Deferred to the first animation frame (an async Konva callback) rather than called
          // synchronously here in runTransition's body, since runTransition itself runs inside a
          // useEffect - see the lint rule this avoids (react-hooks/set-state-in-effect).
          setRenderedElements([...fromElements, ...toElements.filter((element) => !fromById.has(element.id))]);
          initialized = true;
        }

        const elapsed = Date.now() - startTime;
        const t = Math.min(1, elapsed / durationMs);
        const eased = easeInOut(t);

        allIds.forEach((id) => {
          const node = nodeRefs.current[id];
          if (!node) {
            return;
          }
          const from = fromById.get(id);
          const to = toById.get(id);

          if (from && to) {
            node.opacity(1);
            applyInterpolatedAttrs(node, from, to, eased, toStageX, toStageY);
          } else if (from && !to) {
            node.opacity(1 - eased);
          } else if (!from && to) {
            node.opacity(eased);
          }
        });

        if (t >= 1) {
          animation.stop();
          setRenderedElements(toElements);
          onDone();
        }
      }, layer);

      animationRef.current = animation;
      animation.start();
    },
    [normalizedSteps, stopAnimation, toStageX, toStageY],
  );

  useEffect(() => {
    if (!isPlaying || activeIndex >= normalizedSteps.length - 1) {
      return;
    }

    const durationMs = defaultTransitionMs / speed;
    const nextIndex = activeIndex + 1;
    runTransition(activeIndex, nextIndex, durationMs, () => {
      setActiveIndex(nextIndex);
      if (nextIndex >= normalizedSteps.length - 1) {
        setIsPlaying(false);
      }
    });

    return () => stopAnimation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, activeIndex]);

  useEffect(() => stopAnimation, [stopAnimation]);

  function goToStep(index: number) {
    const clamped = Math.max(0, Math.min(normalizedSteps.length - 1, index));
    setIsPlaying(false);
    stopAnimation();
    setActiveIndex(clamped);
    setRenderedElements(normalizedSteps[clamped] ?? []);
  }

  useEffect(() => {
    if (!enableKeyboardShortcuts) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      const activeTag = document.activeElement?.tagName;
      if (activeTag === "INPUT" || activeTag === "TEXTAREA" || activeTag === "SELECT") {
        return;
      }

      if (event.key === " " || event.key === "Spacebar") {
        event.preventDefault();
        setIsPlaying((current) => !current);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goToStep(activeIndex + 1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        goToStep(activeIndex - 1);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableKeyboardShortcuts, activeIndex, normalizedSteps.length]);

  const unitScale = size.width > 0 ? size.width / FIELD_WIDTH : 0;
  const isPresentation = variant === "presentation";

  return (
    <section className={isPresentation ? "flex h-full flex-col gap-3" : "space-y-3"}>
      <div
        className={
          isPresentation
            ? "relative min-h-0 flex-1 overflow-hidden rounded-2xl bg-[#1b3a24]"
            : "relative aspect-[3/2] w-full overflow-hidden rounded-2xl border border-border bg-surface-muted shadow-sm"
        }
        ref={containerRef}
      >
        {mounted && size.width > 0 && size.height > 0 ? (
          <Stage height={size.height} ref={stageRef} width={size.width}>
            <Layer>
              {pitchImage ? <KonvaImageNode height={size.height} image={pitchImage} listening={false} width={size.width} /> : null}
              {renderedElements.map((element) => (
                <PreviewElementNode
                  element={element}
                  key={element.id}
                  registerRef={(node) => {
                    nodeRefs.current[element.id] = node;
                  }}
                  toStageX={toStageX}
                  toStageY={toStageY}
                  unitScale={unitScale}
                />
              ))}
            </Layer>
          </Stage>
        ) : null}
      </div>

      <div
        className={
          isPresentation
            ? "flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/60 p-3 shadow-sm backdrop-blur"
            : "flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-3 shadow-sm"
        }
      >
        <div className="flex items-center gap-2">
          <button
            className={`flex size-9 items-center justify-center rounded-lg border transition disabled:opacity-30 ${
              isPresentation ? "border-white/20 text-white hover:border-white" : "border-border text-foreground hover:border-primary"
            }`}
            disabled={activeIndex === 0}
            onClick={() => goToStep(activeIndex - 1)}
            title="Schritt zurueck"
            type="button"
          >
            <SkipBack className="size-4" aria-hidden="true" />
          </button>
          <button
            className="flex size-10 items-center justify-center rounded-lg bg-primary text-white transition hover:bg-primary-strong disabled:opacity-30"
            disabled={normalizedSteps.length <= 1}
            onClick={() => setIsPlaying((current) => !current)}
            title={isPlaying ? "Pause" : "Abspielen"}
            type="button"
          >
            {isPlaying ? <Pause className="size-5" aria-hidden="true" /> : <Play className="size-5" aria-hidden="true" />}
          </button>
          <button
            className={`flex size-9 items-center justify-center rounded-lg border transition disabled:opacity-30 ${
              isPresentation ? "border-white/20 text-white hover:border-white" : "border-border text-foreground hover:border-primary"
            }`}
            disabled={activeIndex >= normalizedSteps.length - 1}
            onClick={() => goToStep(activeIndex + 1)}
            title="Schritt vor"
            type="button"
          >
            <SkipForward className="size-4" aria-hidden="true" />
          </button>
        </div>
        <p className={isPresentation ? "text-sm font-semibold text-white" : "text-sm font-semibold text-muted"}>
          Schritt {activeIndex + 1} / {normalizedSteps.length}
        </p>
        <div className="flex items-center gap-1">
          {([0.5, 1, 2] as SpeedOption[]).map((option) => (
            <button
              className={`h-8 rounded-lg border px-2.5 text-xs font-bold transition ${
                speed === option
                  ? "border-primary bg-primary-soft text-primary"
                  : isPresentation
                    ? "border-white/20 text-white hover:border-white"
                    : "border-border text-muted hover:border-primary"
              }`}
              key={option}
              onClick={() => setSpeed(option)}
              type="button"
            >
              {option}x
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function lerp(from: number, to: number, t: number) {
  return from + (to - from) * t;
}

function applyInterpolatedAttrs(
  node: Konva.Node,
  from: SceneElement,
  to: SceneElement,
  t: number,
  toStageX: (percent: number) => number,
  toStageY: (percent: number) => number,
) {
  if (isPointElement(from) && isPointElement(to)) {
    node.x(lerp(toStageX(from.x), toStageX(to.x), t));
    node.y(lerp(toStageY(from.y), toStageY(to.y), t));
    return;
  }

  if (isPathElement(from) && isPathElement(to) && from.type === to.type) {
    const x1 = lerp(toStageX(from.x1), toStageX(to.x1), t);
    const y1 = lerp(toStageY(from.y1), toStageY(to.y1), t);
    node.x(x1);
    node.y(y1);
    node.setAttr("dx", lerp(toStageX(from.x2) - toStageX(from.x1), toStageX(to.x2) - toStageX(to.x1), t));
    node.setAttr("dy", lerp(toStageY(from.y2) - toStageY(from.y1), toStageY(to.y2) - toStageY(to.y1), t));
    return;
  }

  if ((isAreaElement(from) && isAreaElement(to)) || (isGoalElement(from) && isGoalElement(to))) {
    node.x(lerp(toStageX(from.x), toStageX(to.x), t));
    node.y(lerp(toStageY(from.y), toStageY(to.y), t));
    node.width(lerp(toStageX(from.width), toStageX(to.width), t));
    node.height(lerp(toStageY(from.height), toStageY(to.height), t));
    return;
  }

  if (isPolygonElement(from) && isPolygonElement(to) && from.points.length === to.points.length) {
    const points = from.points.flatMap((point, index) => {
      const target = to.points[index];
      return [lerp(toStageX(point.x), toStageX(target.x), t), lerp(toStageY(point.y), toStageY(target.y), t)];
    });
    node.setAttr("points", points);
  }
}

function PreviewElementNode({
  element,
  unitScale,
  toStageX,
  toStageY,
  registerRef,
}: {
  element: SceneElement;
  unitScale: number;
  toStageX: (percent: number) => number;
  toStageY: (percent: number) => number;
  registerRef: (node: Konva.Node | null) => void;
}) {
  if (isPointElement(element)) {
    const iconScale = unitScale * 0.7;
    return (
      <Group listening={false} ref={registerRef} x={toStageX(element.x)} y={toStageY(element.y)}>
        <Group scaleX={iconScale} scaleY={iconScale}>
          <PreviewPointSymbol element={element} />
        </Group>
      </Group>
    );
  }

  if (isPathElement(element)) {
    const dx = toStageX(element.x2) - toStageX(element.x1);
    const dy = toStageY(element.y2) - toStageY(element.y1);
    const points = pathPreviewPoints(element.type, dx, dy, unitScale);
    const stroke = element.type === "DRIBBLE" ? "#f97316" : element.type === "LINE" ? "#334155" : element.type === "SHOT" ? "#dc2626" : "#0f172a";
    const showArrowHead = element.type !== "LINE";

    return (
      <Group listening={false} ref={registerRef} x={toStageX(element.x1)} y={toStageY(element.y1)}>
        <Arrow
          dash={element.type === "DRIBBLE" ? [1.1 * unitScale, 0.9 * unitScale] : undefined}
          fill={stroke}
          lineCap="round"
          points={points}
          pointerLength={showArrowHead ? Math.max(5, 3 * unitScale) : 0}
          pointerWidth={showArrowHead ? Math.max(5, 3 * unitScale) : 0}
          stroke={stroke}
          strokeWidth={element.type === "SHOT" ? Math.max(1.6, 1.2 * unitScale) : Math.max(1, 0.7 * unitScale)}
          tension={element.type === "CURVED_ARROW" ? 0.5 : 0}
        />
      </Group>
    );
  }

  if (isPolygonElement(element)) {
    const points = element.points.flatMap((point) => [toStageX(point.x), toStageY(point.y)]);
    return <Line closed fill="#0b63ce22" listening={false} points={points} ref={registerRef as never} stroke="#0b63ce" strokeWidth={Math.max(1, 0.55 * unitScale)} />;
  }

  const xPx = toStageX(element.x);
  const yPx = toStageY(element.y);
  const widthPx = toStageX(element.width);
  const heightPx = toStageY(element.height);

  if (isGoalElement(element)) {
    const postWidth = Math.max(1, 0.05 * Math.min(widthPx, heightPx));
    return (
      <Group listening={false} ref={registerRef} x={xPx} y={yPx}>
        <Rect fill="#f8fafc" height={heightPx} stroke="#334155" strokeWidth={postWidth} width={widthPx} />
      </Group>
    );
  }

  const isCircle = element.type === "ZONE_CIRCLE";
  return (
    <Group listening={false} ref={registerRef} x={xPx} y={yPx}>
      {isCircle ? (
        <Ellipse fill="#f9731622" radiusX={widthPx / 2} radiusY={heightPx / 2} stroke="#f97316" strokeWidth={Math.max(1, 0.55 * unitScale)} x={widthPx / 2} y={heightPx / 2} />
      ) : (
        <Rect cornerRadius={4 * unitScale} fill="#0b63ce22" height={heightPx} stroke="#0b63ce" strokeWidth={Math.max(1, 0.55 * unitScale)} width={widthPx} />
      )}
    </Group>
  );
}

function pathPreviewPoints(type: PathTool, dx: number, dy: number, unitScale: number): number[] {
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

function PreviewPointSymbol({ element }: { element: PointElement }) {
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
