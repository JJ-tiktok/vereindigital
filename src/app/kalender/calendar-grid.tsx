"use client";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { eventTypeLabel } from "@/lib/labels";

type CalendarEventPreview = {
  id: string;
  type: string;
  title: string;
  location: string | null;
  startsAt: string;
  endsAt: string;
  matchOpponent: string | null;
};

type CalendarEventTypeConfig = {
  key: string;
  label: string;
  dot: string;
  chip: string;
  soft: string;
};

const eventTypes: CalendarEventTypeConfig[] = [
  {
    key: "TRAINING",
    label: "Training",
    dot: "bg-blue-600",
    chip: "bg-blue-600 text-white",
    soft: "bg-blue-50 text-blue-700",
  },
  {
    key: "MATCH",
    label: "Spiele",
    dot: "bg-emerald-600",
    chip: "bg-emerald-600 text-white",
    soft: "bg-emerald-50 text-emerald-700",
  },
  {
    key: "TEAM_EVENT",
    label: "Mannschaftsabende",
    dot: "bg-amber-500",
    chip: "bg-amber-500 text-white",
    soft: "bg-amber-50 text-amber-800",
  },
  {
    key: "OTHER",
    label: "Sonstiges",
    dot: "bg-slate-500",
    chip: "bg-slate-600 text-white",
    soft: "bg-slate-100 text-slate-700",
  },
];

const weekDays = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const monthFormatter = new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric" });
const dayMonthFormatter = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "short" });
const timeFormatter = new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" });

