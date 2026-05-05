"use client";

export function PrintButton({ label = "Drucken / PDF" }: { label?: string }) {
  return (
    <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white" onClick={() => window.print()} type="button">
      {label}
    </button>
  );
}
