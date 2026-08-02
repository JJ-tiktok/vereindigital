"use client";

import { Maximize, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { ScenePreview } from "@/app/taktik/szenen/[sceneId]/scene-preview";

export function ScenePresentation({
  sceneId,
  title,
  pitch,
  steps,
  defaultTransitionMs,
}: {
  sceneId: string;
  title: string;
  pitch: string;
  steps: unknown[][];
  defaultTransitionMs: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    function handleChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  async function enterFullscreen() {
    try {
      await containerRef.current?.requestFullscreen();
    } catch {
      // Some browsers refuse requestFullscreen outside a direct user gesture or when the API
      // is unavailable (e.g. iOS Safari) - playback still works fine windowed, so this is a
      // soft failure, not something to surface as an error.
    }
  }

  return (
    <div className="flex h-screen flex-col bg-[#0c1f13] p-4" ref={containerRef}>
      <div className="flex items-center justify-between pb-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-white/60">Praesentation</p>
          <h1 className="text-xl font-bold text-white">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          {!isFullscreen ? (
            <button
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/20 px-4 text-sm font-semibold text-white transition hover:border-white"
              onClick={enterFullscreen}
              type="button"
            >
              <Maximize className="size-4" aria-hidden="true" />
              Vollbild
            </button>
          ) : null}
          <Link
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/20 px-4 text-sm font-semibold text-white transition hover:border-white"
            href={`/taktik/szenen/${sceneId}`}
          >
            <X className="size-4" aria-hidden="true" />
            Beenden
          </Link>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <ScenePreview defaultTransitionMs={defaultTransitionMs} enableKeyboardShortcuts pitch={pitch} steps={steps} variant="presentation" />
      </div>
    </div>
  );
}
