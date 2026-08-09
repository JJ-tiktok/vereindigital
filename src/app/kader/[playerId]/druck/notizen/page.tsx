import Link from "next/link";
import { notFound } from "next/navigation";

import { PrintButton } from "@/components/print-button";
import { requireActiveTeam, requireAppContext, requirePermission } from "@/lib/app-context";
import { formatDate } from "@/lib/format";
import { fileEntryTypeLabel } from "@/lib/player-development";
import { prisma } from "@/lib/prisma";

export default async function PlayerNotesPrintPage({
  params,
}: {
  params: Promise<{ playerId: string }>;
}) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  requirePermission(context, "player.profile.manage", activeTeam.id);
  const { playerId } = await params;

  const player = await prisma.playerProfile.findFirst({
    where: {
      id: playerId,
      clubId: context.club.id,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      fileEntries: {
        where: {
          teamId: activeTeam.id,
          visibility: "PLAYER",
        },
        orderBy: {
          occurredAt: "desc",
        },
      },
    },
  });

  if (!player) {
    notFound();
  }

  const entries = player.fileEntries;

  return (
    <main className="min-h-screen bg-surface-muted px-4 py-6 text-foreground print:bg-white print:px-0 print:py-0">
      <div className="mx-auto max-w-3xl rounded-2xl bg-surface p-8 shadow-sm print:max-w-none print:rounded-none print:p-0 print:shadow-none">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground" href={`/kader/${player.id}`}>
            Zurueck
          </Link>
          <PrintButton />
        </div>

        <header className="border-b border-border pb-6">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">Gespraechsnotizen</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight">
            {player.firstName} {player.lastName}
          </h1>
          <p className="mt-2 text-sm text-muted">Stand: {formatDate(new Date())}</p>
        </header>

        {entries.length > 0 ? (
          <div className="space-y-6 py-6">
            {entries.map((entry) => (
              <article className="break-inside-avoid border-b border-border pb-4 last:border-0" key={entry.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-foreground">{formatDate(entry.occurredAt)}</span>
                  <span className="rounded-full bg-primary-soft px-2 py-1 text-xs font-semibold text-primary">
                    {fileEntryTypeLabel(entry.type)}
                  </span>
                </div>
                <h2 className="mt-2 text-lg font-semibold text-foreground">{entry.title}</h2>
                <p className="mt-1 whitespace-pre-line text-sm leading-6 text-foreground">{entry.body}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="py-6 text-sm text-muted">Noch keine Spieler-Notizen fuer diesen Spieler markiert.</p>
        )}
      </div>
    </main>
  );
}
