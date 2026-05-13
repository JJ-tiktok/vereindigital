import { FeedbackStatus } from "@prisma/client";
import { ArrowLeft, Camera, Monitor, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AppShell, PageHeader } from "@/components/app-shell";
import { requireAppContext } from "@/lib/app-context";
import { updateFeedbackStatus } from "@/lib/feedback-actions";
import { canUseFeedback } from "@/lib/feedback-permissions";
import {
  feedbackPriorityClass,
  feedbackPriorityLabel,
  feedbackStatusClass,
  feedbackStatusLabel,
  feedbackTypeLabel,
} from "@/lib/feedback-labels";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function FeedbackDetailPage({
  params,
}: {
  params: Promise<{ feedbackId: string }>;
}) {
  const context = await requireAppContext();

  if (!canUseFeedback(context)) {
    redirect("/dashboard");
  }

  const { feedbackId } = await params;
  const item = await prisma.feedbackItem.findFirst({
    where: {
      clubId: context.club.id,
      id: feedbackId,
    },
    include: {
      createdByUser: true,
      season: true,
      team: true,
    },
  });

  if (!item) {
    notFound();
  }

  return (
    <AppShell context={context} activePath="/feedback">
      <PageHeader
        action={
          <Link className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-semibold text-slate-800" href="/feedback">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Zurueck
          </Link>
        }
        description={`${feedbackTypeLabel(item.type)} / ${formatDateTime(item.createdAt)}`}
        eyebrow="Feedback Detail"
        title={item.title}
      />

      <section className="grid gap-6 py-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <article className="rounded-lg border border-border bg-white p-5">
            <div className="flex flex-wrap gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${feedbackStatusClass(item.status)}`}>{feedbackStatusLabel(item.status)}</span>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${feedbackPriorityClass(item.priority)}`}>{feedbackPriorityLabel(item.priority)}</span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{feedbackTypeLabel(item.type)}</span>
            </div>
            <h2 className="mt-6 text-xl font-bold text-slate-950">Beschreibung</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{item.description}</p>
          </article>

          <article className="rounded-lg border border-border bg-white p-5">
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-950">
              <Camera className="size-5 text-primary" aria-hidden="true" />
              Screenshot
            </h2>
            {item.screenshotData ? (
              <div className="mt-4 overflow-hidden rounded-lg border border-border bg-slate-50">
                <Image alt={`Screenshot zu ${item.title}`} className="h-auto w-full" height={720} src={item.screenshotData} unoptimized width={1280} />
              </div>
            ) : (
              <p className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-muted">Kein Screenshot gespeichert. Das Feedback bleibt trotzdem gueltig.</p>
            )}
          </article>
        </div>

        <aside className="space-y-6">
          {context.isClubAdmin ? (
            <form action={updateFeedbackStatus} className="rounded-lg border border-border bg-white p-5">
              <input name="feedbackId" type="hidden" value={item.id} />
              <label className="text-sm font-semibold text-slate-800" htmlFor="status">
                Status
              </label>
              <select className="mt-2 h-10 w-full rounded-lg border border-border px-3 text-sm" defaultValue={item.status} id="status" name="status">
                {Object.values(FeedbackStatus).map((status) => (
                  <option key={status} value={status}>
                    {feedbackStatusLabel(status)}
                  </option>
                ))}
              </select>
              <button className="mt-4 h-10 w-full rounded-lg bg-primary px-4 text-sm font-semibold text-white" type="submit">
                Status speichern
              </button>
            </form>
          ) : null}

          <article className="rounded-lg border border-border bg-white p-5">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950">
              <UserRound className="size-5 text-primary" aria-hidden="true" />
              Absender
            </h2>
            <dl className="mt-4 space-y-3 text-sm">
              <InfoRow label="Name" value={item.createdByUser?.displayName ?? "Unbekannt"} />
              <InfoRow label="E-Mail" value={item.createdByUser?.email ?? "-"} />
              <InfoRow label="Verein" value={context.club.name} />
              <InfoRow label="Team" value={item.team?.name ?? "Verein"} />
              <InfoRow label="Saison" value={item.season?.name ?? "-"} />
            </dl>
          </article>

          <article className="rounded-lg border border-border bg-white p-5">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950">
              <Monitor className="size-5 text-primary" aria-hidden="true" />
              Kontext
            </h2>
            <dl className="mt-4 space-y-3 text-sm">
              <InfoRow label="Route" value={item.route ?? "-"} />
              <InfoRow label="Viewport" value={item.viewportWidth && item.viewportHeight ? `${item.viewportWidth} x ${item.viewportHeight}` : "-"} />
              <InfoRow label="Browser" value={item.userAgent ?? "-"} />
            </dl>
          </article>
        </aside>
      </section>
    </AppShell>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-semibold text-slate-900">{label}</dt>
      <dd className="mt-1 break-words text-muted">{value}</dd>
    </div>
  );
}
