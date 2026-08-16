"use client";

import { useState } from "react";

import { createMatchNote, deleteMatchNote, updateMatchNote } from "@/lib/actions";
import { SubmitButton } from "@/components/submit-button";
import { formatDateTime } from "@/lib/format";

type MatchNote = {
  id: string;
  body: string;
  createdAt: Date;
  createdByUser: { displayName: string | null; email: string } | null;
};

export function MatchNoteColumn({
  matchId,
  category,
  title,
  description,
  notes,
}: {
  matchId: string;
  category: "OWN_TEAM" | "OPPONENT" | "GENERAL";
  title: string;
  description: string;
  notes: MatchNote[];
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <h3 className="font-bold text-foreground">{title}</h3>
      <p className="mt-1 text-xs text-muted">{description}</p>

      <div className="mt-4 space-y-3">
        {notes.length === 0 ? (
          <p className="text-sm text-muted">Noch keine Notizen.</p>
        ) : (
          notes.map((note) => <MatchNoteItem category={category} key={note.id} matchId={matchId} note={note} />)
        )}
      </div>

      <form action={createMatchNote} className="mt-4 space-y-2">
        <input name="matchId" type="hidden" value={matchId} />
        <input name="category" type="hidden" value={category} />
        <textarea
          className="min-h-20 w-full rounded-lg border border-border px-3 py-2 text-sm"
          name="body"
          placeholder="Notiz hinzufuegen..."
          required
        />
        <SubmitButton
          className="h-9 w-full rounded-lg border border-dashed border-slate-400 text-sm font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-60"
          pendingLabel="Wird hinzugefuegt..."
        >
          Notiz hinzufuegen
        </SubmitButton>
      </form>
    </div>
  );
}

function MatchNoteItem({
  matchId,
  category,
  note,
}: {
  matchId: string;
  category: "OWN_TEAM" | "OPPONENT" | "GENERAL";
  note: MatchNote;
}) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <form action={updateMatchNote} className="space-y-2 rounded-lg border border-border p-3">
        <input name="noteId" type="hidden" value={note.id} />
        <input name="matchId" type="hidden" value={matchId} />
        <input name="category" type="hidden" value={category} />
        <textarea className="min-h-20 w-full rounded-lg border border-border px-3 py-2 text-sm" defaultValue={note.body} name="body" required />
        <div className="flex items-center gap-2">
          <SubmitButton className="h-8 rounded-lg bg-primary px-3 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60" pendingLabel="Speichert...">
            Speichern
          </SubmitButton>
          <button className="h-8 rounded-lg border border-border px-3 text-xs font-semibold text-foreground" onClick={() => setIsEditing(false)} type="button">
            Abbrechen
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="rounded-lg border border-border p-3">
      <p className="whitespace-pre-line text-sm leading-6 text-foreground">{note.body}</p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span>
          {note.createdByUser?.displayName ?? note.createdByUser?.email ?? "Trainerteam"} - {formatDateTime(note.createdAt)}
        </span>
        <div className="flex items-center gap-2">
          <button className="rounded-lg border border-border px-2 py-1 font-semibold text-foreground" onClick={() => setIsEditing(true)} type="button">
            Bearbeiten
          </button>
          <form
            action={deleteMatchNote}
            onSubmit={(event) => {
              if (!window.confirm("Diese Notiz wirklich loeschen?")) {
                event.preventDefault();
              }
            }}
          >
            <input name="noteId" type="hidden" value={note.id} />
            <input name="matchId" type="hidden" value={matchId} />
            <SubmitButton
              className="rounded-lg border border-danger-soft px-2 py-1 font-semibold text-danger disabled:cursor-not-allowed disabled:opacity-60"
              pendingLabel="..."
            >
              Loeschen
            </SubmitButton>
          </form>
        </div>
      </div>
    </div>
  );
}
