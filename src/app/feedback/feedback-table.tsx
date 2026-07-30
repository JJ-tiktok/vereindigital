"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { FeedbackRowActions } from "@/app/feedback/feedback-row-actions";
import { SortableHeader } from "@/components/sortable-header";
import {
  feedbackPriorityClass,
  feedbackPriorityLabel,
  feedbackStatusClass,
  feedbackStatusLabel,
  feedbackTypeLabel,
} from "@/lib/feedback-labels";
import { formatDateTime } from "@/lib/format";
import type { FeedbackPriority, FeedbackStatus, FeedbackType } from "@prisma/client";

type FeedbackRow = {
  id: string;
  title: string;
  description: string;
  type: FeedbackType;
  priority: FeedbackPriority;
  status: FeedbackStatus;
  senderName: string;
  teamName: string;
  createdAt: Date;
};

type SortKey = "title" | "type" | "priority" | "status" | "sender";

const priorityRank: Record<FeedbackPriority, number> = { LOW: 0, MEDIUM: 1, HIGH: 2 };
const statusRank: Record<FeedbackStatus, number> = { NEW: 0, TRIAGED: 1, IN_PROGRESS: 2, DONE: 3, WONT_DO: 4 };

export function FeedbackTable({ items, canManage }: { items: FeedbackRow[]; canManage: boolean }) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sortedItems = useMemo(() => {
    if (!sortKey) {
      return items;
    }

    const dir = sortDir === "asc" ? 1 : -1;

    return [...items].sort((a, b) => {
      switch (sortKey) {
        case "title":
          return a.title.localeCompare(b.title) * dir;
        case "type":
          return a.type.localeCompare(b.type) * dir;
        case "priority":
          return (priorityRank[a.priority] - priorityRank[b.priority]) * dir;
        case "status":
          return (statusRank[a.status] - statusRank[b.status]) * dir;
        case "sender":
          return a.senderName.localeCompare(b.senderName) * dir;
        default:
          return 0;
      }
    });
  }, [items, sortKey, sortDir]);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="overflow-x-auto">
        <div className="hidden min-w-[900px] grid-cols-[1fr_130px_140px_170px_150px_190px] gap-4 border-b border-border bg-surface-muted px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted xl:grid">
          <SortableHeader label="Feedback" onClick={() => toggleSort("title")} sortDir={sortKey === "title" ? sortDir : null} />
          <SortableHeader label="Kategorie" onClick={() => toggleSort("type")} sortDir={sortKey === "type" ? sortDir : null} />
          <SortableHeader label="Prioritaet" onClick={() => toggleSort("priority")} sortDir={sortKey === "priority" ? sortDir : null} />
          <SortableHeader label="Status" onClick={() => toggleSort("status")} sortDir={sortKey === "status" ? sortDir : null} />
          <SortableHeader label="Absender" onClick={() => toggleSort("sender")} sortDir={sortKey === "sender" ? sortDir : null} />
          <span>Aktionen</span>
        </div>
        <div className="min-w-[900px] divide-y divide-border xl:min-w-0">
          {sortedItems.map((item) => (
            <div className="grid gap-4 p-5 xl:grid-cols-[1fr_130px_140px_170px_150px_190px] xl:items-center" key={item.id}>
              <Link className="min-w-0 transition hover:opacity-80" href={`/feedback/${item.id}`}>
                <p className="truncate font-semibold text-foreground">{item.title}</p>
                <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted">{item.description}</p>
              </Link>
              <span className="w-max rounded-full bg-surface-muted px-3 py-1 text-xs font-bold text-foreground">{feedbackTypeLabel(item.type)}</span>
              <span className={`w-max rounded-full px-3 py-1 text-xs font-bold ${feedbackPriorityClass(item.priority)}`}>{feedbackPriorityLabel(item.priority)}</span>
              <span className={`w-max rounded-full px-3 py-1 text-xs font-bold ${feedbackStatusClass(item.status)}`}>{feedbackStatusLabel(item.status)}</span>
              <div className="text-sm text-muted">
                <p>{item.senderName}</p>
                <p className="mt-1">
                  {item.teamName} / {formatDateTime(item.createdAt)}
                </p>
              </div>
              {canManage ? <FeedbackRowActions feedbackId={item.id} isNew={item.status === "NEW"} /> : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
