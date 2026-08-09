"use client";

import { useState } from "react";

import { deletePlayerFileEntry, updatePlayerFileEntry } from "@/lib/actions";
import { formatDate, toDateInputValue } from "@/lib/format";
import { fileEntryTypeLabel, fileEntryVisibilityLabel } from "@/lib/attribute-groups";

type FileEntry = {
  id: string;
  type: string;
  visibility: string;
  title: string;
  body: string;
  occurredAt: Date;
  followUpAt: Date | null;
  createdByUser: { displayName: string | null; email: string } | null;
};

export function FileEntryRow({ entry, playerProfileId }: { entry: FileEntry; playerProfileId: string }) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <form action={updatePlayerFileEntry} className="space-y-3 border-l-2 border-primary pl-4">
        <input name="entryId" type="hidden" value={entry.id} />
        <input name="playerProfileId" type="hidden" value={playerProfileId} />
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm font-semibold text-foreground">
            Titel
            <input className="mt-2 h-10 w-full rounded-lg border border-border px-3 text-sm" defaultValue={entry.title} name="title" required />
          </label>
          <label className="text-sm font-semibold text-foreground">
            Typ
            <select className="mt-2 h-10 w-full rounded-lg border border-border px-3 text-sm" defaultValue={entry.type} name="type">
              <option value="PLAYER_TALK">Spielergespraech</option>
              <option value="GOAL_AGREEMENT">Zielvereinbarung</option>
              <option value="FEEDBACK">Feedback</option>
              <option value="TRAINING_OBSERVATION">Trainingsbeobachtung</option>
              <option value="MATCH_OBSERVATION">Spielbeobachtung</option>
              <option value="DISCIPLINE">Verhalten / Disziplin</option>
              <option value="LOAD_INJURY">Verletzung / Belastung</option>
              <option value="OTHER">Sonstige Notiz</option>
            </select>
          </label>
          <label className="text-sm font-semibold text-foreground">
            Sichtbarkeit
            <select className="mt-2 h-10 w-full rounded-lg border border-border px-3 text-sm" defaultValue={entry.visibility} name="visibility">
              <option value="INTERNAL">Intern</option>
              <option value="PLAYER">Spieler-Notiz</option>
            </select>
          </label>
          <label className="text-sm font-semibold text-foreground">
            Datum
            <input
              className="mt-2 h-10 w-full rounded-lg border border-border px-3 text-sm"
              defaultValue={toDateInputValue(entry.occurredAt)}
              name="occurredAt"
              required
              type="date"
            />
          </label>
          <label className="text-sm font-semibold text-foreground">
            Wiedervorlage
            <input
              className="mt-2 h-10 w-full rounded-lg border border-border px-3 text-sm"
              defaultValue={entry.followUpAt ? toDateInputValue(entry.followUpAt) : ""}
              name="followUpAt"
              type="date"
            />
          </label>
        </div>
        <label className="block text-sm font-semibold text-foreground">
          Notiz
          <textarea className="mt-2 min-h-24 w-full rounded-lg border border-border px-3 py-2 text-sm" defaultValue={entry.body} name="body" required />
        </label>
        <div className="flex items-center gap-2">
          <button className="h-9 rounded-lg bg-primary px-3 text-xs font-semibold text-white" type="submit">
            Speichern
          </button>
          <button className="h-9 rounded-lg border border-border px-3 text-xs font-semibold text-foreground" onClick={() => setIsEditing(false)} type="button">
            Abbrechen
          </button>
        </div>
      </form>
    );
  }

  return (
    <article className="border-l-2 border-primary pl-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-foreground">{formatDate(entry.occurredAt)}</span>
        <span className="rounded-full bg-primary-soft px-2 py-1 text-xs font-semibold text-primary">
          {fileEntryTypeLabel(entry.type)}
        </span>
        <span
          className={`rounded-full px-2 py-1 text-xs font-semibold ${
            entry.visibility === "PLAYER" ? "bg-success-soft text-success" : "bg-surface-muted text-muted"
          }`}
        >
          {fileEntryVisibilityLabel(entry.visibility)}
        </span>
        {entry.followUpAt ? (
          <span className="rounded-full bg-warning-soft px-2 py-1 text-xs font-semibold text-warning">
            Wiedervorlage {formatDate(entry.followUpAt)}
          </span>
        ) : null}
      </div>
      <h3 className="mt-2 font-semibold text-foreground">{entry.title}</h3>
      <p className="mt-1 line-clamp-3 whitespace-pre-line text-sm leading-6 text-muted">{entry.body}</p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted">{entry.createdByUser?.displayName ?? entry.createdByUser?.email ?? "Trainerteam"}</p>
        <div className="flex items-center gap-2">
          <button className="h-8 rounded-lg border border-border px-3 text-xs font-semibold text-foreground" onClick={() => setIsEditing(true)} type="button">
            Bearbeiten
          </button>
          <form
            action={deletePlayerFileEntry}
            onSubmit={(event) => {
              if (!window.confirm("Diesen Eintrag wirklich loeschen?")) {
                event.preventDefault();
              }
            }}
          >
            <input name="entryId" type="hidden" value={entry.id} />
            <input name="playerProfileId" type="hidden" value={playerProfileId} />
            <button className="h-8 rounded-lg border border-danger-soft px-3 text-xs font-semibold text-danger" type="submit">
              Loeschen
            </button>
          </form>
        </div>
      </div>
    </article>
  );
}
