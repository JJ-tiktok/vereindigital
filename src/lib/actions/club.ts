"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ACTIVE_CLUB_COOKIE, ACTIVE_TEAM_COOKIE, requireAppContext } from "@/lib/app-context";

export async function setActiveClub(formData: FormData) {
  const context = await requireAppContext();
  const clubId = String(formData.get("clubId") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/dashboard");
  const target = redirectTo.startsWith("/") ? redirectTo : "/dashboard";

  if (!context.clubs.some((club) => club.id === clubId)) {
    redirect(target);
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_CLUB_COOKIE, clubId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  // The previously active team belongs to the old club; clear it so the
  // new club resolves its own default team instead of an unrelated one.
  cookieStore.delete(ACTIVE_TEAM_COOKIE);

  revalidatePath("/", "layout");
  redirect(target);
}
