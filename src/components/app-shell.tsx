import {
  BarChart3,
  CalendarDays,
  CalendarRange,
  ClipboardList,
  MailPlus,
  Dumbbell,
  FileUp,
  LayoutDashboard,
  MessageSquare,
  Menu,
  Shield,
  Trophy,
  Users,
  UserCog,
  X,
} from "lucide-react";
import Link from "next/link";

import { FeedbackWidget } from "@/components/feedback-widget";
import type { AppContext } from "@/lib/app-context";
import { canUseFeedback } from "@/lib/feedback-permissions";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Kader", href: "/kader", icon: Users },
  { label: "Mitglieder", href: "/mitglieder", icon: UserCog },
  { label: "Kalender", href: "/kalender", icon: CalendarDays },
  { label: "Saisons", href: "/saisons", icon: CalendarRange },
  { label: "Training", href: "/training", icon: Dumbbell },
  { label: "Spieltage", href: "/spiele", icon: Trophy },
  { label: "Statistiken", href: "/statistiken", icon: BarChart3 },
  { label: "Importe", href: "/importe", icon: FileUp },
  { label: "Abwesenheiten", href: "/abwesenheiten", icon: ClipboardList },
  { label: "Einladungen", href: "/einladungen", icon: MailPlus },
  { label: "Feedback", href: "/feedback", icon: MessageSquare },
];

export function AppShell({
  context,
  activePath,
  children,
}: {
  context: AppContext;
  activePath: string;
  children: React.ReactNode;
}) {
  const showFeedback = canUseFeedback(context);
  const visibleNavItems = showFeedback ? navItems : navItems.filter((item) => item.href !== "/feedback");
  const activeNavItem = visibleNavItems.find((item) => item.href === activePath);

  return (
    <main className="min-h-screen bg-background text-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col lg:flex-row">
        <aside className="border-b border-border bg-white px-4 py-3 lg:w-72 lg:border-b-0 lg:border-r lg:px-6 lg:py-6">
          <details className="group lg:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
              <Brand context={context} />
              <span className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-border px-3 text-sm font-semibold text-slate-700">
                <Menu className="size-4 group-open:hidden" aria-hidden="true" />
                <X className="hidden size-4 group-open:block" aria-hidden="true" />
                {activeNavItem?.label ?? "Menue"}
              </span>
            </summary>

            <NavList activePath={activePath} className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3" items={visibleNavItems} />
            <ContextCard context={context} className="mt-4" />
          </details>

          <div className="hidden lg:block">
            <Brand context={context} />
            <NavList activePath={activePath} className="mt-6 grid grid-cols-1 gap-2" items={visibleNavItems} />
            <ContextCard context={context} className="mt-6" />
          </div>
        </aside>

        <section className="flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
          {showFeedback ? (
            <div className="mb-4 flex justify-end">
              <FeedbackWidget />
            </div>
          ) : null}
          {children}
        </section>
      </div>
    </main>
  );
}

function Brand({ context }: { context: AppContext }) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary text-white">
        <Shield className="size-5" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-lg font-bold">VereinDigital</span>
        <span className="block truncate text-sm text-muted">{context.club.name}</span>
      </span>
    </span>
  );
}

function NavList({
  activePath,
  className,
  items,
}: {
  activePath: string;
  className: string;
  items: typeof navItems;
}) {
  return (
    <nav className={className}>
      {items.map((item) => {
        const active = activePath === item.href;

        return (
          <Link
            className={`flex h-11 min-w-0 items-center gap-3 rounded-lg px-3 text-sm font-medium transition ${
              active ? "bg-blue-50 text-primary" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
            }`}
            href={item.href}
            key={item.href}
          >
            <item.icon className="size-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function ContextCard({ className, context }: { className?: string; context: AppContext }) {
  return (
    <div className={`rounded-lg border border-border bg-slate-50 p-4 ${className ?? ""}`}>
      <p className="text-xs font-semibold uppercase text-muted">Aktive Saison</p>
      <p className="mt-2 font-semibold">{context.activeSeason.name}</p>
      <div className="my-3 h-px bg-border" />
      <p className="text-xs font-semibold uppercase text-muted">Aktives Team</p>
      <p className="mt-2 font-semibold">{context.activeTeam?.name ?? "Kein Team"}</p>
      <p className="mt-1 text-sm text-muted">{context.isClubAdmin ? "Admin-Zugriff" : "Team-Zugriff"}</p>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-border pb-6 xl:flex-row xl:items-center xl:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase text-primary">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-normal text-slate-950 sm:text-4xl">{title}</h1>
        {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{description}</p> : null}
      </div>
      {action ? <div className="flex flex-wrap gap-3">{action}</div> : null}
    </header>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-white p-8 text-center">
      <p className="text-lg font-semibold text-slate-950">{title}</p>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
