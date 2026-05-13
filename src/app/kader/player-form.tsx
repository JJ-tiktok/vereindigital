import { createPlayerProfile, updatePlayerProfile } from "@/lib/actions";
import { toDateTimeLocalValue } from "@/lib/format";

const positions = ["TW", "IV", "AV", "DM", "ZM", "OM", "FL", "ST"];

export function PlayerForm({
  player,
  embedded = false,
}: {
  player?: {
    id: string;
    firstName: string;
    lastName: string;
    birthDate: Date;
    position: string;
    jerseyNumber: number | null;
  };
  embedded?: boolean;
}) {
  return (
    <form
      action={player ? updatePlayerProfile : createPlayerProfile}
      className={embedded ? "" : "max-w-2xl rounded-lg border border-border bg-white p-6"}
    >
      {player ? <input name="playerId" type="hidden" value={player.id} /> : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Vorname" name="firstName" defaultValue={player?.firstName} />
        <Field label="Nachname" name="lastName" defaultValue={player?.lastName} />
        <div>
          <label className="text-sm font-semibold text-slate-800" htmlFor="jerseyNumber">
            Rueckennummer
          </label>
          <input
            className="mt-2 h-11 w-full rounded-lg border border-border px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-blue-100"
            defaultValue={player?.jerseyNumber ?? ""}
            id="jerseyNumber"
            min={1}
            name="jerseyNumber"
            type="number"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-800" htmlFor="birthDate">
            Geburtsdatum
          </label>
          <input
            className="mt-2 h-11 w-full rounded-lg border border-border px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-blue-100"
            defaultValue={player ? toDateTimeLocalValue(player.birthDate).slice(0, 10) : undefined}
            id="birthDate"
            name="birthDate"
            required
            type="date"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-800" htmlFor="position">
            Position
          </label>
          <select
            className="mt-2 h-11 w-full rounded-lg border border-border px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-blue-100"
            defaultValue={player?.position ?? "ST"}
            id="position"
            name="position"
          >
            {positions.map((position) => (
              <option key={position} value={position}>
                {position}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button className="mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primary-strong" type="submit">
        {player ? "Spieler speichern" : "Spieler anlegen"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue?: string;
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-slate-800" htmlFor={name}>
        {label}
      </label>
      <input
        className="mt-2 h-11 w-full rounded-lg border border-border px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-blue-100"
        defaultValue={defaultValue}
        id={name}
        name={name}
        required
      />
    </div>
  );
}
