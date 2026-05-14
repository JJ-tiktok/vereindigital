"use client";

import {
  CalendarDays,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Clock,
  ListFilter,
  MapPin,
  Plus,
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

type TypedCalendarEvent = CalendarEventPreview & {
  startsAtDate: Date;
  endsAtDate: Date;
};

type CalendarEventTypeConfig = {
  key: string;
  label: string;
  dot: string;
  pill: string;
  accent: string;
  soft: string;
};

const eventTypes: CalendarEventTypeConfig[] = [
  {
    key: "TRAINING",
    label: "Training",
    dot: "bg-blue-600",
    pill: "border-blue-200 bg-blue-50/80 hover:bg-blue-100",
    accent: "border-l-blue-600",
    soft: "bg-blue-50 text-blue-700",
  },
  {
    key: "MATCH",
    label: "Spiele",
    dot: "bg-emerald-600",
    pill: "border-emerald-200 bg-emerald-50/80 hover:bg-emerald-100",
    accent: "border-l-emerald-600",
    soft: "bg-emerald-50 text-emerald-700",
  },
  {
    key: "TEAM_EVENT",
    label: "Mannschaftsabende",
    dot: "bg-amber-500",
    pill: "border-amber-200 bg-amber-50/90 hover:bg-amber-100",
    accent: "border-l-amber-500",
    soft: "bg-amber-50 text-amber-800",
  },
  {
    key: "OTHER",
    label: "Sonstiges",
    dot: "bg-slate-500",
    pill: "border-slate-200 bg-slate-50 hover:bg-slate-100",
    accent: "border-l-slate-500",
    soft: "bg-slate-100 text-slate-700",
  },
];

const weekDays = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const monthFormatter = new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric" });
const monthOnlyFormatter = new Intl.DateTimeFormat("de-DE", { month: "long" });
const weekdayFormatter = new Intl.DateTimeFormat("de-DE", { weekday: "long" });
const dayMonthFormatter = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "short" });
const longDayFormatter = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "long" });
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

  const filteredEvents = useMemo(
    () => typedEvents.filter((event) => activeTypes.has(event.type)),
    [activeTypes, typedEvents],
  );
  const upcomingEvents = useMemo(
    () =>
      filteredEvents
        .filter((event) => event.startsAtDate >= startOfToday())
        .sort((left, right) => left.startsAtDate.getTime() - right.startsAtDate.getTime())
        .slice(0, 6),
    [filteredEvents],
  );
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
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-5">
        <CategoryFilter activeTypes={activeTypes} className="xl:hidden" onToggle={toggleType} />

        <section className="overflow-hidden rounded-lg border border-border bg-white">
          <div className="flex flex-col gap-4 border-b border-border p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                {view === "month" ? "Monatsansicht" : "Jahresansicht"}
              </p>
              <h2 className="mt-1 text-2xl font-bold text-slate-950">
                {view === "month" ? capitalize(monthFormatter.format(visibleDate)) : visibleDate.getFullYear()}
              </h2>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <div className="grid grid-cols-[40px_1fr_40px] gap-2 sm:flex sm:items-center">
                <button
                  className="inline-flex size-10 items-center justify-center rounded-lg border border-border text-slate-700 transition hover:bg-slate-50"
                  onClick={() => (view === "month" ? moveMonth(-1) : moveYear(-1))}
                  type="button"
                  aria-label="Vorheriger Zeitraum"
                >
                  <ChevronLeft className="size-4" aria-hidden="true" />
                </button>
                <button
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-border px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
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
              </div>

              <div className="grid h-10 grid-cols-2 rounded-lg bg-slate-100 p-1 sm:w-auto">
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
            <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5 2xl:grid-cols-3">
              {yearMonths.map((month) => (
                <YearMonthCard events={filteredEvents} key={month.toISOString()} month={month} />
              ))}
            </div>
          )}
        </section>
      </div>

      <aside className="space-y-5">
        <CategoryFilter activeTypes={activeTypes} className="hidden xl:block" onToggle={toggleType} />
        <UpcomingPanel events={upcomingEvents} />
      </aside>
    </div>
  );
}

