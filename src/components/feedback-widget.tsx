"use client";

import { Bug, Lightbulb, MessageSquarePlus, Send, X } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import html2canvas from "html2canvas";

import { createFeedbackItem, type FeedbackActionState } from "@/lib/feedback-actions";

const initialState: FeedbackActionState = {
  message: "",
  ok: false,
};

export function FeedbackWidget() {
  const formRef = useRef<HTMLFormElement>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState(initialState);
  const [isPending, startTransition] = useTransition();
  const route = `${pathname}${searchParams.size > 0 ? `?${searchParams.toString()}` : ""}`;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = formRef.current;

    if (!form) {
      return;
    }

    const formData = new FormData(form);
    formData.set("route", route);
    formData.set("userAgent", window.navigator.userAgent);
    formData.set("viewportWidth", String(window.innerWidth));
    formData.set("viewportHeight", String(window.innerHeight));

    try {
      const canvas = await html2canvas(document.body, {
        backgroundColor: "#f8fafc",
        ignoreElements: (element) => element instanceof HTMLElement && element.dataset.feedbackModal === "true",
        scale: 0.45,
        useCORS: true,
      });
      formData.set("screenshotData", canvas.toDataURL("image/jpeg", 0.42));
    } catch {
      formData.set("screenshotSkipped", "true");
    }

    startTransition(async () => {
      const result = await createFeedbackItem(formData);
      setState(result);

      if (result.ok) {
        form.reset();
      }
    });
  }

  return (
    <>
      <button
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
        onClick={() => {
          setState(initialState);
          setOpen(true);
        }}
        type="button"
      >
        <MessageSquarePlus className="size-4" aria-hidden="true" />
        Feedback
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-3 sm:items-center" data-feedback-modal="true">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-border bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-border p-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-primary">VereinDigital Feedback</p>
                <h2 className="mt-1 text-2xl font-bold text-slate-950">Feedback senden</h2>
                <p className="mt-1 text-sm text-muted">Wir speichern Route, Browserdaten und einen Screenshot automatisch mit.</p>
              </div>
              <button className="rounded-lg p-2 text-muted transition hover:bg-slate-100 hover:text-slate-950" onClick={() => setOpen(false)} type="button">
                <X className="size-5" aria-hidden="true" />
                <span className="sr-only">Schliessen</span>
              </button>
            </div>

            {state.message ? (
              <p
                className={`mx-5 mt-5 rounded-lg px-4 py-3 text-sm font-semibold ${
                  state.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                }`}
                role="status"
              >
                {state.message}
              </p>
            ) : null}

            <form className="grid gap-5 p-5" onSubmit={handleSubmit} ref={formRef}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm font-semibold text-slate-800">
                  Kategorie
                  <select className="mt-2 h-11 w-full rounded-lg border border-border px-3 text-sm font-normal text-slate-900" name="type" required>
                    <option value="BUG">Bug melden</option>
                    <option value="FEATURE_REQUEST">Feature Request</option>
                    <option value="IMPROVEMENT">Verbesserung</option>
                    <option value="OTHER">Sonstiges</option>
                  </select>
                </label>
                <label className="text-sm font-semibold text-slate-800">
                  Dringlichkeit
                  <select className="mt-2 h-11 w-full rounded-lg border border-border px-3 text-sm font-normal text-slate-900" name="priority" required>
                    <option value="MEDIUM">Normal</option>
                    <option value="LOW">Niedrig</option>
                    <option value="HIGH">Hoch</option>
                  </select>
                </label>
              </div>

              <label className="text-sm font-semibold text-slate-800">
                Titel
                <input
                  className="mt-2 h-11 w-full rounded-lg border border-border px-3 text-sm font-normal text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-blue-100"
                  maxLength={140}
                  name="title"
                  placeholder="Kurz beschreiben, worum es geht"
                  required
                />
              </label>

              <label className="text-sm font-semibold text-slate-800">
                Beschreibung
                <textarea
                  className="mt-2 min-h-36 w-full rounded-lg border border-border px-3 py-2 text-sm font-normal leading-6 text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-blue-100"
                  name="description"
                  placeholder="Was ist passiert, was fehlt, oder was koennte besser funktionieren?"
                  required
                />
              </label>

              <div className="rounded-lg bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Bug className="size-4 text-primary" aria-hidden="true" />
                  Kontext wird automatisch angehaengt
                </div>
                <p className="mt-2 break-all text-xs leading-5 text-muted">{route}</p>
              </div>

              <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex items-center gap-2 text-xs text-muted">
                  <Lightbulb className="size-4" aria-hidden="true" />
                  Screenshot-Fehler blockieren das Absenden nicht.
                </p>
                <div className="flex gap-2">
                  <button className="h-10 rounded-lg border border-border bg-white px-4 text-sm font-semibold text-slate-700" onClick={() => setOpen(false)} type="button">
                    Schliessen
                  </button>
                  <button className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:bg-slate-300" disabled={isPending} type="submit">
                    <Send className="size-4" aria-hidden="true" />
                    {isPending ? "Sendet..." : "Absenden"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
