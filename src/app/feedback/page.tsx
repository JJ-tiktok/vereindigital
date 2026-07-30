import { FeedbackPriority, FeedbackStatus, FeedbackType } from "@prisma/client";
import { MessageSquarePlus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { FeedbackRowActions } from "@/app/feedback/feedback-row-actions";
import { AppShell, EmptyState, PageHeader } from "@/components/app-shell";
import { requireAppContext } from "@/lib/app-context";
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

export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ priority?: string; status?: string; type?: string }>;
}) {
  const context = await requireAppContext();

  if (!canUseFeedback(context)) {
    redirect("/dashboard");
  }

  const query = await searchParams;
  const type = parseEnum(FeedbackType, query.type);
  const status = parseEnum(FeedbackStatus, query.status);
  const priority = parseEnum(FeedbackPriority, query.priority);
  const feedbackItems = await prisma.feedbackItem.findMany({
    where: {
      clubId: context.club.id,
      ...(type ? { type } : {}),
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
    },
    include: {
      createdByUser: true,
      team: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
  });

  return (
    <AppShell context={context} activePath="/feedback">
      <PageHeader
        description="Bugs, Feature Requests und Verbesserungsvorschlaege aus deinem Verein."
        eyebrow="Feedback"
        title="Feedback Inbox"
      />

      <section className="space-y-5 py-6">
        <form className="grid gap-3 rounded-lg border border-border bg-surface p-4 md:grid-cols-[1fr_1fr_1fr_auto]" action="/feedback">
          <select className="h-10 rounded-lg border border-border px-3 text-sm" defaultValue={type ?? ""} name="type">
            <option value="">Alle Kategorien</option>
            {Object.values(FeedbackType).map((value) => (
              <option key={value} value={value}>
                {feedbackTypeLabel(value)}
              </option>
            ))}
          </select>
          <select className="h-10 rounded-lg border border-border px-3 text-sm" defaultValue={status ?? ""} name="status">
            <option value="">Alle Status</option>
            {Object.values(FeedbackStatus).map((value) => (
              <option key={value} value={value}>
                {feedbackStatusLabel(value)}
              </option>
            ))}
          </select>
          <select className="h-10 rounded-lg border border-border px-3 text-sm" defaultValue={priority ?? ""} name="priority">
            <option value="">Alle Prioritaeten</option>
            {Object.values(FeedbackPriority).map((value) => (
              <option key={value} value={value}>
                {feedbackPriorityLabel(value)}
              </option>
            ))}
          </select>
          <button className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white" type="submit">
            Filtern
          </button>
        </form>

        {feedbackItems.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <div className="overflow-x-auto">
              <div className="hidden min-w-[900px] grid-cols-[1fr_130px_140px_170px_150px_190px] gap-4 border-b border-border bg-surface-muted px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted xl:grid">
                <span>Feedback</span>
                <span>Kategorie</span>
                <span>Prioritaet</span>
                <span>Status</span>
                <span>Absender</span>
                <span>Aktionen</span>
              </div>
              <div className="min-w-[900px] divide-y divide-border xl:min-w-0">
                {feedbackItems.map((item) => (
                  <div className="grid gap-4 p-5 xl:grid-cols-[1fr_130px_140px_170px_150px_190px] xl:items-center" key={item.id}>
                    <Link className="min-w-0 transition hover:opacity-80" href={`/feedback/${item.id}`}>
                      <p className="truncate font-semibold text-foreground">{item.title}</p>
                      <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted">{item.description}</p>
                    </Link>
                    <span className="w-max rounded-full bg-surface-muted px-3 py-1 text-xs font-bold text-foreground">{feedbackTypeLabel(item.type)}</span>
                    <span className={`w-max rounded-full px-3 py-1 text-xs font-bold ${feedbackPriorityClass(item.priority)}`}>{feedbackPriorityLabel(item.priority)}</span>
                    <span className={`w-max rounded-full px-3 py-1 text-xs font-bold ${feedbackStatusClass(item.status)}`}>{feedbackStatusLabel(item.status)}</span>
                    <div className="text-sm text-muted">
                      <p>{item.createdByUser?.displayName ?? item.createdByUser?.email ?? "Unbekannt"}</p>
                      <p className="mt-1">{item.team?.name ?? "Verein"} / {formatDateTime(item.createdAt)}</p>
                    </div>
                    {context.isClubAdmin ? <FeedbackRowActions feedbackId={item.id} isNew={item.status === "NEW"} /> : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <EmptyState
            action={
              <span className="inline-flex items-center gap-2 rounded-lg bg-primary-soft px-4 py-2 text-sm font-semibold text-primary">
                <MessageSquarePlus className="size-4" aria-hidden="true" />
                Feedback-Button oben rechts nutzen
              </span>
            }
            description="Sobald jemand Feedback sendet, erscheint es hier mit Kontext und Screenshot."
            title="Noch kein Feedback"
          />
        )}
      </section>
    </AppShell>
  );
}

function parseEnum<T extends Record<string, string>>(source: T, value?: string) {
  return Object.values(source).includes(value ?? "") ? (value as T[keyof T]) : null;
}
