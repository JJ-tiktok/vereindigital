import type { AvailabilityType } from "@prisma/client";
import { z } from "zod";

export type ActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
} | null;

export function formDataToObject(formData: FormData) {
  const result: Record<string, string> = {};

  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") {
      result[key] = value.trim();
    }
  }

  return result;
}

export function parseForm<TSchema extends z.ZodType>(
  formData: FormData,
  schema: TSchema,
): { success: true; data: z.output<TSchema> } | { success: false; state: NonNullable<ActionState> } {
  const parsed = schema.safeParse(formDataToObject(formData));

  if (parsed.success) {
    return { success: true, data: parsed.data };
  }

  const flattened = z.flattenError(parsed.error as z.ZodError<Record<string, unknown>>);

  return {
    success: false,
    state: {
      error: "Bitte pruefe die markierten Felder.",
      fieldErrors: flattened.fieldErrors as Record<string, string[]>,
    },
  };
}

export const zRequiredString = z.string({ error: "Pflichtfeld" }).trim().min(1, "Pflichtfeld");

export const zOptionalString = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : null));

export const zDate = zRequiredString.transform((value, ctx) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    ctx.addIssue({ code: "custom", message: "Ungueltiges Datum" });
    return z.NEVER;
  }

  return date;
});

export const zOptionalDate = z
  .string()
  .trim()
  .optional()
  .transform((value) => {
    if (!value) {
      return null;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  });

export const zOptionalInt = z
  .string()
  .trim()
  .optional()
  .transform((value) => {
    if (!value) {
      return null;
    }

    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  });

export function zIntWithFallback(fallback: number) {
  return z
    .string()
    .trim()
    .optional()
    .transform((value) => {
      if (!value) {
        return fallback;
      }

      const parsed = Number.parseInt(value, 10);
      return Number.isNaN(parsed) ? fallback : parsed;
    });
}

export function availabilityReason(type: AvailabilityType) {
  switch (type) {
    case "VACATION":
      return "Urlaub";
    case "INJURY":
      return "Verletzung";
    case "ILLNESS":
      return "Krankheit";
    default:
      return "Abwesenheit";
  }
}

export const zOptionalFloat = z
  .string()
  .trim()
  .optional()
  .transform((value) => {
    if (!value) {
      return null;
    }

    const parsed = Number.parseFloat(value.replace(",", "."));
    return Number.isNaN(parsed) ? null : parsed;
  });
