"use client";

import { useActionState, useMemo, useState } from "react";

import { createCalendarEvent, updateCalendarEvent, type ActionState } from "@/lib/actions";
import { toDateTimeLocalValue } from "@/lib/format";

type EditableEvent = {
  id: string;
  type: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: Date;
  endsAt: Date;
  match: { opponent: string; isHomeGame: boolean; competition: string } | null;
};

export function EventForm({ selectedDate, event }: { selectedDate?: string; event?: EditableEvent }) {
  const isEdit = Boolean(event);
  const [type, setType] = useState(event?.type ?? "TRAINING");
  const [clientError, setClientError] = useState<string | null>(null);
  const [startValue, setStartValue] = useState(() =>
    event ? toDateTimeLocalValue(event.startsAt) : `${selectedDate ?? todayInputValue()}T19:00`,
  );
  const [endValue, setEndValue] = useState(() =>
    event ? toDateTimeLocalValue(event.endsAt) : `${selectedDate ?? todayInputValue()}T21:00`,
  );
  const [endTouched, setEndTouched] = useState(isEdit);
  const defaultStart = useMemo(() => `${selectedDate ?? todayInputValue()}T19:00`, [selectedDate]);
  const defaultEnd = useMemo(() => `${selectedDate ?? todayInputValue()}T21:00`, [selectedDate]);
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    isEdit ? updateCalendarEvent : createCalendarEvent,
    null,
  );
  const fieldError =
    state?.fieldErrors && Object.values(state.fieldErrors).find((messages) => messages.length > 0)?.[0];
  const serverError = state?.error ? (fieldError ?? state.error) : null;

  return (
    <form
      action={formAction}
      className="max-w-3xl rounded-lg border border-border bg-surface p-6"
      onSubmit={(event) => {
        const form = event.currentTarget;
        const formData = new FormData(form);
        const startsAt = String(formData.get("startsAt") ?? "");
        const endsAt = String(formData.get("endsAt") ?? "");
        const opponent = String(formData.get("opponent") ?? "").trim();

        if (!String(formData.get("title") ?? "").trim()) {
          event.preventDefault();
          setClientError("Bitte gib einen Titel fuer den Termin an.");
          return;
        }

        if (!startsAt || !endsAt || new Date(endsAt) <= new Date(startsAt)) {
          event.preventDefault();
          setClientError("Das Ende des Termins muss nach dem Start liegen.");
          return;
        }

        if (formData.get("type") === "MATCH" && !opponent) {
          event.preventDefault();
          setClientError("Bei einem Spiel muss ein Gegner angegeben werden.");
          return;
        }

        setClientError(null);
      }}
    >
      {event ? <input name="calendarEventId" type="hidden" value={event.id} /> : null}
      {clientError || serverError ? (
        <p className="mb-5 rounded-lg bg-danger-soft px-3 py-2 text-sm font-semibold text-danger">
          {clientError ?? serverError}
        </p>
      ) : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="text-sm font-semibold text-foreground" htmlFor="type">
            Typ
          </label>
          {isEdit ? (
            <>
              <input name="type" type="hidden" value={type} />
              <p className="mt-2 flex h-11 items-center rounded-lg border border-border bg-surface-muted px-3 text-sm text-muted">
                {typeLabel(type)} <span className="ml-2 text-xs">(nicht aenderbar)</span>
              </p>
            </>
          ) : (
            <select
              className="mt-2 h-11 w-full rounded-lg border border-border px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
              id="type"
              name="type"
              onChange={(event) => setType(event.target.value)}
              value={type}
            >
              <option value="TRAINING">Training</option>
              <option value="MATCH">Spiel</option>
              <option value="TEAM_EVENT">Mannschaftsabend</option>
              <option value="OTHER">Sonstiges</option>
            </select>
          )}
        </div>
        <Field defaultValue={event?.title} label="Titel" name="title" required />
        <Field defaultValue={event?.location ?? undefined} label="Ort" name="location" />
        <Field
          defaultValue={event?.match?.opponent}
          label="Gegner bei Spiel"
          name="opponent"
          required={type === "MATCH"}
        />
        <div>
          <label className="text-sm font-semibold text-foreground" htmlFor="startsAt">
            Start
          </label>
          <input
            className="mt-2 h-11 w-full rounded-lg border border-border px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
            id="startsAt"
            name="startsAt"
            onChange={(event) => {
              const nextStart = event.target.value;
              setStartValue(nextStart);

              if (!endTouched) {
                setEndValue(addHours(nextStart, 2));
              }
            }}
            required
            type="datetime-local"
            value={startValue || defaultStart}
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-foreground" htmlFor="endsAt">
            Ende
          </label>
          <input
            className="mt-2 h-11 w-full rounded-lg border border-border px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
            id="endsAt"
            name="endsAt"
            onChange={(event) => {
              setEndTouched(true);
              setEndValue(event.target.value);
            }}
            required
            type="datetime-local"
            value={endValue || defaultEnd}
          />
        </div>
        {type === "MATCH" ? (
          <div>
            <label className="text-sm font-semibold text-foreground" htmlFor="isHomeGame">
              Heim/Auswaerts
            </label>
            <select
              className="mt-2 h-11 w-full rounded-lg border border-border px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
              defaultValue={event?.match ? String(event.match.isHomeGame) : "true"}
              id="isHomeGame"
              name="isHomeGame"
            >
              <option value="true">Heimspiel</option>
              <option value="false">Auswaertsspiel</option>
            </select>
          </div>
        ) : null}
        {type === "MATCH" ? (
          <div>
            <label className="text-sm font-semibold text-foreground" htmlFor="competition">
              Wettbewerb
            </label>
            <select
              className="mt-2 h-11 w-full rounded-lg border border-border px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
              defaultValue={event?.match?.competition ?? "LEAGUE"}
              id="competition"
              name="competition"
            >
              <option value="LEAGUE">Liga</option>
              <option value="CUP">Pokal</option>
              <option value="FRIENDLY">Freundschaftsspiel</option>
              <option value="OTHER">Sonstiges</option>
            </select>
          </div>
        ) : null}
      </div>

      <div className="mt-5">
        <label className="text-sm font-semibold text-foreground" htmlFor="description">
          Beschreibung
        </label>
        <textarea
          className="mt-2 min-h-28 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
          defaultValue={event?.description ?? undefined}
          id="description"
          name="description"
        />
      </div>

      <button
        className="mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Wird gespeichert..." : isEdit ? "Aenderungen speichern" : "Termin erstellen"}
      </button>
    </form>
  );
}

function typeLabel(type: string) {
  switch (type) {
    case "TRAINING":
      return "Training";
    case "MATCH":
      return "Spiel";
    case "TEAM_EVENT":
      return "Mannschaftsabend";
    default:
      return "Sonstiges";
  }
}

function addHours(dateTimeLocal: string, hours: number) {
  const date = new Date(dateTimeLocal);

  if (Number.isNaN(date.getTime())) {
    return dateTimeLocal;
  }

  date.setHours(date.getHours() + hours);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function todayInputValue() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function Field({
  label,
  name,
  required,
  defaultValue,
}: {
  label: string;
  name: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-foreground" htmlFor={name}>
        {label}
      </label>
      <input
        className="mt-2 h-11 w-full rounded-lg border border-border px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
        defaultValue={defaultValue}
        id={name}
        name={name}
        required={required}
      />
    </div>
  );
}
