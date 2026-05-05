import Link from "next/link";

import { eventTypeLabel } from "@/lib/labels";

type CalendarEventPreview = {
  id: string;
  type: string;
  title: string;
  startsAt: Date;
};

const weekDays = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export function CalendarGrid({ events }: { events: CalendarEventPreview[] }) {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const start = new Date(monthStart);
  const day = start.getDay() === 0 ? 7 : start.getDay();
  start.setDate(start.getDate() - (day - 1));

  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-white">
      <div className="grid grid-cols-7 border-b border-border bg-slate-50">
        {weekDays.map((weekDay) => (
          <div className="px-3 py-3 text-center text-xs font-semibold uppercase text-muted" key={weekDay}>
            {weekDay}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-7">
        {days.map((date) => {
          const dayEvents = events.filter((event) => isSameDay(event.startsAt, date));
          const inMonth = date.getMonth() === monthStart.getMonth();
          const dayParam = toDayParam(date);

          return (
            <div className={`min-h-36 border-b border-r border-border p-2 ${inMonth ? "bg-white" : "bg-slate-50"}`} key={date.toISOString()}>
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
                {dayEvents.slice(0, 3).map((event) => (
                  <Link
                    className="block rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-primary transition hover:bg-blue-100"
                    href={`/kalender/${event.id}`}
                    key={event.id}
                  >
                    {eventTypeLabel(event.type)}: {event.title}
                  </Link>
                ))}
                {dayEvents.length > 3 ? <p className="text-xs text-muted">+{dayEvents.length - 3} weitere</p> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
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
