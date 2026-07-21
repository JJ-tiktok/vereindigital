import { FeedbackPriority, FeedbackStatus, FeedbackType } from "@prisma/client";
import { MessageSquarePlus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

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
        <form className="grid gap-3 rounded-lg border border-border bg-white p-4 md:grid-cols-[1fr_1fr_1fr_auto]" action="/feedback">
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
          <div className="overflow-hidden rounded-lg border border-border bg-white">
            <div className="divide-y divide-border">
              {feedbackItems.map((item) => (
                <Link className="grid gap-4 p-5 transition hover:bg-slate-50 xl:grid-cols-[1fr_140px_140px_180px]" href={`/feedback/${item.id}`} key={item.id}>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{feedbackTypeLabel(item.type)}</span>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${feedbackPriorityClass(item.priority)}`}>{feedbackPriorityLabel(item.priority)}</span>
                    </div>
                    <p className="mt-3 font-semibold text-slate-950">{item.title}</p>
                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted">{item.description}</p>
                  </div>
                  <span className={`h-fit w-fit rounded-full px-3 py-1 text-xs font-bold ${feedbackStatusClass(item.status)}`}>{feedbackStatusLabel(item.status)}</span>
                  <div className="text-sm text-muted">
                    <p>{item.createdByUser?.displayName ?? item.createdByUser?.email ?? "Unbekannt"}</p>
                    <p className="mt-1">{item.team?.name ?? "Verein"}</p>
                  </div>
                  <p className="text-sm text-muted">{formatDateTime(item.createdAt)}</p>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState
            action={
              <span className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-2 text-sm font-semibold text-primary">
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
