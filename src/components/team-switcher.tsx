"use client";

import { usePathname } from "next/navigation";

import { setActiveTeam } from "@/lib/actions";

export function TeamSwitcher({
  teams,
  activeTeamId,
}: {
  teams: { id: string; name: string }[];
  activeTeamId: string;
}) {
  const pathname = usePathname();

  return (
    <form action={setActiveTeam}>
      <input name="redirectTo" type="hidden" value={pathname} />
      <select
        aria-label="Aktives Team wechseln"
        className="mt-2 h-10 w-full rounded-lg border border-border bg-white px-2 text-sm font-semibold"
        defaultValue={activeTeamId}
        name="teamId"
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      >
        {teams.map((team) => (
          <option key={team.id} value={team.id}>
            {team.name}
          </option>
        ))}
      </select>
    </form>
  );
}
