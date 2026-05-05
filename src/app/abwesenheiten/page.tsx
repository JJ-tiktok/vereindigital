import { AppShell, EmptyState, PageHeader } from "@/components/app-shell";
import { createPlayerAvailability } from "@/lib/actions";
import { requireActiveTeam, requireAppContext } from "@/lib/app-context";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function AvailabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  const query = await searchParams;
  const players = await prisma.playerProfile.findMany({
    where: {
      memberships: {
        some: {
          teamId: activeTeam.id,
          status: "ACTIVE",
          role: {
            key: "player",
          },
        },
      },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  const availabilities = await prisma.playerAvailability.findMany({
    where: {
      playerProfile: {
        memberships: {
          some: {
            teamId: activeTeam.id,
            status: "ACTIVE",
          },
        },
      },
    },
    include: {
      playerProfile: true,
    },
    orderBy: {
      startsAt: "desc",
    },
    take: 20,
  });

  return (
    <AppShell context={context} activePath="/abwesenheiten">
      <PageHeader
        eyebrow="Verfuegbarkeit"
        title="Abwesenheiten"
        description="Urlaub, Verletzungen und Krankheit erfassen. Betroffene Termine erhalten automatisch eine Absage."
      />

      <div className="grid gap-6 py-6 xl:grid-cols-[420px_1fr]">
        <section className="rounded-lg border border-border bg-white p-6">
          <h2 className="text-xl font-semibold">Abwesenheit eintragen</h2>
          {query.error === "time-range" ? (
            <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
              Das Enddatum darf nicht vor dem Startdatum liegen.
            </p>
          ) : null}
          {players.length > 0 ? (
            <form action={createPlayerAvailability} className="mt-5 space-y-5">
              <div>
                <label className="text-sm font-semibold text-slate-800" htmlFor="playerProfileId">
                  Spieler
                </label>
                <select className="mt-2 h-11 w-full rounded-lg border border-border px-3 text-sm" id="playerProfileId" name="playerProfileId">
                  {players.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.firstName} {player.lastName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-800" htmlFor="type">
                  Typ
                </label>
                <select className="mt-2 h-11 w-full rounded-lg border border-border px-3 text-sm" id="type" name="type">
                  <option value="VACATION">Urlaub</option>
                  <option value="INJURY">Verletzung</option>
                  <option value="ILLNESS">Krankheit</option>
                  <option value="OTHER">Sonstiges</option>
                </select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <DateTimeField label="Start" name="startsAt" />
                <DateTimeField label="Ende" name="endsAt" />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-800" htmlFor="note">
                  Notiz
                </label>
                <textarea className="mt-2 min-h-24 w-full rounded-lg border border-border px-3 py-2 text-sm" id="note" name="note" />
              </div>
              <button className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white" type="submit">
                Abwesenheit speichern
              </button>
            </form>
          ) : (
            <div className="mt-5">
              <EmptyState title="Keine Spieler vorhanden" description="Lege zuerst Spieler im Kader an." />
            </div>
          )}
        </section>

        <section className="rounded-lg border border-border bg-white">
          <div className="border-b border-border p-5">
            <h2 className="text-xl font-semibold">Letzte Abwesenheiten</h2>
            <p className="mt-1 text-sm text-muted">Die letzten Eintraege fuer dieses Team.</p>
          </div>
          {availabilities.length > 0 ? (
            <div className="divide-y divide-border">
              {availabilities.map((availability) => (
                <div className="grid gap-3 p-5 md:grid-cols-[1fr_140px_220px]" key={availability.id}>
                  <div>
                    <p className="font-semibold text-slate-950">
                      {availability.playerProfile.firstName} {availability.playerProfile.lastName}
                    </p>
                    <p className="text-sm text-muted">{availability.note || "Keine Notiz"}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-center text-xs font-semibold text-slate-700">
                    {availabilityTypeLabel(availability.type)}
                  </span>
                  <p className="text-sm text-muted">
                    {formatDateTime(availability.startsAt)} bis {formatDateTime(availability.endsAt)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-5">
              <EmptyState title="Keine Abwesenheiten" description="Aktuell sind keine Abwesenheiten eingetragen." />
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function DateTimeField({ label, name }: { label: string; name: string }) {
  return (
    <div>
      <label className="text-sm font-semibold text-slate-800" htmlFor={name}>
        {label}
      </label>
      <input className="mt-2 h-11 w-full rounded-lg border border-border px-3 text-sm" id={name} name={name} required type="datetime-local" />
    </div>
  );
}

function availabilityTypeLabel(type: string) {
  switch (type) {
    case "VACATION":
      return "Urlaub";
    case "INJURY":
      return "Verletzung";
    case "ILLNESS":
      return "Krankheit";
    default:
      return "Sonstiges";
  }
}
