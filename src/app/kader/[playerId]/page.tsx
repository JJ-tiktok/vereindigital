import { CalendarDays, ClipboardEdit, FileText, Shield } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { PlayerForm } from "@/app/kader/player-form";
import { RemovePlayerButton } from "@/app/kader/[playerId]/remove-player-button";
import { createPlayerAttributeSnapshot, createPlayerFileEntry, removePlayerFromActiveTeam } from "@/lib/actions";
import { requireActiveTeam, requireAppContext, requireCoachingStaffTeam } from "@/lib/app-context";
import { formatDate, toDateInputValue } from "@/lib/format";
import {
  attributeCategoryLabel,
  ensureDefaultAttributeDefinitions,
  fileEntryTypeLabel,
} from "@/lib/player-development";
import { prisma } from "@/lib/prisma";

export default async function PlayerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ playerId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  requireCoachingStaffTeam(context, activeTeam.id);
  const { playerId } = await params;
  const query = await searchParams;
  await ensureDefaultAttributeDefinitions(context.club.id);
  const player = await prisma.playerProfile.findFirst({
    where: {
      id: playerId,
      clubId: context.club.id,
      memberships: {
        some: {
          teamId: activeTeam.id,
          status: "ACTIVE",
        },
      },
    },
    include: {
      attributeSnapshots: {
        where: {
          teamId: activeTeam.id,
        },
        include: {
          ratings: {
            include: {
              attributeDefinition: true,
            },
            orderBy: {
              attributeDefinition: {
                sortOrder: "asc",
              },
            },
          },
        },
        orderBy: {
          ratedAt: "desc",
        },
        take: 2,
      },
      fileEntries: {
        where: {
          teamId: activeTeam.id,
        },
        include: {
          createdByUser: {
            select: {
              displayName: true,
              email: true,
            },
          },
        },
        orderBy: {
          occurredAt: "desc",
        },
        take: 10,
      },
      matchStats: {
        where: {
          match: {
            teamId: activeTeam.id,
          },
          rating: {
            not: null,
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
        take: 5,
      },
      trainingPerformances: {
        where: {
          calendarEvent: {
            teamId: activeTeam.id,
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
        take: 5,
      },
    },
  });

  if (!player) {
    notFound();
  }

  const attributeDefinitions = await prisma.playerAttributeDefinition.findMany({
    where: {
      clubId: context.club.id,
    },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
  });
  const definitionsByCategory = attributeDefinitions.reduce(
    (groups, definition) => {
      const existing = groups.get(definition.category) ?? [];
      existing.push(definition);
      groups.set(definition.category, existing);

      return groups;
    },
    new Map<(typeof attributeDefinitions)[number]["category"], typeof attributeDefinitions>(),
  );
  const latestSnapshot = player.attributeSnapshots[0];
  const previousSnapshot = player.attributeSnapshots[1];
  const previousRatings = new Map(
    previousSnapshot?.ratings.map((rating) => [rating.attributeDefinitionId, rating.value]) ?? [],
  );
  const matchForm = average(player.matchStats.map((stat) => stat.rating).filter((rating): rating is number => rating !== null));
  const trainingForm = average(player.trainingPerformances.map((performance) => performance.rating));
  const today = toDateInputValue(new Date());
  const age = getAge(player.birthDate);
  const latestRatings = latestSnapshot?.ratings ?? [];
  const highlightedRatings = latestRatings.slice(0, 12);
  const technicalRatings = latestRatings.filter((rating) => rating.attributeDefinition.category === "TECHNICAL");
  const physicalRatings = latestRatings.filter((rating) => rating.attributeDefinition.category === "PHYSICAL");
  const overallSkill = average(latestRatings.map((rating) => rating.value));
  const technicalSkill = average(technicalRatings.map((rating) => rating.value));
  const physicalSkill = average(physicalRatings.map((rating) => rating.value));

  return (
    <AppShell context={context} activePath="/kader">
      <div className="space-y-6 py-2">
        <Link className="inline-flex items-center text-sm font-semibold text-primary" href="/kader">
          Zurueck zum Kader
        </Link>

        <section className="rounded-lg border border-border bg-white p-5 sm:p-6">
          <div className="grid gap-6 lg:grid-cols-[180px_1fr] xl:grid-cols-[200px_1fr_260px]">
            <div className="flex aspect-[4/5] w-full max-w-48 items-center justify-center rounded-lg border border-border bg-slate-950 text-5xl font-bold text-white shadow-sm max-lg:mx-auto">
              {player.firstName[0]}
              {player.lastName[0]}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-4xl font-bold tracking-normal text-slate-950 sm:text-5xl">
                  {player.firstName} {player.lastName}
                </h1>
                <span className="rounded-lg bg-primary px-3 py-1 text-sm font-bold text-white">{player.position}</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-4 text-sm font-medium text-muted">
                <span className="inline-flex items-center gap-2">
                  <CalendarDays className="size-4" aria-hidden="true" />
                  {age} Jahre
                </span>
                <span>Geboren am {formatDate(player.birthDate)}</span>
                <span>{activeTeam.name}</span>
              </div>
              <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <ProfileStat label="Spielform" value={formatRating(matchForm)} />
                <ProfileStat label="Trainingsform" value={formatRating(trainingForm)} />
                <ProfileStat label="Gesamt-Skill" value={formatSkill(overallSkill)} />
                <ProfileStat label="Akte" value={player.fileEntries.length.toString()} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <MetricCard label="Technik" value={formatSkill(technicalSkill)} helper="aktueller Snapshot" />
              <MetricCard label="Physis" value={formatSkill(physicalSkill)} helper="aktueller Snapshot" />
              <MetricCard
                label="Bewertungsstand"
                value={latestSnapshot ? formatDate(latestSnapshot.ratedAt) : "-"}
                helper={latestSnapshot?.title ?? "noch nicht bewertet"}
              />
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[390px_1fr_360px]">
          <article className="rounded-lg border border-border bg-white">
            <SectionHeader title="Faehigkeiten" description="Top-Werte aus dem letzten Bewertungsstand." />
            {highlightedRatings.length > 0 ? (
              <div className="space-y-2 p-5">
                {highlightedRatings.map((rating) => {
                  const previousValue = previousRatings.get(rating.attributeDefinitionId);
                  const diff = previousValue ? rating.value - previousValue : null;

                  return (
                    <AttributeRow
                      key={rating.id}
                      label={rating.attributeDefinition.name}
                      meta={attributeCategoryLabel(rating.attributeDefinition.category)}
                      trend={diff}
                      value={rating.value}
                    />
                  );
                })}
              </div>
            ) : (
              <p className="p-5 text-sm text-muted">Noch keine Faehigkeiten bewertet.</p>
            )}
          </article>

          <div className="space-y-6">
            <PitchCard position={player.position} />

            <article className="rounded-lg border border-border bg-white">
              <SectionHeader
                action={<FileText className="size-5 text-muted" aria-hidden="true" />}
                title="Spielerakte & Notizen"
                description="Letzte interne Eintraege aus dem Trainerteam."
              />
              <NotesList entries={player.fileEntries.slice(0, 4)} />
              <form action={createPlayerFileEntry} className="grid gap-3 border-t border-border p-5">
                <input name="playerProfileId" type="hidden" value={player.id} />
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Titel" name="title" required />
                  <label className="text-sm font-semibold text-slate-800">
                    Typ
                    <select className="mt-2 h-10 w-full rounded-lg border border-border px-3 text-sm" name="type">
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
                  <Field defaultValue={today} label="Datum" name="occurredAt" type="date" required />
                  <Field label="Wiedervorlage" name="followUpAt" type="date" />
                </div>
                <label className="text-sm font-semibold text-slate-800">
                  Notiz
                  <textarea className="mt-2 min-h-24 w-full rounded-lg border border-border px-3 py-2 text-sm" name="body" required />
                </label>
                <button className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-dashed border-slate-400 px-4 text-sm font-semibold text-slate-800 md:w-max" type="submit">
                  <ClipboardEdit className="size-4" aria-hidden="true" />
                  Eintrag hinzufuegen
                </button>
              </form>
            </article>
          </div>

          <aside className="space-y-6">
            <article className="rounded-lg border border-border bg-white">
              <SectionHeader title="Form" description="Getrennt nach Spiel- und Trainingsleistung." />
              <div className="space-y-4 p-5">
                <RatingBar label="Spielform" value={matchForm} />
                <RatingBar label="Trainingsform" value={trainingForm} />
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase text-muted">Eindruck</p>
                  <p className="mt-2 text-2xl font-bold text-slate-950">{formLabel(matchForm, trainingForm)}</p>
                </div>
              </div>
            </article>

            <article className="rounded-lg border border-border bg-white">
              <SectionHeader action={<Shield className="size-5 text-muted" aria-hidden="true" />} title="Stammdaten" description="Basisdaten bearbeiten." />
              <div className="p-5">
                <PlayerForm player={player} embedded />
              </div>
            </article>

            <article className="rounded-lg border border-rose-100 bg-rose-50/40 p-5">
              <h2 className="text-lg font-bold text-rose-950">Kader entfernen</h2>
              <p className="mt-2 text-sm leading-6 text-rose-800">
                Entfernt den Spieler aus dem aktuellen Teamkader. Bereits erfasste Statistiken und Akteneintraege bleiben erhalten.
              </p>
              <form action={removePlayerFromActiveTeam} className="mt-4">
                <input name="playerId" type="hidden" value={player.id} />
                <RemovePlayerButton />
              </form>
            </article>
          </aside>
        </section>

        <section className="rounded-lg border border-border bg-white">
          <SectionHeader title="Neuer Bewertungsstand" description="Faehigkeiten auf einer Skala von 1 bis 20 erfassen." />
          {query.error === "attribute-values" ? (
            <p className="mx-5 mt-5 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
              Bitte mindestens einen Wert zwischen 1 und 20 erfassen.
            </p>
          ) : null}
          <form action={createPlayerAttributeSnapshot} className="grid gap-4 p-5">
            <input name="playerProfileId" type="hidden" value={player.id} />
            <div className="grid gap-3 md:grid-cols-3">
              <Field defaultValue="Trainerbewertung" label="Titel" name="title" required />
              <Field defaultValue={today} label="Bewertungsdatum" name="ratedAt" type="date" required />
              <label className="text-sm font-semibold text-slate-800 md:col-span-1">
                Notiz
                <input className="mt-2 h-10 w-full rounded-lg border border-border px-3 text-sm" name="notes" />
              </label>
            </div>
            <div className="grid gap-4 xl:grid-cols-3">
              {[...definitionsByCategory.entries()].map(([category, definitions]) => (
                <div className="rounded-lg border border-border p-4" key={category}>
                  <p className="text-sm font-semibold text-slate-950">{attributeCategoryLabel(category)}</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                    {definitions.map((definition) => (
                      <label className="text-xs font-semibold uppercase text-muted" key={definition.id}>
                        {definition.name}
                        <input
                          className="mt-1 h-10 w-full rounded-lg border border-border px-3 text-sm font-normal text-slate-900"
                          max={20}
                          min={1}
                          name={`attribute-${definition.id}`}
                          placeholder="1-20"
                          type="number"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white md:w-max" type="submit">
              Bewertungsstand speichern
            </button>
          </form>
        </section>
      </div>
    </AppShell>
  );
}

function SectionHeader({
  action,
  description,
  title,
}: {
  action?: React.ReactNode;
  description: string;
  title: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border p-5">
      <div>
        <h2 className="text-2xl font-bold tracking-normal text-slate-950">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
      </div>
      {action}
    </div>
  );
}

function ProfileStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-muted">{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums text-slate-950">{value}</p>
    </div>
  );
}

function MetricCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <article className="rounded-lg border border-border bg-white p-5">
      <p className="text-xs font-semibold uppercase text-muted">{label}</p>
      <p className="mt-3 text-3xl font-bold tabular-nums text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-muted">{helper}</p>
    </article>
  );
}

function AttributeRow({
  label,
  meta,
  trend,
  value,
}: {
  label: string;
  meta: string;
  trend: number | null;
  value: number;
}) {
  return (
    <div className="rounded-lg px-3 py-2 odd:bg-slate-50">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-slate-900">{label}</p>
          <p className="mt-1 text-xs text-muted">
            {meta}
            {trend !== null ? ` / Trend ${trend > 0 ? "+" : ""}${trend}` : ""}
          </p>
        </div>
        <p className="text-lg font-bold tabular-nums text-primary">{value}</p>
      </div>
    </div>
  );
}

function PitchCard({ position }: { position: string }) {
  const normalizedPosition = position.toUpperCase();
  const markerClass = positionMarkerClass(normalizedPosition);

  return (
    <article className="rounded-lg border border-border bg-white p-5">
      <div className="mx-auto flex aspect-[3/4] max-h-[360px] max-w-[260px] items-center justify-center rounded-lg border-2 border-slate-300 bg-slate-50 p-4">
        <div className="relative h-full w-full overflow-hidden rounded-md border border-slate-300">
          <div className="absolute left-0 right-0 top-1/2 border-t border-slate-300" />
          <div className="absolute left-1/2 top-1/2 size-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-300" />
          <div className="absolute left-1/2 top-6 h-10 w-20 -translate-x-1/2 rounded-b-full border border-t-0 border-slate-300" />
          <div className="absolute bottom-6 left-1/2 h-10 w-20 -translate-x-1/2 rounded-t-full border border-b-0 border-slate-300" />
          <div className={`absolute size-6 rounded-full border-4 border-white bg-primary shadow ${markerClass}`} />
        </div>
      </div>
      <div className="mt-4 rounded-lg border border-border bg-white p-3">
        <p className="text-xs font-semibold uppercase text-muted">Position</p>
        <p className="mt-1 font-bold text-slate-950">{positionLabel(normalizedPosition)}</p>
      </div>
    </article>
  );
}

function NotesList({
  entries,
}: {
  entries: {
    id: string;
    type: string;
    title: string;
    body: string;
    occurredAt: Date;
    followUpAt: Date | null;
    createdByUser: { displayName: string | null; email: string } | null;
  }[];
}) {
  if (entries.length === 0) {
    return <p className="p-5 text-sm text-muted">Noch keine Akteneintraege vorhanden.</p>;
  }

  return (
    <div className="space-y-4 p-5">
      {entries.map((entry) => (
        <article className="border-l-2 border-primary pl-4" key={entry.id}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-950">{formatDate(entry.occurredAt)}</span>
            <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-primary">
              {fileEntryTypeLabel(entry.type)}
            </span>
            {entry.followUpAt ? (
              <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                Wiedervorlage {formatDate(entry.followUpAt)}
              </span>
            ) : null}
          </div>
          <h3 className="mt-2 font-semibold text-slate-950">{entry.title}</h3>
          <p className="mt-1 line-clamp-3 whitespace-pre-line text-sm leading-6 text-muted">{entry.body}</p>
          <p className="mt-2 text-xs text-muted">
            {entry.createdByUser?.displayName ?? entry.createdByUser?.email ?? "Trainerteam"}
          </p>
        </article>
      ))}
    </div>
  );
}

function RatingBar({ label, value }: { label: string; value: number | null }) {
  const percentage = value === null ? 0 : (value / 10) * 100;

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <p className="font-semibold text-slate-900">{label}</p>
        <p className="text-xl font-bold tabular-nums text-slate-950">{formatRating(value)}</p>
      </div>
      <div className="mt-3 h-2 rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-primary" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function Field({
  defaultValue,
  label,
  name,
  required,
  type = "text",
}: {
  defaultValue?: string;
  label: string;
  name: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="text-sm font-semibold text-slate-800">
      {label}
      <input
        className="mt-2 h-10 w-full rounded-lg border border-border px-3 text-sm"
        defaultValue={defaultValue}
        name={name}
        required={required}
        type={type}
      />
    </label>
  );
}

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function formatRating(value: number | null) {
  if (value === null) {
    return "-";
  }

  return value.toFixed(1);
}

function formatSkill(value: number | null) {
  if (value === null) {
    return "-";
  }

  return value.toFixed(0);
}

function getAge(birthDate: Date) {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const birthdayThisYear = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());

  if (today < birthdayThisYear) {
    age -= 1;
  }

  return age;
}

function formLabel(matchForm: number | null, trainingForm: number | null) {
  const values = [matchForm, trainingForm].filter((value): value is number => value !== null);

  if (values.length === 0) {
    return "Noch offen";
  }

  const value = average(values);

  if (value === null) {
    return "Noch offen";
  }

  if (value >= 8) {
    return "Sehr gut";
  }

  if (value >= 6.5) {
    return "Gut";
  }

  if (value >= 5) {
    return "Stabil";
  }

  return "Im Aufbau";
}

function positionMarkerClass(position: string) {
  switch (position) {
    case "TW":
      return "bottom-5 left-1/2 -translate-x-1/2";
    case "IV":
      return "bottom-1/4 left-1/2 -translate-x-1/2";
    case "AV":
      return "bottom-1/3 left-4";
    case "DM":
      return "bottom-[42%] left-1/2 -translate-x-1/2";
    case "ZM":
      return "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2";
    case "OM":
      return "top-[38%] left-1/2 -translate-x-1/2";
    case "FL":
      return "top-1/3 right-4";
    default:
      return "top-1/4 left-1/2 -translate-x-1/2";
  }
}

function positionLabel(position: string) {
  switch (position) {
    case "TW":
      return "Torhueter";
    case "IV":
      return "Innenverteidiger";
    case "AV":
      return "Aussenverteidiger";
    case "DM":
      return "Defensives Mittelfeld";
    case "ZM":
      return "Zentrales Mittelfeld";
    case "OM":
      return "Offensives Mittelfeld";
    case "FL":
      return "Fluegel";
    default:
      return "Sturm";
  }
}
