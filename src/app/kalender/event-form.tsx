"use client";

import { useMemo, useState } from "react";

import { createCalendarEvent } from "@/lib/actions";

export function EventForm({ error, selectedDate }: { error?: string; selectedDate?: string }) {
  const [type, setType] = useState("TRAINING");
  const [clientError, setClientError] = useState<string | null>(null);
  const [startValue, setStartValue] = useState(() => `${selectedDate ?? todayInputValue()}T19:00`);
  const [endValue, setEndValue] = useState(() => `${selectedDate ?? todayInputValue()}T21:00`);
  const [endTouched, setEndTouched] = useState(false);
  const defaultStart = useMemo(() => `${selectedDate ?? todayInputValue()}T19:00`, [selectedDate]);
  const defaultEnd = useMemo(() => `${selectedDate ?? todayInputValue()}T21:00`, [selectedDate]);

  return (
    <form
      action={createCalendarEvent}
      className="max-w-3xl rounded-lg border border-border bg-white p-6"
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
      {clientError || error ? (
        <p className="mb-5 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
          {clientError ?? errorMessage(error ?? "")}
        </p>
      ) : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="text-sm font-semibold text-slate-800" htmlFor="type">
            Typ
          </label>
          <select
            className="mt-2 h-11 w-full rounded-lg border border-border px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-blue-100"
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
        </div>
        <Field label="Titel" name="title" required />
        <Field label="Ort" name="location" />
        <Field label="Gegner bei Spiel" name="opponent" required={type === "MATCH"} />
        <div>
          <label className="text-sm font-semibold text-slate-800" htmlFor="startsAt">
            Start
          </label>
          <input
            className="mt-2 h-11 w-full rounded-lg border border-border px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-blue-100"
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
          <label className="text-sm font-semibold text-slate-800" htmlFor="endsAt">
            Ende
          </label>
          <input
            className="mt-2 h-11 w-full rounded-lg border border-border px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-blue-100"
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
        <div>
          <label className="text-sm font-semibold text-slate-800" htmlFor="isHomeGame">
            Heim/Auswaerts
          </label>
          <select className="mt-2 h-11 w-full rounded-lg border border-border px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-blue-100" id="isHomeGame" name="isHomeGame">
            <option value="true">Heimspiel</option>
            <option value="false">Auswaertsspiel</option>
          </select>
        </div>
      </div>

      <div className="mt-5">
        <label className="text-sm font-semibold text-slate-800" htmlFor="description">
          Beschreibung
        </label>
        <textarea className="mt-2 min-h-28 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-blue-100" id="description" name="description" />
      </div>

      <button className="mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primary-strong" type="submit">
        Termin erstellen
      </button>
    </form>
  );
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

function errorMessage(error: string) {
  switch (error) {
    case "missing-opponent":
      return "Bei einem Spiel muss ein Gegner angegeben werden.";
    case "time-range":
      return "Das Enddatum muss nach dem Startdatum liegen.";
    case "missing-fields":
      return "Bitte fuelle alle Pflichtfelder aus.";
    case "invalid-date":
      return "Bitte pruefe Start und Ende des Termins.";
    default:
      return "Bitte pruefe deine Angaben und versuche es erneut.";
  }
}

function Field({
  label,
  name,
  required,
}: {
  label: string;
  name: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-slate-800" htmlFor={name}>
        {label}
      </label>
      <input className="mt-2 h-11 w-full rounded-lg border border-border px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-blue-100" id={name} name={name} required={required} />
    </div>
  );
}
