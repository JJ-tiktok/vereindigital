import {
  BarChart3,
  Binoculars,
  CalendarDays,
  CalendarRange,
  ChevronRight,
  ClipboardList,
  MailPlus,
  Dumbbell,
  FileUp,
  LayoutDashboard,
  LayoutGrid,
  MessageSquare,
  ShieldCheck,
  Trophy,
  Users,
  UserCog,
} from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";

import { ClubSwitcher } from "@/components/club-switcher";
import { FeedbackWidget } from "@/components/feedback-widget";
import { Sidebar, type SidebarNavEntry } from "@/components/sidebar";
import { TeamSwitcher } from "@/components/team-switcher";
import { hasPermission, type AppContext } from "@/lib/app-context";
import { canUseFeedback } from "@/lib/feedback-permissions";

const primaryNavItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Kader", href: "/kader", icon: Users },
  { label: "Kalender", href: "/kalender", icon: CalendarDays },
  { label: "Training", href: "/training", icon: Dumbbell },
  { label: "Taktik", href: "/taktik", icon: LayoutGrid },
  { label: "Spieltage", href: "/spiele", icon: Trophy },
  { label: "Scouting", href: "/scouting", icon: Binoculars },
];

const managementNavItems = [
  { label: "Mitglieder", href: "/mitglieder", icon: UserCog },
  { label: "Saisons", href: "/saisons", icon: CalendarRange },
  { label: "Rollen", href: "/rollen", icon: ShieldCheck },
  { label: "Statistiken", href: "/statistiken", icon: BarChart3 },
  { label: "Importe", href: "/importe", icon: FileUp },
  { label: "Abwesenheiten", href: "/abwesenheiten", icon: ClipboardList },
  { label: "Einladungen", href: "/einladungen", icon: MailPlus },
  { label: "Feedback", href: "/feedback", icon: MessageSquare },
];

export async function AppShell({
  context,
  activePath,
  children,
}: {
  context: AppContext;
  activePath: string;
  children: React.ReactNode;
}) {
  const showFeedback = canUseFeedback(context);
  const showRoles = hasPermission(context, "roles.manage");
  const visibleManagementItems = managementNavItems.filter((item) => {
    if (item.href === "/feedback") {
      return showFeedback;
    }

    if (item.href === "/rollen") {
      return showRoles;
    }

    return true;
  });
  const toEntry = (item: (typeof primaryNavItems)[number]): SidebarNavEntry => ({
    href: item.href,
    label: item.label,
    icon: <item.icon className="size-4 shrink-0" aria-hidden="true" />,
    active: activePath === item.href,
  });
  const primaryEntries: SidebarNavEntry[] = primaryNavItems.map(toEntry);
  const managementEntries: SidebarNavEntry[] = visibleManagementItems.map(toEntry);

  const cookieStore = await cookies();
  const initialCollapsed = cookieStore.get("sidebar-collapsed")?.value === "1";

  const clubSwitcherSlot =
    context.clubs.length > 1 ? (
      <div>
        <p className="text-xs font-semibold uppercase text-muted">Aktiver Verein</p>
        <ClubSwitcher
          activeClubId={context.club.id}
          clubs={context.clubs.map((club) => ({ id: club.id, name: club.name }))}
        />
      </div>
    ) : null;

  const seasonTeamSlot = (
    <>
      <p className="text-xs font-semibold uppercase text-muted">Aktive Saison</p>
      <p className="mt-2 font-semibold">{context.activeSeason?.name ?? "Keine Saison"}</p>
      <div className="my-3 h-px bg-border" />
      <p className="text-xs font-semibold uppercase text-muted">Aktives Team</p>
      {context.teams.length > 1 && context.activeTeam ? (
        <TeamSwitcher
          activeTeamId={context.activeTeam.id}
          teams={context.teams.map((team) => ({ id: team.id, name: team.name }))}
        />
      ) : (
        <p className="mt-2 font-semibold">{context.activeTeam?.name ?? "Kein Team"}</p>
      )}
      <p className="mt-1 text-sm text-muted">{context.isClubAdmin ? "Admin-Zugriff" : "Team-Zugriff"}</p>
    </>
  );

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[1680px] flex-col lg:flex-row">
        <Sidebar
          clubName={context.club.name}
          clubSwitcherSlot={clubSwitcherSlot}
          initialCollapsed={initialCollapsed}
          managementEntries={managementEntries}
          primaryEntries={primaryEntries}
          seasonTeamSlot={seasonTeamSlot}
        />

        <section className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
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

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-3 flex flex-wrap items-center gap-1.5 text-sm text-muted">
      {items.map((item, index) => (
        <span className="flex items-center gap-1.5" key={`${item.label}-${index}`}>
          {index > 0 ? <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" /> : null}
          {item.href ? (
            <Link className="transition hover:text-foreground hover:underline" href={item.href}>
              {item.label}
            </Link>
          ) : (
            <span className="font-semibold text-foreground">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
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
        <h1 className="mt-2 text-3xl font-bold tracking-normal text-foreground sm:text-4xl">{title}</h1>
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
    <div className="rounded-lg border border-dashed border-border bg-surface p-8 text-center">
      <p className="text-lg font-semibold text-foreground">{title}</p>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
