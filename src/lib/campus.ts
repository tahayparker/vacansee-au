import { z } from "zod";
import { DEFAULT_CAMPUS, UOW_CAMPUSES, type UowCampus } from "@/constants";

export const CampusSchema = z.enum(UOW_CAMPUSES);

export type Campus = z.infer<typeof CampusSchema>;

export const ALL_CAMPUSES: readonly UowCampus[] = UOW_CAMPUSES;

/** Parse and validate a campus value; falls back to the default. */
export function parseCampus(value: unknown): Campus {
  const result = CampusSchema.safeParse(value);
  return result.success ? result.data : DEFAULT_CAMPUS;
}

/** Parse a campus list from the API body; defaults to all campuses. */
export function parseCampuses(value: unknown): Campus[] {
  if (Array.isArray(value) && value.length > 0) {
    const valid = value
      .map((item) => CampusSchema.safeParse(item))
      .filter((result) => result.success)
      .map((result) => result.data);
    if (valid.length > 0) {
      return [...new Set(valid)];
    }
  }
  return [...ALL_CAMPUSES];
}

export function isAllCampusesSelected(campuses: readonly Campus[]): boolean {
  return campuses.length === ALL_CAMPUSES.length;
}

/** Zod schema for optional single campus (legacy / profile). */
export const CampusRequestSchema = z.object({
  campus: CampusSchema.optional(),
});

/** Zod schema for multi-campus availability requests. */
export const CampusesRequestSchema = z.object({
  campuses: z.array(CampusSchema).min(1).optional(),
});

export function formatCampusSelectionLabel(
  campuses: readonly Campus[],
): string {
  if (campuses.length === 0) return "Select campus";
  if (isAllCampusesSelected(campuses)) return "All";
  if (campuses.length === 1) return campuses[0];
  return `${campuses.length} campuses`;
}