function CategoryFilter({
  activeTypes,
  className,
  onToggle,
}: {
  activeTypes: Set<string>;
  className?: string;
  onToggle: (type: string) => void;
}) {
  return (
    <section className={`rounded-lg border border-border bg-white p-4 sm:p-5 ${className ?? ""}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Filter</p>
          <h2 className="mt-1 text-lg font-bold text-slate-950">Kategorien</h2>
        </div>
        <div className="flex items-center gap-2">
          <ListFilter className="size-4 text-muted" aria-hidden="true" />
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-muted">
            {activeTypes.size}/{eventTypes.length}
          </span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {eventTypes.map((type) => {
          const active = activeTypes.has(type.key);

          return (
            <button
              aria-pressed={active}
              className={`inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition ${
                active
                  ? `${type.pill} text-slate-950 shadow-sm`
                  : "border-border bg-white text-slate-700 hover:bg-slate-50"
              }`}
              key={type.key}
              onClick={() => onToggle(type.key)}
              type="button"
            >
              <span className={`size-2.5 rounded-full ${type.dot}`} aria-hidden="true" />
              {type.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function UpcomingPanel({ events }: { events: TypedCalendarEvent[] }) {
  return (
    <section className="rounded-lg border border-border bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Naechste 6</p>
          <h2 className="mt-1 text-lg font-bold text-slate-950">Anstehend</h2>
        </div>
        <CalendarDays className="size-5 text-muted" aria-hidden="true" />
      </div>

      {events.length > 0 ? (
        <div className="mt-5 space-y-3">
          {events.map((event) => (
            <UpcomingEventCard event={event} key={event.id} />
          ))}
        </div>
      ) : (
        <p className="mt-5 text-sm leading-6 text-muted">Keine anstehenden Termine fuer die ausgewaehlten Kategorien.</p>
      )}
    </section>
  );
}

function MonthView({
  events,
  visibleDate,
}: {
  events: TypedCalendarEvent[];
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
      <DesktopMonthGrid days={days} events={events} monthStart={monthStart} />
      <MobileMonthAgenda events={events} visibleDate={visibleDate} />
    </>
  );
}

function DesktopMonthGrid({
  days,
  events,
  monthStart,
}: {
  days: Date[];
  events: TypedCalendarEvent[];
  monthStart: Date;
}) {
  return (
    <div className="hidden md:block">
      <div className="grid grid-cols-7 border-b border-border bg-slate-50">
        {weekDays.map((weekDay) => (
          <div className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted" key={weekDay}>
            {weekDay}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((date) => {
          const dayEvents = events
            .filter((event) => isSameDay(event.startsAtDate, date))
            .sort((left, right) => left.startsAtDate.getTime() - right.startsAtDate.getTime());
          const inMonth = date.getMonth() === monthStart.getMonth();
          const dayParam = toDayParam(date);

          return (
            <div
              className={`min-h-36 border-b border-r border-border p-2 ${
                inMonth ? "bg-white" : "bg-slate-50 text-slate-400"
              }`}
              key={date.toISOString()}
            >
              <div className="flex items-center justify-between gap-2">
                <Link
                  className={`inline-flex size-8 items-center justify-center rounded-lg text-sm font-semibold ${
                    isToday(date) ? "bg-primary text-white" : inMonth ? "text-slate-900 hover:bg-blue-50" : "text-slate-400"
                  }`}
                  href={`/kalender/new?date=${dayParam}`}
                  title="Termin an diesem Tag erstellen"
                >
                  {date.getDate()}
                </Link>
                {dayEvents.length > 0 ? (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-muted">
                    {dayEvents.length}
                  </span>
                ) : null}
              </div>

              <div className="mt-2 space-y-1.5">
                {dayEvents.slice(0, 3).map((event) => (
                  <MonthEventPill event={event} key={event.id} />
                ))}
                {dayEvents.length > 3 ? (
                  <p className="rounded-md bg-slate-50 px-2 py-1 text-xs font-semibold text-muted">
                    +{dayEvents.length - 3} weitere
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MobileMonthAgenda({ events, visibleDate }: { events: TypedCalendarEvent[]; visibleDate: Date }) {
  const monthEvents = events
    .filter((event) => isSameMonth(event.startsAtDate, visibleDate))
    .sort((left, right) => left.startsAtDate.getTime() - right.startsAtDate.getTime());
  const groupedEvents = groupEventsByDay(monthEvents);

  return (
    <div className="md:hidden">
      <div className="border-b border-border bg-slate-50 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Mobile Agenda</p>
        <p className="mt-1 text-sm text-slate-700">
          {groupedEvents.length > 0
            ? `${groupedEvents.length} Tage mit Terminen in diesem Monat.`
            : "Keine Termine in diesem Monat fuer die ausgewaehlten Kategorien."}
        </p>
      </div>

      {groupedEvents.length > 0 ? (
        <div className="divide-y divide-border">
          {groupedEvents.map((group) => (
            <article className="p-4" key={toDayParam(group.date)}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    {capitalize(weekdayFormatter.format(group.date))}
                  </p>
                  <h3 className="mt-1 text-lg font-bold text-slate-950">{longDayFormatter.format(group.date)}</h3>
                </div>
                <Link
                  className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-border text-slate-700 transition hover:bg-slate-50"
                  href={`/kalender/new?date=${toDayParam(group.date)}`}
                  aria-label="Termin an diesem Tag erstellen"
                >
                  <CalendarPlus className="size-4" aria-hidden="true" />
                </Link>
              </div>

              <div className="mt-3 space-y-2">
                {group.events.map((event) => (
                  <MobileEventCard event={event} key={event.id} />
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="p-4">
          <Link
            className="flex min-h-28 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-slate-50 px-4 text-center text-sm font-semibold text-muted transition hover:border-primary hover:text-primary"
            href={`/kalender/new?date=${toDayParam(visibleDate)}`}
          >
            <Plus className="mb-2 size-5" aria-hidden="true" />
            Termin in diesem Monat planen
          </Link>
        </div>
      )}
    </div>
  );
}

function MonthEventPill({ event }: { event: TypedCalendarEvent }) {
  const type = getEventType(event.type);

  return (
    <Link
      className={`block rounded-md border border-l-4 px-2 py-1.5 text-left transition ${type.pill} ${type.accent}`}
      href={`/kalender/${event.id}`}
      title={`${formatEventTimeRange(event)} ${event.title}`}
    >
      <span className="block text-[11px] font-bold leading-none text-slate-700">{formatEventTimeRange(event)}</span>
      <span className="mt-1 block whitespace-normal break-words text-xs font-semibold leading-4 text-slate-950">
        {event.title}
      </span>
    </Link>
  );
}

function MobileEventCard({ event }: { event: TypedCalendarEvent }) {
  const type = getEventType(event.type);

  return (
    <Link
      className={`block rounded-lg border border-l-4 bg-white p-3 transition hover:bg-slate-50 ${type.accent}`}
      href={`/kalender/${event.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{eventTypeLabel(event.type)}</p>
          <h4 className="mt-1 break-words text-sm font-bold leading-5 text-slate-950">{event.title}</h4>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${type.soft}`}>
          {formatEventTimeRange(event)}
        </span>
      </div>

      <p className="mt-3 flex items-center gap-1.5 text-sm text-muted">
        {event.type === "MATCH" ? (
          <Trophy className="size-4 shrink-0" aria-hidden="true" />
        ) : (
          <MapPin className="size-4 shrink-0" aria-hidden="true" />
        )}
        <span className="min-w-0 break-words">{event.matchOpponent ?? event.location ?? eventTypeLabel(event.type)}</span>
      </p>
    </Link>
  );
}

function UpcomingEventCard({ event }: { event: TypedCalendarEvent }) {
  const type = getEventType(event.type);

  return (
    <Link
      className={`grid grid-cols-[56px_minmax(0,1fr)] gap-4 rounded-lg border border-l-4 border-transparent p-2 transition hover:border-border hover:bg-slate-50 ${type.accent}`}
      href={`/kalender/${event.id}`}
    >
      <div className={`rounded-lg px-2 py-3 text-center text-xs font-bold uppercase ${type.soft}`}>
        <span className="block text-base leading-none">{String(event.startsAtDate.getDate()).padStart(2, "0")}</span>
        <span className="mt-1 block">{dayMonthFormatter.format(event.startsAtDate).replace(/\d+\.\s?/, "")}</span>
      </div>
      <div className="min-w-0">
        <p className="break-words font-bold leading-5 text-slate-950">{event.title}</p>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
          <Clock className="size-4 shrink-0" aria-hidden="true" />
          {formatEventTimeRange(event)}
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
          {event.type === "MATCH" ? (
            <Trophy className="size-4 shrink-0" aria-hidden="true" />
          ) : (
            <MapPin className="size-4 shrink-0" aria-hidden="true" />
          )}
          <span className="min-w-0 break-words">{event.matchOpponent ?? event.location ?? eventTypeLabel(event.type)}</span>
        </p>
      </div>
    </Link>
  );
}

function YearMonthCard({ events, month }: { events: TypedCalendarEvent[]; month: Date }) {
  const monthEvents = events.filter((event) => isSameMonth(event.startsAtDate, month));

  return (
    <article className="rounded-lg border border-border bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-bold text-slate-950">{capitalize(monthOnlyFormatter.format(month))}</h3>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-muted">{monthEvents.length}</span>
      </div>
      {monthEvents.length > 0 ? (
        <div className="mt-4 space-y-2">
          {monthEvents.slice(0, 4).map((event) => {
            const type = getEventType(event.type);

            return (
              <Link
                className="flex items-start gap-2 rounded-md px-2 py-1 text-sm hover:bg-white hover:text-primary"
                href={`/kalender/${event.id}`}
                key={event.id}
              >
                <span className={`mt-1.5 size-2 shrink-0 rounded-full ${type.dot}`} aria-hidden="true" />
                <span className="min-w-0 break-words">
                  {event.startsAtDate.getDate()}. {event.title}
                </span>
              </Link>
            );
          })}
          {monthEvents.length > 4 ? <p className="px-2 text-xs text-muted">+{monthEvents.length - 4} weitere</p> : null}
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

function groupEventsByDay(events: TypedCalendarEvent[]) {
  const groups = new Map<string, TypedCalendarEvent[]>();

  for (const event of events) {
    const key = toDayParam(event.startsAtDate);
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }

  return Array.from(groups.values()).map((groupEvents) => ({
    date: groupEvents[0].startsAtDate,
    events: groupEvents,
  }));
}

function formatEventTimeRange(event: TypedCalendarEvent) {
  return `${timeFormatter.format(event.startsAtDate)}-${timeFormatter.format(event.endsAtDate)}`;
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

function isSameMonth(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
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
