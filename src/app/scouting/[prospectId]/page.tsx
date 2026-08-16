import { ClipboardEdit, Mail, Phone, Shield, Star } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell, Breadcrumbs } from "@/components/app-shell";
import { PlayerTabs } from "@/components/player-tabs";
import { SubmitButton } from "@/components/submit-button";
import {
  convertScoutingProspectToPlayer,
  createScoutingAttributeSnapshot,
  createScoutingEvent,
  ensureScoutingPermissions,
  updateScoutingProspectStatus,
} from "@/lib/actions";
import { hasPermission, requireAppContext, requirePermission } from "@/lib/app-context";
import { formatDate, toDateInputValue } from "@/lib/format";
import { attributeCategoryLabel, ensureDefaultAttributeDefinitions, mapPositionToGroup } from "@/lib/player-development";
import { prisma } from "@/lib/prisma";
import { scoutingEventTypeLabel, scoutingEventTypeValues, scoutingStatusLabel, scoutingStatusValues } from "@/lib/scouting";

import { ConvertToPlayerButton } from "./convert-to-player-button";
import { ScoutingProspectForm } from "@/app/scouting/scouting-prospect-form";

export default async function ScoutingProspectPage({
  params,
  searchParams,
}: {
  params: Promise<{ prospectId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const context = await requireAppContext();
  await ensureScoutingPermissions(context.club.id);
  requirePermission(context, "scouting.read", context.activeTeam?.id);
  const { prospectId } = await params;
  const query = await searchParams;
  await ensureDefaultAttributeDefinitions(context.club.id);

  const prospect = await prisma.scoutingProspect.findFirst({
    where: {
      id: prospectId,
      clubId: context.club.id,
    },
    include: {
      events: {
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
      },
      attributeSnapshots: {
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
      convertedPlayerProfile: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!prospect) {
    notFound();
  }

  const canManage = hasPermission(context, "scouting.manage", context.activeTeam?.id);
  const positionGroups = Array.from(new Set(prospect.positions.map(mapPositionToGroup)));
  const attributeDefinitions = await prisma.playerAttributeDefinition.findMany({
    where: {
      clubId: context.club.id,
      positionGroup: {
        in: ["ALL", ...positionGroups],
      },
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

  const latestSnapshot = prospect.attributeSnapshots[0];
  const previousSnapshot = prospect.attributeSnapshots[1];
  const previousRatings = new Map(
    previousSnapshot?.ratings.map((rating) => [rating.attributeDefinitionId, rating.value]) ?? [],
  );
  const latestRatings = latestSnapshot?.ratings ?? [];
  const overallSkill = average(latestRatings.map((rating) => rating.value));
  const today = toDateInputValue(new Date());
  const age = getAge(prospect.birthDate);

  return (
    <AppShell activePath="/scouting" context={context}>
      <div className="space-y-6 py-2">
        <Breadcrumbs
          items={[{ label: "Scouting", href: "/scouting" }, { label: `${prospect.firstName} ${prospect.lastName}` }]}
        />

        <section className="rounded-lg border border-border bg-surface p-5 sm:p-6">
          <div className="grid gap-6 lg:grid-cols-[180px_1fr] xl:grid-cols-[200px_1fr_260px]">
            <div className="flex aspect-[4/5] w-full max-w-48 items-center justify-center rounded-lg border border-border bg-slate-950 text-5xl font-bold text-white shadow-sm max-lg:mx-auto">
              {prospect.firstName[0]}
              {prospect.lastName[0]}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-4xl font-bold tracking-normal text-foreground sm:text-5xl">
                  {prospect.firstName} {prospect.lastName}
                </h1>
                {prospect.positions.map((position) => (
                  <span className="rounded-lg bg-primary px-3 py-1 text-sm font-bold text-white" key={position}>
                    {position}
                  </span>
                ))}
                <StatusBadge status={prospect.status} />
              </div>
              <div className="mt-4 flex flex-wrap gap-4 text-sm font-medium text-muted">
                <span>{age !== null ? `${age} Jahre` : "Alter unbekannt"}</span>
                <span>Geboren am {prospect.birthDate ? formatDate(prospect.birthDate) : "unbekannt"}</span>
                <span>{prospect.currentClub ?? "Aktueller Verein unbekannt"}</span>
              </div>
              <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <ProfileStat label="Gesamt-Skill" value={formatSkill(overallSkill)} />
                <ProfileStat label="Beobachtungen" value={prospect.events.length.toString()} />
                <ProfileStat label="Prioritaet" value={prospect.interestLevel ? `${prospect.interestLevel}/5` : "-"} />
                <ProfileStat
                  label="Bewertungsstand"
                  value={latestSnapshot ? formatDate(latestSnapshot.ratedAt) : "-"}
                />
              </div>
            </div>
            <div className="space-y-3">
              <ContactRow icon={<Phone className="size-4" aria-hidden="true" />} value={prospect.phone} />
              <ContactRow icon={<Mail className="size-4" aria-hidden="true" />} value={prospect.email} />
              {prospect.source ? (
                <div className="rounded-lg border border-border bg-surface-muted p-3">
                  <p className="text-xs font-semibold uppercase text-muted">Quelle</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{prospect.source}</p>
                </div>
              ) : null}
              {prospect.convertedPlayerProfile ? (
                <Link
                  className="block rounded-lg border border-success-soft bg-success-soft p-3 text-sm font-semibold text-success"
                  href={`/kader/${prospect.convertedPlayerProfile.id}`}
                >
                  Bereits im Kader &rarr; Profil ansehen
                </Link>
              ) : null}
            </div>
          </div>
        </section>

        <PlayerTabs
          tabs={[
            {
              id: "uebersicht",
              label: "Uebersicht",
              content: (
                <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
                  <article className="rounded-lg border border-border bg-surface">
                    <SectionHeader description="Chronologische Beobachtungen und Kontakte." title="Ereignisse" />
                    <EventsList events={prospect.events} />
                    {canManage ? (
                      <form action={createScoutingEvent} className="grid gap-3 border-t border-border p-5">
                        <input name="prospectId" type="hidden" value={prospect.id} />
                        <div className="grid gap-3 md:grid-cols-2">
                          <label className="text-sm font-semibold text-foreground">
                            Typ
                            <select className="mt-2 h-10 w-full rounded-lg border border-border px-3 text-sm" name="type">
                              {scoutingEventTypeValues.map((type) => (
                                <option key={type} value={type}>
                                  {scoutingEventTypeLabel(type)}
                                </option>
                              ))}
                            </select>
                          </label>
                          <Field label="Titel" name="title" required />
                          <Field defaultValue={today} label="Datum" name="occurredAt" required type="date" />
                          <Field label="Wiedervorlage" name="followUpAt" type="date" />
                        </div>
                        <label className="text-sm font-semibold text-foreground">
                          Notiz
                          <textarea className="mt-2 min-h-24 w-full rounded-lg border border-border px-3 py-2 text-sm" name="body" required />
                        </label>
                        <SubmitButton
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-dashed border-slate-400 px-4 text-sm font-semibold text-foreground md:w-max disabled:cursor-not-allowed disabled:opacity-60"
                          pendingLabel="Wird hinzugefuegt..."
                        >
                          <ClipboardEdit className="size-4" aria-hidden="true" />
                          Ereignis hinzufuegen
                        </SubmitButton>
                      </form>
                    ) : null}
                  </article>

                  <aside className="space-y-6">
                    <article className="rounded-lg border border-border bg-surface">
                      <SectionHeader description="Top-Werte aus dem letzten Bewertungsstand." title="Faehigkeiten" />
                      {latestRatings.length > 0 ? (
                        <div className="space-y-2 p-5">
                          {latestRatings.slice(0, 12).map((rating) => (
                            <AttributeRow
                              key={rating.id}
                              label={rating.attributeDefinition.name}
                              meta={attributeCategoryLabel(rating.attributeDefinition.category)}
                              previousValue={previousRatings.get(rating.attributeDefinitionId) ?? null}
                              value={rating.value}
                            />
                          ))}
                        </div>
                      ) : (
                        <p className="p-5 text-sm text-muted">Noch keine Faehigkeiten bewertet.</p>
                      )}
                    </article>
                  </aside>
                </section>
              ),
            },
            {
              id: "bewertung",
              label: "Bewertung",
              content: (
                <section className="rounded-lg border border-border bg-surface">
                  <SectionHeader description="Faehigkeiten auf einer Skala von 1 bis 20 erfassen." title="Neuer Bewertungsstand" />
                  {query.error === "attribute-values" ? (
                    <p className="mx-5 mt-5 rounded-lg bg-danger-soft px-3 py-2 text-sm font-semibold text-danger">
                      Bitte mindestens einen Wert zwischen 1 und 20 erfassen.
                    </p>
                  ) : null}
                  {canManage ? (
                    <form action={createScoutingAttributeSnapshot} className="grid gap-4 p-5">
                      <input name="prospectId" type="hidden" value={prospect.id} />
                      <div className="grid gap-3 md:grid-cols-3">
                        <Field defaultValue="Scouting-Bewertung" label="Titel" name="title" required />
                        <Field defaultValue={today} label="Bewertungsdatum" name="ratedAt" required type="date" />
                        <label className="text-sm font-semibold text-foreground md:col-span-1">
                          Notiz
                          <input className="mt-2 h-10 w-full rounded-lg border border-border px-3 text-sm" name="notes" />
                        </label>
                      </div>
                      <div className="grid gap-4 xl:grid-cols-3">
                        {[...definitionsByCategory.entries()].map(([category, definitions]) => (
                          <div className="rounded-lg border border-border p-4" key={category}>
                            <p className="text-sm font-semibold text-foreground">{attributeCategoryLabel(category)}</p>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                              {definitions.map((definition) => (
                                <label className="min-w-0 break-words text-xs font-semibold uppercase leading-snug text-muted" key={definition.id}>
                                  {definition.name}
                                  <input
                                    className="mt-1 h-10 w-full rounded-lg border border-border px-3 text-sm font-normal text-foreground"
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
                      <SubmitButton
                        className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white md:w-max disabled:cursor-not-allowed disabled:opacity-60"
                        pendingLabel="Speichert..."
                      >
                        Bewertungsstand speichern
                      </SubmitButton>
                    </form>
                  ) : (
                    <p className="p-5 text-sm text-muted">Keine Berechtigung, Bewertungen zu erfassen.</p>
                  )}
                </section>
              ),
            },
            {
              id: "stammdaten",
              label: "Stammdaten",
              content: (
                <div className="grid gap-6 lg:grid-cols-2">
                  <article className="rounded-lg border border-border bg-surface">
                    <SectionHeader action={<Shield className="size-5 text-muted" aria-hidden="true" />} description="Basisdaten und Kontakt bearbeiten." title="Stammdaten" />
                    <div className="p-5">
                      {canManage ? (
                        <ScoutingProspectForm embedded prospect={prospect} />
                      ) : (
                        <p className="text-sm text-muted">Keine Berechtigung, diesen Prospect zu bearbeiten.</p>
                      )}
                    </div>
                  </article>

                  <div className="space-y-6">
                    {canManage ? (
                      <article className="rounded-lg border border-border bg-surface p-5">
                        <h2 className="text-lg font-bold text-foreground">Status</h2>
                        <p className="mt-2 text-sm leading-6 text-muted">Aktuellen Stand im Scouting-Prozess setzen.</p>
                        <form action={updateScoutingProspectStatus} className="mt-4 flex flex-wrap items-center gap-3">
                          <input name="prospectId" type="hidden" value={prospect.id} />
                          <select className="h-10 rounded-lg border border-border px-3 text-sm" defaultValue={prospect.status} name="status">
                            {scoutingStatusValues.map((option) => (
                              <option key={option} value={option}>
                                {scoutingStatusLabel(option)}
                              </option>
                            ))}
                          </select>
                          <SubmitButton
                            className="h-10 rounded-lg border border-border px-4 text-sm font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                            pendingLabel="Speichert..."
                          >
                            Status speichern
                          </SubmitButton>
                        </form>
                      </article>
                    ) : null}

                    {canManage && context.activeTeam && !prospect.convertedPlayerProfileId ? (
                      <article className="rounded-lg border border-primary-soft bg-primary-soft/40 p-5">
                        <h2 className="text-lg font-bold text-foreground">In Kader uebernehmen</h2>
                        <p className="mt-2 text-sm leading-6 text-muted">
                          Legt einen echten Kaderspieler mit diesen Stammdaten fuer &quot;{context.activeTeam.name}&quot; an und markiert den Prospect als verpflichtet.
                        </p>
                        <form action={convertScoutingProspectToPlayer} className="mt-4">
                          <input name="prospectId" type="hidden" value={prospect.id} />
                          <ConvertToPlayerButton teamName={context.activeTeam.name} />
                        </form>
                      </article>
                    ) : null}
                  </div>
                </div>
              ),
            },
          ]}
        />
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
        <h2 className="text-2xl font-bold tracking-normal text-foreground">{title}</h2>
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
      <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

function ContactRow({ icon, value }: { icon: React.ReactNode; value: string | null }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-muted p-3 text-sm">
      <span className="text-muted">{icon}</span>
      <span className={value ? "font-semibold text-foreground" : "text-muted"}>{value ?? "Nicht hinterlegt"}</span>
    </div>
  );
}

function AttributeRow({
  label,
  meta,
  previousValue,
  value,
}: {
  label: string;
  meta: string;
  previousValue: number | null;
  value: number;
}) {
  const trend = previousValue !== null ? value - previousValue : null;

  return (
    <div className="rounded-lg px-3 py-2 odd:bg-surface-muted">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-foreground">{label}</p>
          <p className="mt-1 text-xs text-muted">
            {meta}
            {previousValue !== null ? ` · Vorher ${previousValue} (${trend! > 0 ? "+" : ""}${trend})` : ""}
          </p>
        </div>
        <p className="text-lg font-bold tabular-nums text-primary">{value}</p>
      </div>
    </div>
  );
}

function EventsList({
  events,
}: {
  events: {
    id: string;
    type: string;
    title: string;
    body: string;
    occurredAt: Date;
    followUpAt: Date | null;
    createdByUser: { displayName: string | null; email: string } | null;
  }[];
}) {
  if (events.length === 0) {
    return <p className="p-5 text-sm text-muted">Noch keine Ereignisse erfasst.</p>;
  }

  return (
    <div className="space-y-4 p-5">
      {events.map((event) => (
        <article className="border-l-2 border-primary pl-4" key={event.id}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-foreground">{formatDate(event.occurredAt)}</span>
            <span className="rounded-full bg-primary-soft px-2 py-1 text-xs font-semibold text-primary">
              {scoutingEventTypeLabel(event.type)}
            </span>
            {event.followUpAt ? (
              <span className="rounded-full bg-warning-soft px-2 py-1 text-xs font-semibold text-warning">
                Wiedervorlage {formatDate(event.followUpAt)}
              </span>
            ) : null}
          </div>
          <h3 className="mt-2 font-semibold text-foreground">{event.title}</h3>
          <p className="mt-1 whitespace-pre-line text-sm leading-6 text-muted">{event.body}</p>
          <p className="mt-2 text-xs text-muted">{event.createdByUser?.displayName ?? event.createdByUser?.email ?? "Trainerteam"}</p>
        </article>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-lg bg-surface-muted px-3 py-1 text-sm font-semibold text-foreground">
      <Star className="size-3.5" aria-hidden="true" />
      {scoutingStatusLabel(status)}
    </span>
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
    <label className="text-sm font-semibold text-foreground">
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

function formatSkill(value: number | null) {
  if (value === null) {
    return "-";
  }

  return value.toFixed(0);
}

function getAge(birthDate: Date | null) {
  if (!birthDate) {
    return null;
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const birthdayThisYear = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());

  if (today < birthdayThisYear) {
    age -= 1;
  }

  return age;
}
