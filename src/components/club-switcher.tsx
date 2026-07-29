"use client";

import { usePathname } from "next/navigation";

import { setActiveClub } from "@/lib/actions";

export function ClubSwitcher({
  clubs,
  activeClubId,
}: {
  clubs: { id: string; name: string }[];
  activeClubId: string;
}) {
  const pathname = usePathname();

  return (
    <form action={setActiveClub}>
      <input name="redirectTo" type="hidden" value={pathname} />
      <select
        aria-label="Aktiven Verein wechseln"
        className="mt-2 h-10 w-full rounded-lg border border-border bg-surface px-2 text-sm font-semibold"
        defaultValue={activeClubId}
        name="clubId"
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      >
        {clubs.map((club) => (
          <option key={club.id} value={club.id}>
            {club.name}
          </option>
        ))}
      </select>
    </form>
  );
}
