import { ArrowRight, FileSpreadsheet, Link2, Upload } from "lucide-react";
import Link from "next/link";

import { AppShell, EmptyState, PageHeader } from "@/components/app-shell";
import { requireActiveTeam, requireAppContext } from "@/lib/app-context";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function ImportsPage() {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  const jobs = await prisma.importJob.findMany({
    where: {
      teamId: activeTeam.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 8,
  });

  return (
    <AppShell context={context} activePath="/importe">
      <PageHeader
        action={
          <>
            <Link className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-semibold text-slate-800" href="/importe/kader">
              <FileSpreadsheet className="size-4" aria-hidden="true" />
              Kader importieren
            </Link>
            <Link className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white" href="/importe/spieltage">
              <Upload className="size-4" aria-hidden="true" />
              Spieltag importieren
            </Link>
          </>
        }
        description="Kaderlisten und Spieltagsstatistiken per CSV oder AI-URL vorbereiten, pruefen und erst danach bestaetigen."
        eyebrow="Importe"
        title={`Importe ${activeTeam.name}`}
      />

      <section className="grid gap-5 py-6 xl:grid-cols-2">
        <ImportCard
          description="Spieler per CSV-Vorlage oder per URL-Extraktion vorbereiten. Bestehende Spieler werden vor dem Schreiben abgeglichen."
          href="/importe/kader"
          icon={<FileSpreadsheet className="size-5" aria-hidden="true" />}
          title="Kaderimport"
        />
        <ImportCard
          description="Spielerstatistiken importieren, einem Spiel zuordnen und Tore, Vorlagen, Minuten, Karten und Bewertungen uebernehmen."
          href="/importe/spieltage"
          icon={<Link2 className="size-5" aria-hidden="true" />}
          title="Spieltagsstatistiken"
        />
      </section>

      <section className="pb-6">
        <h2 className="text-xl font-bold text-slate-950">Letzte Importjobs</h2>
        {jobs.length > 0 ? (
          <div className="mt-4 overflow-hidden rounded-lg border border-border bg-white">
            <div className="divide-y divide-border">
              {jobs.map((job) => (
                <Link className="grid gap-3 p-5 transition hover:bg-slate-50 md:grid-cols-[1fr_160px_180px_140px]" href={`/importe/${job.id}`} key={job.id}>
                  <div>
                    <p className="font-semibold text-slate-950">{job.type === "ROSTER" ? "Kaderimport" : "Spieltagsimport"}</p>
                    <p className="mt-1 text-sm text-muted">{job.sourceUrl ?? job.fileName ?? sourceTypeLabel(job.sourceType)}</p>
                  </div>
                  <p className="text-sm text-muted">{sourceTypeLabel(job.sourceType)}</p>
                  <p className="text-sm text-muted">{formatDateTime(job.createdAt)}</p>
                  <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${statusClass(job.status)}`}>{statusLabel(job.status)}</span>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState
            description="Sobald du einen CSV- oder AI-URL-Import vorbereitest, erscheint der Job hier."
            title="Noch keine Importjobs"
          />
        )}
      </section>
    </AppShell>
  );
}

function ImportCard({
  description,
  href,
  icon,
  title,
}: {
  description: string;
  href: string;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <Link className="group rounded-lg border border-border bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-sm" href={href}>
      <div className="flex items-start justify-between gap-4">
        <span className="flex size-11 items-center justify-center rounded-lg bg-blue-50 text-primary">{icon}</span>
        <ArrowRight className="size-5 text-muted transition group-hover:translate-x-1 group-hover:text-primary" aria-hidden="true" />
      </div>
      <h2 className="mt-6 text-2xl font-bold text-slate-950">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-muted">{description}</p>
    </Link>
  );
}

function sourceTypeLabel(value: string) {
  return value === "AI_URL" ? "AI-URL" : "CSV-Vorlage";
}

function statusLabel(value: string) {
  const labels: Record<string, string> = {
    CONFIRMED: "Bestaetigt",
    DRAFT: "Entwurf",
    FAILED: "Fehler",
    PARSED: "Pruefen",
  };

  return labels[value] ?? value;
}

function statusClass(value: string) {
  if (value === "CONFIRMED") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (value === "FAILED") {
    return "bg-rose-50 text-rose-700";
  }

  return "bg-blue-50 text-primary";
}
