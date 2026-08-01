"use client";

import { ChevronDown, ChevronsLeft, ChevronsRight, ChevronUp, Settings, Shield } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";

import { ThemeToggle } from "@/components/theme-toggle";

export type SidebarNavEntry = {
  href: string;
  label: string;
  icon: ReactNode;
  active: boolean;
  children?: SidebarNavEntry[];
};

export function Sidebar({
  clubName,
  primaryEntries,
  managementEntries,
  clubSwitcherSlot,
  seasonTeamSlot,
  initialCollapsed,
}: {
  clubName: string;
  primaryEntries: SidebarNavEntry[];
  managementEntries: SidebarNavEntry[];
  clubSwitcherSlot: ReactNode | null;
  seasonTeamSlot: ReactNode | null;
  initialCollapsed: boolean;
}) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [managementOpen, setManagementOpen] = useState(() => managementEntries.some((entry) => entry.active));
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    () => new Set(primaryEntries.filter((entry) => entry.children?.some((child) => child.active)).map((entry) => entry.href)),
  );

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `sidebar-collapsed=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
  }

  function toggleGroup(href: string) {
    setOpenGroups((current) => {
      const next = new Set(current);
      if (next.has(href)) {
        next.delete(href);
      } else {
        next.add(href);
      }
      return next;
    });
  }

  function renderNavEntry(item: SidebarNavEntry) {
    if (item.children && item.children.length > 0) {
      const isOpen = openGroups.has(item.href);
      const groupActive = item.active || item.children.some((child) => child.active);

      return (
        <div key={item.href}>
          <button
            className={`flex h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium transition ${
              groupActive ? "bg-primary-soft text-primary" : "text-muted hover:bg-surface-muted hover:text-foreground"
            } ${collapsed ? "lg:justify-center lg:px-0" : ""}`}
            onClick={() => toggleGroup(item.href)}
            title={collapsed ? item.label : undefined}
            type="button"
          >
            {item.icon}
            {collapsed ? (
              <span className="lg:hidden">{item.label}</span>
            ) : (
              <>
                <span className="flex-1 text-left">{item.label}</span>
                {isOpen ? <ChevronUp className="size-4 shrink-0" aria-hidden="true" /> : <ChevronDown className="size-4 shrink-0" aria-hidden="true" />}
              </>
            )}
          </button>
          {isOpen ? (
            <div className={`mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-1 ${collapsed ? "" : "lg:pl-4"}`}>
              {item.children.map(renderNavEntry)}
            </div>
          ) : null}
        </div>
      );
    }

    return (
      <Link
        className={`flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition ${
          item.active ? "bg-primary-soft text-primary" : "text-muted hover:bg-surface-muted hover:text-foreground"
        } ${collapsed ? "lg:justify-center lg:px-0" : ""}`}
        href={item.href}
        key={item.href}
        title={collapsed ? item.label : undefined}
      >
        {item.icon}
        {collapsed ? <span className="lg:hidden">{item.label}</span> : <span>{item.label}</span>}
      </Link>
    );
  }

  return (
    <aside
      className={`border-b border-border bg-surface px-4 py-4 lg:border-b-0 lg:border-r lg:py-6 ${
        collapsed ? "lg:w-20 lg:px-3" : "lg:w-72 lg:px-6"
      }`}
    >
      <div className={collapsed ? "flex flex-col items-center gap-2" : "flex items-center gap-3"}>
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary text-white">
          <Shield className="size-5" aria-hidden="true" />
        </div>
        {collapsed ? null : (
          <div className="min-w-0">
            <p className="truncate text-lg font-bold">VereinDigital</p>
            <p className="truncate text-sm text-muted">{clubName}</p>
          </div>
        )}
        <button
          className={`hidden size-8 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-surface-muted hover:text-foreground lg:inline-flex ${
            collapsed ? "" : "ml-auto"
          }`}
          onClick={toggle}
          title={collapsed ? "Menue ausklappen" : "Menue einklappen"}
          type="button"
        >
          {collapsed ? <ChevronsRight className="size-4" aria-hidden="true" /> : <ChevronsLeft className="size-4" aria-hidden="true" />}
        </button>
      </div>

      {!collapsed && clubSwitcherSlot ? <div className="mt-4">{clubSwitcherSlot}</div> : null}

      <nav className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-1">
        {primaryEntries.map(renderNavEntry)}
      </nav>

      {managementEntries.length > 0 ? (
        <div className="mt-2">
          <button
            className={`flex h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted transition hover:bg-surface-muted hover:text-foreground ${
              collapsed ? "lg:justify-center lg:px-0" : ""
            }`}
            onClick={() => setManagementOpen((open) => !open)}
            title={collapsed ? "Verwaltung" : undefined}
            type="button"
          >
            <Settings className="size-4 shrink-0" aria-hidden="true" />
            {collapsed ? (
              <span className="lg:hidden">Verwaltung</span>
            ) : (
              <>
                <span className="flex-1 text-left">Verwaltung</span>
                {managementOpen ? (
                  <ChevronUp className="size-4 shrink-0" aria-hidden="true" />
                ) : (
                  <ChevronDown className="size-4 shrink-0" aria-hidden="true" />
                )}
              </>
            )}
          </button>

          {managementOpen ? (
            <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-1">
              {managementEntries.map(renderNavEntry)}
            </div>
          ) : null}
        </div>
      ) : null}

      {!collapsed && seasonTeamSlot ? (
        <div className="mt-6 hidden rounded-lg border border-border bg-surface-muted p-4 lg:block">{seasonTeamSlot}</div>
      ) : null}

      <div className="mt-6 border-t border-border pt-3">
        <ThemeToggle collapsed={collapsed} />
      </div>
    </aside>
  );
}