export function CalendarGrid({ events }: { events: CalendarEventPreview[] }) {
  const [visibleDate, setVisibleDate] = useState(() => firstDayOfMonth(new Date()));
  const [view, setView] = useState<"month" | "year">("month");
  const [activeTypes, setActiveTypes] = useState(() => new Set(eventTypes.map((type) => type.key)));

  const typedEvents = useMemo(
    () =>
      events.map((event) => ({
        ...event,
        startsAtDate: new Date(event.startsAt),
        endsAtDate: new Date(event.endsAt),
      })),
    [events],
  );

  const filteredEvents = typedEvents.filter((event) => activeTypes.has(event.type));
  const upcomingEvents = filteredEvents
    .filter((event) => event.startsAtDate >= startOfToday())
    .sort((left, right) => left.startsAtDate.getTime() - right.startsAtDate.getTime())
    .slice(0, 6);
  const yearMonths = Array.from({ length: 12 }, (_, month) => new Date(visibleDate.getFullYear(), month, 1));

  function toggleType(type: string) {
    setActiveTypes((current) => {
      const next = new Set(current);

      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }

      return next;
    });
  }

  function moveMonth(offset: number) {
    setVisibleDate((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  function moveYear(offset: number) {
    setVisibleDate((current) => new Date(current.getFullYear() + offset, current.getMonth(), 1));
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="overflow-hidden rounded-lg border border-border bg-white">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              {view === "month" ? "Monatsansicht" : "Jahresansicht"}
            </p>
            <h2 className="mt-1 text-2xl font-bold text-slate-950">
              {view === "month" ? capitalize(monthFormatter.format(visibleDate)) : visibleDate.getFullYear()}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              className="inline-flex size-10 items-center justify-center rounded-lg border border-border text-slate-700 transition hover:bg-slate-50"
              onClick={() => (view === "month" ? moveMonth(-1) : moveYear(-1))}
              type="button"
              aria-label="Vorheriger Zeitraum"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
            <button
              className="inline-flex h-10 items-center rounded-lg border border-border px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              onClick={() => setVisibleDate(firstDayOfMonth(new Date()))}
              type="button"
            >
              Heute
            </button>
            <button
              className="inline-flex size-10 items-center justify-center rounded-lg border border-border text-slate-700 transition hover:bg-slate-50"
              onClick={() => (view === "month" ? moveMonth(1) : moveYear(1))}
              type="button"
              aria-label="Naechster Zeitraum"
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>

            <div className="ml-1 grid h-10 grid-cols-2 rounded-lg bg-slate-100 p-1">
              <button
                className={`rounded-md px-4 text-sm font-semibold transition ${
                  view === "month" ? "bg-white text-primary shadow-sm" : "text-slate-600 hover:text-slate-950"
                }`}
                onClick={() => setView("month")}
                type="button"
              >
                Monat
              </button>
              <button
                className={`rounded-md px-4 text-sm font-semibold transition ${
                  view === "year" ? "bg-white text-primary shadow-sm" : "text-slate-600 hover:text-slate-950"
                }`}
                onClick={() => setView("year")}
                type="button"
              >
                Jahr
              </button>
            </div>
          </div>
        </div>

        {view === "month" ? (
          <MonthView events={filteredEvents} visibleDate={visibleDate} />
        ) : (
          <div className="grid gap-4 p-5 sm:grid-cols-2 2xl:grid-cols-3">
            {yearMonths.map((month) => (
              <YearMonthCard events={filteredEvents} key={month.toISOString()} month={month} />
            ))}
          </div>
        )}
      </section>

      <aside className="space-y-6">
        <section className="rounded-lg border border-border bg-white p-5">
          <h2 className="text-xl font-bold text-slate-950">Kategorien</h2>
          <div className="mt-5 space-y-4">
            {eventTypes.map((type) => (
              <label className="flex cursor-pointer items-center gap-3" key={type.key}>
                <input
                  checked={activeTypes.has(type.key)}
                  className="size-4 accent-blue-600"
                  onChange={() => toggleType(type.key)}
                  type="checkbox"
                />
                <span className={`size-3 rounded-full ${type.dot}`} aria-hidden="true" />
                <span className="text-sm font-semibold text-slate-800">{type.label}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-slate-950">Anstehend</h2>
            <Link className="text-sm font-semibold text-primary hover:text-primary-strong" href="/kalender">
              Alle sehen
            </Link>
          </div>

          {upcomingEvents.length > 0 ? (
            <div className="mt-5 space-y-5">
              {upcomingEvents.map((event) => {
                const type = getEventType(event.type);

                return (
                  <Link
                    className="grid grid-cols-[56px_1fr] gap-4 rounded-lg p-2 transition hover:bg-slate-50"
                    href={`/kalender/${event.id}`}
                    key={event.id}
                  >
                    <div className={`rounded-lg px-2 py-3 text-center text-xs font-bold uppercase ${type.soft}`}>
                      <span className="block text-base leading-none">{String(event.startsAtDate.getDate()).padStart(2, "0")}</span>
                      <span className="mt-1 block">{dayMonthFormatter.format(event.startsAtDate).replace(/\d+\.\s?/, "")}</span>
                    </div>
                    <div>
                      <p className="font-bold text-slate-950">{event.title}</p>
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                        <Clock className="size-4" aria-hidden="true" />
                        {timeFormatter.format(event.startsAtDate)} - {timeFormatter.format(event.endsAtDate)}
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                        {event.type === "MATCH" ? (
                          <Trophy className="size-4" aria-hidden="true" />
                        ) : (
                          <MapPin className="size-4" aria-hidden="true" />
                        )}
                        {event.matchOpponent ?? event.location ?? eventTypeLabel(event.type)}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="mt-5 text-sm text-muted">Keine anstehenden Termine fuer die ausgewaehlten Kategorien.</p>
          )}
        </section>
      </aside>
    </div>
  );
}

function MonthView({
  events,
  visibleDate,
}: {
  events: Array<CalendarEventPreview & { startsAtDate: Date; endsAtDate: Date }>;
  visibleDate: Date;
}) {
  const monthStart = firstDayOfMonth(visibleDate);
  const start = new Date(monthStart);
  const day = start.getDay() === 0 ? 7 : start.getDay();
  start.setDate(start.getDate() - (day - 1));

  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });

  return (
    <>
      <div className="grid grid-cols-7 border-b border-border bg-slate-50">
        {weekDays.map((weekDay) => (
          <div className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted" key={weekDay}>
            {weekDay}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-7">
        {days.map((date) => {
          const dayEvents = events.filter((event) => isSameDay(event.startsAtDate, date));
          const inMonth = date.getMonth() === monthStart.getMonth();
          const dayParam = toDayParam(date);

          return (
            <div
              className={`min-h-36 border-b border-r border-border p-2 ${
                inMonth ? "bg-white" : "bg-slate-50 text-slate-400"
              }`}
              key={date.toISOString()}
            >
              <Link
                className={`inline-flex size-8 items-center justify-center rounded-lg text-sm font-semibold ${
                  isToday(date) ? "bg-primary text-white" : inMonth ? "text-slate-900 hover:bg-blue-50" : "text-slate-400"
                }`}
                href={`/kalender/new?date=${dayParam}`}
                title="Termin an diesem Tag erstellen"
              >
                {date.getDate()}
              </Link>
              <div className="mt-2 space-y-1">
                {dayEvents.slice(0, 3).map((event) => {
                  const type = getEventType(event.type);

                  return (
                    <Link
                      className={`block truncate rounded-md px-2 py-1 text-xs font-semibold transition hover:opacity-90 ${type.chip}`}
                      href={`/kalender/${event.id}`}
                      key={event.id}
                      title={event.title}
                    >
                      {timeFormatter.format(event.startsAtDate)} {event.title}
                    </Link>
                  );
                })}
                {dayEvents.length > 3 ? <p className="text-xs text-muted">+{dayEvents.length - 3} weitere</p> : null}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function YearMonthCard({
  events,
  month,
}: {
  events: Array<CalendarEventPreview & { startsAtDate: Date; endsAtDate: Date }>;
  month: Date;
}) {
  const monthEvents = events.filter(
    (event) => event.startsAtDate.getFullYear() === month.getFullYear() && event.startsAtDate.getMonth() === month.getMonth(),
  );

  return (
    <article className="rounded-lg border border-border bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-bold text-slate-950">{capitalize(new Intl.DateTimeFormat("de-DE", { month: "long" }).format(month))}</h3>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-muted">{monthEvents.length}</span>
      </div>
      {monthEvents.length > 0 ? (
        <div className="mt-4 space-y-2">
          {monthEvents.slice(0, 4).map((event) => {
            const type = getEventType(event.type);

            return (
              <Link className="flex items-center gap-2 text-sm hover:text-primary" href={`/kalender/${event.id}`} key={event.id}>
                <span className={`size-2 rounded-full ${type.dot}`} aria-hidden="true" />
                <span className="truncate">{event.startsAtDate.getDate()}. {event.title}</span>
              </Link>
            );
          })}
          {monthEvents.length > 4 ? <p className="text-xs text-muted">+{monthEvents.length - 4} weitere</p> : null}
        </div>
      ) : (
        <Link
          className="mt-4 flex min-h-20 items-center justify-center rounded-lg border border-dashed border-border text-sm font-semibold text-muted transition hover:border-primary hover:text-primary"
          href={`/kalender/new?date=${toDayParam(month)}`}
        >
          <CalendarDays className="mr-2 size-4" aria-hidden="true" />
          Termin planen
        </Link>
      )}
    </article>
  );
}

function firstDayOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function isToday(date: Date) {
  return isSameDay(date, new Date());
}

function toDayParam(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getEventType(type: string) {
  return eventTypes.find((eventType) => eventType.key === type) ?? eventTypes[eventTypes.length - 1];
}

function capitalize(value: string | number) {
  const text = String(value);
  return text.charAt(0).toUpperCase() + text.slice(1);
}
