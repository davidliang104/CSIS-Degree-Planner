import type { Season, Term } from "../types/planner";
import { buildTerms, termKey } from "./terms";

/** Add a course to a specific term key (no duplicate checking here). */
export function addCourseToTerm(terms: Term[], termK: string, courseId: string): Term[] {
  return terms.map((t) =>
    termKey(t) === termK ? { ...t, courseIds: [...t.courseIds, courseId] } : t
  );
}

/** Remove a course from a specific term key. */
export function removeCourseFromTerm(terms: Term[], termK: string, courseId: string): Term[] {
  return terms.map((t) =>
    termKey(t) === termK
      ? { ...t, courseIds: t.courseIds.filter((id) => id !== courseId) }
      : t
  );
}

/**
 * Rebuilds the academic timeline but preserves any already-placed courses
 * for matching term keys.
 */
export function regenerateTimeline(
  prevTerms: Term[],
  nextStartAY: number,
  nextStartSeason: Season,
  nextYears: number
): Term[] {
  const prevMap = new Map(prevTerms.map((t) => [termKey(t), t.courseIds] as const));

  return buildTerms(nextStartAY, nextStartSeason, nextYears).map((t) => ({
    ...t,
    courseIds: prevMap.get(termKey(t)) ?? [],
  }));
}
