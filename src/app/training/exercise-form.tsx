import type { TrainingExercise } from "@prisma/client";

import { createTrainingExercise, updateTrainingExercise } from "@/lib/actions";
import {
  trainingCategoryLabel,
  trainingCategoryOptions,
  trainingIntensityLabel,
  trainingIntensityOptions,
  trainingPitchLabel,
  trainingPitchOptions,
  trainingVisibilityLabel,
  trainingVisibilityOptions,
} from "@/lib/training";

type TrainingExerciseFormValue = Pick<
  TrainingExercise,
  | "category"
  | "coachingPoints"
  | "description"
  | "durationMinutes"
  | "flow"
  | "id"
  | "intensity"
  | "material"
  | "maxPlayers"
  | "minPlayers"
  | "objective"
  | "organization"
  | "pitchType"
  | "title"
  | "variations"
  | "visibility"
>;

export function TrainingExerciseForm({ exercise }: { exercise?: TrainingExerciseFormValue }) {
  return (
    <form action={exercise ? updateTrainingExercise : createTrainingExercise} className="space-y-6">
      {exercise ? <input name="exerciseId" type="hidden" value={exercise.id} /> : null}

      <section className="rounded-lg border border-border bg-white p-5">
        <h2 className="text-xl font-semibold text-slate-950">Grunddaten</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field defaultValue={exercise?.title} label="Titel" name="title" required />
          <Field defaultValue={exercise?.objective ?? undefined} label="Ziel / Schwerpunkt" name="objective" />
          <Select label="Kategorie" name="category" value={exercise?.category ?? "TECHNIQUE"}>
            {trainingCategoryOptions.map((category) => (
              <option key={category} value={category}>
                {trainingCategoryLabel(category)}
              </option>
            ))}
          </Select>
          <Select label="Intensitaet" name="intensity" value={exercise?.intensity ?? ""}>
            <option value="">Offen</option>
            {trainingIntensityOptions.map((intensity) => (
              <option key={intensity} value={intensity}>
                {trainingIntensityLabel(intensity)}
              </option>
            ))}
          </Select>
          <Select label="Sichtbarkeit" name="visibility" value={exercise?.visibility ?? "TEAM"}>
            {trainingVisibilityOptions.map((visibility) => (
              <option key={visibility} value={visibility}>
                {trainingVisibilityLabel(visibility)}
              </option>
            ))}
          </Select>
          <Select label="Feldvorlage" name="pitchType" value={exercise?.pitchType ?? "FREE_AREA"}>
            {trainingPitchOptions.map((pitchType) => (
              <option key={pitchType} value={pitchType}>
                {trainingPitchLabel(pitchType)}
              </option>
            ))}
          </Select>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-white p-5">
        <h2 className="text-xl font-semibold text-slate-950">Rahmen</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <Field defaultValue={exercise?.durationMinutes?.toString()} label="Dauer" min={1} name="durationMinutes" type="number" />
          <Field defaultValue={exercise?.minPlayers?.toString()} label="Min. Spieler" min={1} name="minPlayers" type="number" />
          <Field defaultValue={exercise?.maxPlayers?.toString()} label="Max. Spieler" min={1} name="maxPlayers" type="number" />
          <Field defaultValue={exercise?.material ?? undefined} label="Material" name="material" />
        </div>
      </section>

      <section className="rounded-lg border border-border bg-white p-5">
        <h2 className="text-xl font-semibold text-slate-950">Beschreibung</h2>
        <div className="mt-5 grid gap-4">
          <Textarea defaultValue={exercise?.description ?? undefined} label="Kurzbeschreibung" name="description" />
          <Textarea defaultValue={exercise?.organization ?? undefined} label="Organisation / Aufbau" name="organization" />
          <Textarea defaultValue={exercise?.flow ?? undefined} label="Ablauf" name="flow" />
          <Textarea defaultValue={exercise?.coachingPoints ?? undefined} label="Coaching Points" name="coachingPoints" />
          <Textarea defaultValue={exercise?.variations ?? undefined} label="Variationen" name="variations" />
        </div>
      </section>

      <button className="h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-white" type="submit">
        {exercise ? "Uebung speichern" : "Uebung anlegen"}
      </button>
    </form>
  );
}

function Field({
  defaultValue,
  label,
  min,
  name,
  required,
  type = "text",
}: {
  defaultValue?: string;
  label: string;
  min?: number;
  name: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="text-sm font-semibold text-slate-800">
      {label}
      <input
        className="mt-2 h-11 w-full rounded-lg border border-border px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-blue-100"
        defaultValue={defaultValue}
        min={min}
        name={name}
        required={required}
        type={type}
      />
    </label>
  );
}

function Select({
  children,
  label,
  name,
  value,
}: {
  children: React.ReactNode;
  label: string;
  name: string;
  value: string;
}) {
  return (
    <label className="text-sm font-semibold text-slate-800">
      {label}
      <select
        className="mt-2 h-11 w-full rounded-lg border border-border px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-blue-100"
        defaultValue={value}
        name={name}
      >
        {children}
      </select>
    </label>
  );
}

function Textarea({ defaultValue, label, name }: { defaultValue?: string; label: string; name: string }) {
  return (
    <label className="text-sm font-semibold text-slate-800">
      {label}
      <textarea
        className="mt-2 min-h-24 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-blue-100"
        defaultValue={defaultValue}
        name={name}
      />
    </label>
  );
}
