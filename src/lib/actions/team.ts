"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ACTIVE_TEAM_COOKIE, requireAppContext } from "@/lib/app-context";

export async function setActiveTeam(formData: FormData) {
  const context = await requireAppContext();
  const teamId = String(formData.get("teamId") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/dashboard");
  const target = redirectTo.startsWith("/") ? redirectTo : "/dashboard";

  if (!context.teams.some((team) => team.id === teamId)) {
    redirect(target);
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_TEAM_COOKIE, teamId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });

  revalidatePath("/", "layout");
  redirect(target);
}
