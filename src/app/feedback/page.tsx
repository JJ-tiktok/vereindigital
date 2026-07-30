import { FeedbackPriority, FeedbackStatus, FeedbackType } from "@prisma/client";
import { MessageSquarePlus } from "lucide-react";
import { redirect } from "next/navigation";

import { FeedbackTable } from "@/app/feedback/feedback-table";
import { AppShell, EmptyState, PageHeader } from "@/components/app-shell";
import { requireAppContext } from "@/lib/app-context";
import { canUseFeedback } from "@/lib/feedback-permissions";
import { feedbackPriorityLabel, feedbackStatusLabel, feedbackTypeLabel } from "@/lib/feedback-labels";
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
          <FeedbackTable
            canManage={context.isClubAdmin}
            items={feedbackItems.map((item) => ({
              id: item.id,
              title: item.title,
              description: item.description,
              type: item.type,
              priority: item.priority,
              status: item.status,
              senderName: item.createdByUser?.displayName ?? item.createdByUser?.email ?? "Unbekannt",
              teamName: item.team?.name ?? "Verein",
              createdAt: item.createdAt,
            }))}
          />
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
