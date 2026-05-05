import type { ReactNode } from "react";

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

type PointElement = {
  id: string;
  type: PointTool;
  x: number;
  y: number;
  label?: string;
};

type PathElement = {
  id: string;
  type: PathTool;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

type AreaElement = {
  id: string;
  type: AreaTool;
  x: number;
  y: number;
  width: number;
  height: number;
};

type SketchElement = PointElement | PathElement | AreaElement;

const pitchTypes = new Set<PitchType>(["FULL_FIELD", "HALF_FIELD", "PENALTY_AREA", "SMALL_FIELD", "FREE_AREA"]);
const pointTypes = new Set<string>([
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
const pathTypes = new Set<string>(["ARROW", "LINE", "DRIBBLE", "CURVED_ARROW"]);
const areaTypes = new Set<string>(["ZONE_RECT", "ZONE_CIRCLE"]);

export function TrainingSketchPreview({
  sketchData,
  fallbackPitch,
  compact = false,
}: {
  sketchData: unknown;
  fallbackPitch: string;
  compact?: boolean;
}) {
  const sketch = parseSketchData(sketchData, fallbackPitch);
  const hasSketch = sketch.elements.length > 0;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
      <svg
        aria-label={hasSketch ? "Trainingsskizze Vorschau" : "Leere Trainingsskizze"}
        className={`block w-full ${compact ? "aspect-[4/2.7]" : "aspect-[4/3]"}`}
        role="img"
        viewBox="0 0 100 100"
      >
        <defs>
          <marker id="preview-arrow" markerHeight="4" markerWidth="4" orient="auto" refX="3" refY="2" viewBox="0 0 4 4">
            <path d="M0,0 L4,2 L0,4 Z" fill="#0f172a" />
          </marker>
          <pattern height="8" id="preview-grid" patternUnits="userSpaceOnUse" width="8">
            <path d="M 8 0 L 0 0 0 8" fill="none" stroke="#cbd5e1" strokeWidth="0.2" />
          </pattern>
        </defs>
        <PitchTemplate pitch={sketch.pitch} />
        {sketch.elements.map((element) => (
          <PreviewElement element={element} key={element.id} />
        ))}
        {!hasSketch ? (
          <g>
            <rect fill="#ffffffcc" height="14" rx="3" width="54" x="23" y="43" />
            <text fill="#64748b" fontSize="4" fontWeight="700" textAnchor="middle" x="50" y="51.5">
              Noch keine Skizze
            </text>
          </g>
        ) : null}
      </svg>
    </div>
  );
}

function parseSketchData(value: unknown, fallbackPitch: string) {
  if (!value || typeof value !== "object") {
    return {
      pitch: normalizePitch(fallbackPitch),
      elements: [],
    };
  }

  const sketch = value as { pitch?: unknown; elements?: unknown };

  return {
    pitch: normalizePitch(typeof sketch.pitch === "string" ? sketch.pitch : fallbackPitch),
    elements: Array.isArray(sketch.elements) ? normalizeElements(sketch.elements) : [],
  };
}

function normalizeElements(elements: unknown[]): SketchElement[] {
  const normalized: Array<SketchElement | null> = elements.map((element, index) => {
    if (!element || typeof element !== "object") {
      return null;
    }

    const value = element as Record<string, unknown>;
    const id = typeof value.id === "string" ? value.id : `preview-${index}`;
    const type = typeof value.type === "string" ? value.type : "";

    if (pathTypes.has(type) && hasNumber(value, "x1") && hasNumber(value, "y1") && hasNumber(value, "x2") && hasNumber(value, "y2")) {
      return {
        id,
        type: type as PathTool,
        x1: Number(value.x1),
        y1: Number(value.y1),
        x2: Number(value.x2),
        y2: Number(value.y2),
      };
    }

    if (areaTypes.has(type) && hasNumber(value, "x") && hasNumber(value, "y") && hasNumber(value, "width") && hasNumber(value, "height")) {
      return {
        id,
        type: type as AreaTool,
        x: Number(value.x),
        y: Number(value.y),
        width: Number(value.width),
        height: Number(value.height),
      };
    }

    if (pointTypes.has(type) && hasNumber(value, "x") && hasNumber(value, "y")) {
      return {
        id,
        type: type as PointTool,
        x: Number(value.x),
        y: Number(value.y),
        label: typeof value.label === "string" ? value.label : undefined,
      };
    }

    return null;
  });

  return normalized.filter((element): element is SketchElement => Boolean(element));
}

function PitchTemplate({ pitch }: { pitch: PitchType }) {
  if (pitch === "FREE_AREA") {
    return (
      <>
        <rect fill="#f8fafc" height="100" width="100" />
        <rect fill="url(#preview-grid)" height="100" width="100" />
        <rect fill="none" height="86" rx="2" stroke="#94a3b8" strokeDasharray="2 2" strokeWidth="0.55" width="88" x="6" y="7" />
      </>
    );
  }

  if (pitch === "PENALTY_AREA") {
    return (
      <FieldBase>
        <rect fill="none" height="46" stroke="#fff" strokeWidth="0.75" width="72" x="14" y="14" />
        <rect fill="none" height="18" stroke="#fff" strokeWidth="0.75" width="32" x="34" y="14" />
        <rect fill="none" height="6" stroke="#fff" strokeWidth="0.75" width="14" x="43" y="14" />
        <path d="M34 60 A16 16 0 0 0 66 60" fill="none" stroke="#fff" strokeWidth="0.75" />
        <circle cx="50" cy="44" fill="#fff" r="0.6" />
      </FieldBase>
    );
  }

  if (pitch === "HALF_FIELD") {
    return (
      <FieldBase>
        <rect fill="none" height="82" stroke="#fff" strokeWidth="0.75" width="88" x="6" y="9" />
        <rect fill="none" height="23" stroke="#fff" strokeWidth="0.75" width="52" x="24" y="9" />
        <rect fill="none" height="10" stroke="#fff" strokeWidth="0.75" width="24" x="38" y="9" />
        <path d="M37 32 A13 13 0 0 0 63 32" fill="none" stroke="#fff" strokeWidth="0.75" />
        <circle cx="50" cy="50" fill="none" r="8.5" stroke="#fff" strokeWidth="0.75" />
      </FieldBase>
    );
  }

  if (pitch === "SMALL_FIELD") {
    return (
      <FieldBase>
        <rect fill="none" height="70" stroke="#fff" strokeWidth="0.75" width="84" x="8" y="15" />
        <line stroke="#fff" strokeWidth="0.75" x1="50" x2="50" y1="15" y2="85" />
        <circle cx="50" cy="50" fill="none" r="7" stroke="#fff" strokeWidth="0.75" />
        <rect fill="none" height="18" stroke="#fff" strokeWidth="0.75" width="16" x="8" y="41" />
        <rect fill="none" height="18" stroke="#fff" strokeWidth="0.75" width="16" x="76" y="41" />
      </FieldBase>
    );
  }

  return (
    <FieldBase>
      <rect fill="none" height="82" stroke="#fff" strokeWidth="0.75" width="88" x="6" y="9" />
      <line stroke="#fff" strokeWidth="0.75" x1="50" x2="50" y1="9" y2="91" />
      <circle cx="50" cy="50" fill="none" r="7.8" stroke="#fff" strokeWidth="0.75" />
      <rect fill="none" height="43" stroke="#fff" strokeWidth="0.75" width="16" x="6" y="28.5" />
      <rect fill="none" height="20" stroke="#fff" strokeWidth="0.75" width="6" x="6" y="40" />
      <path d="M22 39 A13 13 0 0 1 22 61" fill="none" stroke="#fff" strokeWidth="0.75" />
      <rect fill="none" height="43" stroke="#fff" strokeWidth="0.75" width="16" x="78" y="28.5" />
      <rect fill="none" height="20" stroke="#fff" strokeWidth="0.75" width="6" x="88" y="40" />
      <path d="M78 39 A13 13 0 0 0 78 61" fill="none" stroke="#fff" strokeWidth="0.75" />
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

function PreviewElement({ element }: { element: SketchElement }) {
  if (isPathElement(element)) {
    return (
      <path
        d={pathData(element)}
        fill="none"
        markerEnd={element.type === "LINE" ? undefined : "url(#preview-arrow)"}
        stroke={element.type === "DRIBBLE" ? "#f97316" : "#0f172a"}
        strokeDasharray={element.type === "DRIBBLE" ? "1.3 1" : undefined}
        strokeLinecap="round"
        strokeWidth="1.1"
      />
    );
  }

  if (isAreaElement(element)) {
    if (element.type === "ZONE_CIRCLE") {
      return (
        <ellipse
          cx={element.x + element.width / 2}
          cy={element.y + element.height / 2}
          fill="#f9731628"
          rx={element.width / 2}
          ry={element.height / 2}
          stroke="#f97316"
          strokeDasharray="1.8 1.3"
          strokeWidth="0.7"
        />
      );
    }

    return <rect fill="#0b63ce28" height={element.height} rx="1.4" stroke="#0b63ce" strokeDasharray="1.8 1.3" strokeWidth="0.7" width={element.width} x={element.x} y={element.y} />;
  }

  return (
    <g transform={`translate(${element.x} ${element.y})`}>
      <PointSymbol element={element} />
    </g>
  );
}

function PointSymbol({ element }: { element: PointElement }) {
  if (element.type === "BALL") {
    return <circle fill="#fff" r="2.2" stroke="#111827" strokeWidth="0.55" />;
  }

  if (element.type === "CONE" || element.type === "PYLON") {
    return <path d="M-1.6 2.2 L0 -3 L1.6 2.2 Z" fill="#fb923c" stroke="#111827" strokeWidth="0.35" />;
  }

  if (element.type === "DUMMY") {
    return (
      <g>
        <circle cy="-2.2" fill="#f97316" r="0.95" />
        <path d="M-1.2 -1.2 Q0 -2 1.2 -1.2 L1.55 3 H-1.55 Z" fill="#f97316" stroke="#111827" strokeWidth="0.25" />
      </g>
    );
  }

  if (element.type === "GOAL" || element.type === "MINI_GOAL") {
    const width = element.type === "GOAL" ? 10 : 7;
    const height = element.type === "GOAL" ? 5 : 3.5;

    return <rect fill="#f8fafc" height={height} stroke="#334155" strokeWidth="0.5" width={width} x={-width / 2} y={-height / 2} />;
  }

  if (element.type === "TACTIC_CIRCLE") {
    return (
      <g>
        <circle fill="#ef4444" r="3.2" stroke="#111827" strokeWidth="0.35" />
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
        <text dominantBaseline="middle" fill="#fff" fontSize="3" fontWeight="700" textAnchor="middle" y="1">
          {element.label ?? "1"}
        </text>
      </g>
    );
  }

  if (element.type === "TEXT") {
    return (
      <text fill="#0f172a" fontSize="3.2" fontWeight="700" paintOrder="stroke" stroke="#fff" strokeWidth="0.8">
        {element.label}
      </text>
    );
  }

  const shirt =
    element.type === "PLAYER_RED" ? "#ef4444" : element.type === "PLAYER_YELLOW" ? "#facc15" : element.type === "GOALKEEPER" ? "#a855f7" : "#0b63ce";

  return (
    <g>
      <circle cy="-3.1" fill="#f2c29c" r="1" stroke="#111827" strokeWidth="0.18" />
      <path d="M-1.8 -1.6 Q0 -2.5 1.8 -1.6 L1.15 1.4 H-1.15 Z" fill={shirt} stroke="#111827" strokeWidth="0.22" />
      <path d="M-1.2 1.4 H1.2 L0.8 2.9 H-0.8 Z" fill="#111827" />
      <path d="M-1.4 2.8 L-2.1 4.2 M1.4 2.8 L2.1 4.2" stroke="#111827" strokeLinecap="round" strokeWidth="0.35" />
    </g>
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

  return Array.from({ length: segments + 1 }, (_, index) => {
    const t = index / segments;
    const offset = (index % 2 === 0 ? 1 : -1) * 1.2;
    const x = x1 + dx * t + normalX * offset;
    const y = y1 + dy * t + normalY * offset;

    return `${index === 0 ? "M" : "L"} ${x} ${y}`;
  }).join(" ");
}

function isPathElement(element: SketchElement): element is PathElement {
  return pathTypes.has(element.type);
}

function isAreaElement(element: SketchElement): element is AreaElement {
  return areaTypes.has(element.type);
}

function normalizePitch(value: string): PitchType {
  return pitchTypes.has(value as PitchType) ? (value as PitchType) : "FULL_FIELD";
}

function hasNumber(value: Record<string, unknown>, key: string) {
  return typeof value[key] === "number";
}
