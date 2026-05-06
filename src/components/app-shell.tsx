import {
  BarChart3,
  CalendarDays,
  CalendarRange,
  ClipboardList,
  MailPlus,
  Dumbbell,
  LayoutDashboard,
  Shield,
  Trophy,
  Users,
  UserCog,
} from "lucide-react";
import Link from "next/link";

import type { AppContext } from "@/lib/app-context";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Kader", href: "/kader", icon: Users },
  { label: "Mitglieder", href: "/mitglieder", icon: UserCog },
  { label: "Kalender", href: "/kalender", icon: CalendarDays },
  { label: "Saisons", href: "/saisons", icon: CalendarRange },
  { label: "Training", href: "/training", icon: Dumbbell },
  { label: "Spieltage", href: "/spiele", icon: Trophy },
  { label: "Statistiken", href: "/statistiken", icon: BarChart3 },
  { label: "Abwesenheiten", href: "/abwesenheiten", icon: ClipboardList },
  { label: "Einladungen", href: "/einladungen", icon: MailPlus },
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
  return (
    <main className="min-h-screen bg-background text-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col lg:flex-row">
        <aside className="border-b border-border bg-white px-4 py-4 lg:w-72 lg:border-b-0 lg:border-r lg:px-6 lg:py-6">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-lg bg-primary text-white">
              <Shield className="size-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-lg font-bold">VereinDigital</p>
              <p className="text-sm text-muted">{context.club.name}</p>
            </div>
          </div>

          <nav className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-1">
            {navItems.map((item) => {
              const active = activePath === item.href;

              return (
                <Link
                  className={`flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition ${
                    active
                      ? "bg-blue-50 text-primary"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                  }`}
                  href={item.href}
                  key={item.href}
                >
                  <item.icon className="size-4" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 hidden rounded-lg border border-border bg-slate-50 p-4 lg:block">
            <p className="text-xs font-semibold uppercase text-muted">Aktive Saison</p>
            <p className="mt-2 font-semibold">{context.activeSeason.name}</p>
            <div className="my-3 h-px bg-border" />
            <p className="text-xs font-semibold uppercase text-muted">Aktives Team</p>
            <p className="mt-2 font-semibold">{context.activeTeam?.name ?? "Kein Team"}</p>
            <p className="mt-1 text-sm text-muted">
              {context.isClubAdmin ? "Admin-Zugriff" : "Team-Zugriff"}
            </p>
          </div>
        </aside>

        <section className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</section>
      </div>
    </main>
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
