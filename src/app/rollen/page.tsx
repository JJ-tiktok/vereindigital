import { Lock, Trash2 } from "lucide-react";

import { CreateRoleForm } from "@/app/rollen/create-role-form";
import { AppShell, PageHeader } from "@/components/app-shell";
import { deleteRole, updateRolePermissions } from "@/lib/actions";
import { requireAppContext, requirePermission } from "@/lib/app-context";
import { prisma } from "@/lib/prisma";
import { permissionDefinitions } from "@/lib/rbac";

export default async function RolesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [context, params] = await Promise.all([requireAppContext(), searchParams]);
  requirePermission(context, "roles.manage");

  const roles = await prisma.role.findMany({
    where: {
      clubId: context.club.id,
    },
    include: {
      rolePermissions: {
        select: {
          permission: {
            select: {
              key: true,
            },
          },
        },
      },
      _count: {
        select: {
          clubMemberships: true,
          memberships: true,
          invitations: true,
        },
      },
    },
    orderBy: [{ isSystemRole: "desc" }, { name: "asc" }],
  });

  return (
    <AppShell context={context} activePath="/rollen">
      <PageHeader
        eyebrow="Vereinsstruktur"
        title="Rollen und Berechtigungen"
        description="Passe Berechtigungen der Standardrollen an oder erstelle eigene Rollen fuer euren Verein."
      />

      {params.error ? (
        <p className="mt-6 rounded-lg bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
          {errorMessage(params.error)}
        </p>
      ) : null}

      <section className="grid gap-6 py-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          {roles.map((role) => {
            const activePermissionKeys = new Set(role.rolePermissions.map((entry) => entry.permission.key));
            const inUse = role._count.clubMemberships + role._count.memberships + role._count.invitations > 0;

            return (
              <article className="rounded-lg border border-border bg-surface p-5" key={role.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-foreground">{role.name}</h2>
                    {role.isSystemRole ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold text-muted">
                        <Lock className="size-3" aria-hidden="true" />
                        Systemrolle
                      </span>
                    ) : null}
                  </div>

                  {!role.isSystemRole ? (
                    <form action={deleteRole}>
                      <input name="roleId" type="hidden" value={role.id} />
                      <button
                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-danger-soft px-3 text-sm font-semibold text-danger disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={inUse}
                        title={inUse ? "Rolle wird noch verwendet und kann nicht geloescht werden." : undefined}
                        type="submit"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                        Loeschen
                      </button>
                    </form>
                  ) : null}
                </div>

                <form action={updateRolePermissions} className="mt-4">
                  <input name="roleId" type="hidden" value={role.id} />
                  <div className="grid gap-2 sm:grid-cols-2">
                    {permissionDefinitions.map(([key, description]) => (
                      <label className="flex items-start gap-2 text-sm text-foreground" key={key}>
                        <input
                          className="mt-0.5 size-4 accent-primary"
                          defaultChecked={activePermissionKeys.has(key)}
                          name={`permission-${key}`}
                          type="checkbox"
                        />
                        <span>{description}</span>
                      </label>
                    ))}
                  </div>
                  <button
                    className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-strong"
                    type="submit"
                  >
                    Berechtigungen speichern
                  </button>
                </form>
              </article>
            );
          })}
        </div>

        <aside className="space-y-6">
          <CreateRoleForm />

          <article className="rounded-lg border border-border bg-surface p-5">
            <h2 className="text-xl font-bold text-foreground">Hinweise</h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              Systemrollen (Admin, Trainer, Co-Trainer, Spieler) koennen nicht geloescht werden, ihre Berechtigungen
              lassen sich aber wie bei eigenen Rollen anpassen. Achte darauf, dass mindestens eine Rolle die
              Berechtigung &quot;Rollen und Berechtigungen verwalten&quot; behaelt, sonst kann diese Seite nicht mehr
              erreicht werden.
            </p>
          </article>
        </aside>
      </section>
    </AppShell>
  );
}

function errorMessage(error: string) {
  switch (error) {
    case "system-role":
      return "Systemrollen koennen nicht geloescht werden.";
    case "role-in-use":
      return "Diese Rolle wird noch verwendet und kann nicht geloescht werden.";
    default:
      return "Bitte pruefe deine Eingaben.";
  }
}
