export type RadarChartAxis = {
  key: string;
  label: string;
  value: number | null;
  previousValue?: number | null;
};

function wrapLabel(label: string, maxChars: number) {
  const words = label.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;

    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current) {
    lines.push(current);
  }

  if (lines.length > 2) {
    return [lines[0], `${lines[1]}…`];
  }

  return lines;
}

export function RadarChart({
  axes,
  currentLabel = "Aktuell",
  max = 20,
  previousLabel,
  size = 280,
}: {
  axes: RadarChartAxis[];
  currentLabel?: string;
  max?: number;
  previousLabel?: string | null;
  size?: number;
}) {
  const axisCount = axes.length;

  if (axisCount < 3) {
    return null;
  }

  const effectiveSize = axisCount > 8 ? size + 60 : size;
  const center = effectiveSize / 2;
  const labelGutter = axisCount > 8 ? 84 : 58;
  const radius = center - labelGutter;
  const fontSize = axisCount > 8 ? 10.5 : 11;
  const lineHeight = fontSize + 2;
  const maxChars = axisCount > 8 ? 13 : 14;
  const rings = [0.25, 0.5, 0.75, 1];
  const hasPrevious =
    Boolean(previousLabel) && axes.some((axis) => axis.previousValue !== null && axis.previousValue !== undefined);

  function pointFor(index: number, fraction: number) {
    const angle = (Math.PI * 2 * index) / axisCount - Math.PI / 2;
    return {
      x: center + Math.cos(angle) * radius * fraction,
      y: center + Math.sin(angle) * radius * fraction,
    };
  }

  function polygonPoints(values: (number | null | undefined)[]) {
    return values
      .map((value, index) => {
        const fraction = Math.max(0, Math.min(1, (value ?? 0) / max));
        const point = pointFor(index, fraction);
        return `${point.x},${point.y}`;
      })
      .join(" ");
  }

  const currentPoints = polygonPoints(axes.map((axis) => axis.value));
  const previousPoints = hasPrevious ? polygonPoints(axes.map((axis) => axis.previousValue)) : null;

  return (
    <div className="flex flex-col items-center gap-3">
      <svg height={effectiveSize} viewBox={`0 0 ${effectiveSize} ${effectiveSize}`} width={effectiveSize}>
        {rings.map((fraction) => (
          <polygon
            fill="none"
            key={fraction}
            points={axes.map((_, index) => pointFor(index, fraction)).map((point) => `${point.x},${point.y}`).join(" ")}
            stroke="var(--border)"
            strokeWidth={1}
          />
        ))}

        {axes.map((axis, index) => {
          const outer = pointFor(index, 1);
          return (
            <line
              key={axis.key}
              stroke="var(--border)"
              strokeWidth={1}
              x1={center}
              x2={outer.x}
              y1={center}
              y2={outer.y}
            />
          );
        })}

        {previousPoints ? (
          <polygon fill="none" points={previousPoints} stroke="var(--muted)" strokeDasharray="4 3" strokeWidth={1.5} />
        ) : null}

        <polygon fill="var(--primary)" fillOpacity={0.25} points={currentPoints} stroke="var(--primary)" strokeWidth={2} />

        {axes.map((axis, index) => {
          const labelPoint = pointFor(index, 1.14);
          const angle = (Math.PI * 2 * index) / axisCount - Math.PI / 2;
          const cos = Math.cos(angle);
          const anchor = cos > 0.3 ? "start" : cos < -0.3 ? "end" : "middle";
          const lines = wrapLabel(axis.label, maxChars);
          const startDy = -((lines.length - 1) * lineHeight) / 2;

          return (
            <text
              fill="var(--foreground)"
              fontSize={fontSize}
              key={axis.key}
              textAnchor={anchor}
              x={labelPoint.x}
              y={labelPoint.y}
            >
              {lines.map((line, lineIndex) => (
                <tspan dy={lineIndex === 0 ? startDy : lineHeight} key={lineIndex} x={labelPoint.x}>
                  {line}
                </tspan>
              ))}
            </text>
          );
        })}

        {axes.map((axis, index) => {
          if (axis.value === null || axis.value === undefined) {
            return null;
          }

          const fraction = Math.max(0, Math.min(1, axis.value / max));
          const point = pointFor(index, fraction);

          return <circle cx={point.x} cy={point.y} fill="var(--primary-strong)" key={axis.key} r={2.5} />;
        })}
      </svg>

      <div className="flex flex-col items-center gap-1 text-center text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
          {currentLabel}
        </span>
        {hasPrevious && previousLabel ? (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0 w-3 shrink-0 border-t-2 border-dashed border-slate-400" aria-hidden="true" />
            {previousLabel}
          </span>
        ) : null}
      </div>
    </div>
  );
}
