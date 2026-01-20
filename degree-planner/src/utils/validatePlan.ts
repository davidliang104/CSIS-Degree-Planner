import type { Course, Term } from "../types/planner";
import { termKey } from "./terms";

export type PlanIssueKind =
  | "notOffered"
  | "missingPrereq"
  | "missingPrereqAny"
  | "missingCoreq"
  | "missingCoreqAny";

export type PlanIssue = {
  termK: string;
  termIndex: number;
  courseId: string;
  kind: PlanIssueKind;
  message: string;
  missingIds?: string[];
};

function groupsSatisfied(groups: string[][] | undefined, taken: Set<string>) {
  return (groups ?? []).every((group) => group.some((id) => taken.has(id)));
}

export function validatePlan(terms: Term[], coursesById: Map<string, Course>) {
  const issues: PlanIssue[] = [];
  const uniq = (xs: string[]) => Array.from(new Set(xs));

  for (let termIndex = 0; termIndex < terms.length; termIndex++) {
    const term = terms[termIndex];
    const k = termKey(term);

    // courses strictly before this term
    const takenBefore = new Set<string>();
    for (let i = 0; i < termIndex; i++) {
      for (const id of terms[i].courseIds) takenBefore.add(id);
    }

    // courses by end of this term (before + same term)
    const takenByEnd = new Set<string>(takenBefore);
    for (const id of term.courseIds) takenByEnd.add(id);

    for (const courseId of term.courseIds) {
      const course = coursesById.get(courseId);
      if (!course) continue;

      // Offered?
      const offered = course.offered;
      const offeredOk =
        !offered || offered.length === 0 || offered.includes(term.season);

      if (!offeredOk) {
        issues.push({
          termK: k,
          termIndex,
          courseId,
          kind: "notOffered",
          message: `Not offered in ${term.season}.`,
        });
      }

      // Prereqs: MUST be before
      const prereqIds = course.prereqIds ?? [];
      const missingPrereq = prereqIds.filter((id) => !takenBefore.has(id));
      if (missingPrereq.length) {
        issues.push({
          termK: k,
          termIndex,
          courseId,
          kind: "missingPrereq",
          missingIds: missingPrereq,
          message: `Missing prerequisites.`,
        });
      }

      const prereqAny = course.prereqAnyIds ?? [];
      const prereqAnyOk = groupsSatisfied(prereqAny, takenBefore);
      if (!prereqAnyOk && prereqAny.length) {
        // find which groups are unsatisfied (for nicer messages)
        const missingGroups = prereqAny.filter(
          (group) => !group.some((id) => takenBefore.has(id)),
        );
        issues.push({
          termK: k,
          termIndex,
          courseId,
          kind: "missingPrereqAny",
          missingIds: uniq(missingGroups.flat()),
          message: `Missing prerequisite (choose one of the allowed options).`,
        });
      }

      // Coreqs: can be before OR same term
      const coreqIds = course.coreqIds ?? [];
      const missingCoreq = coreqIds.filter((id) => !takenByEnd.has(id));
      if (missingCoreq.length) {
        issues.push({
          termK: k,
          termIndex,
          courseId,
          kind: "missingCoreq",
          missingIds: missingCoreq,
          message: `Missing corequisites (same term or earlier).`,
        });
      }

      const coreqAny = course.coreqAnyIds ?? [];
      const coreqAnyOk = groupsSatisfied(coreqAny, takenByEnd);
      if (!coreqAnyOk && coreqAny.length) {
        const missingGroups = coreqAny.filter(
          (group) => !group.some((id) => takenByEnd.has(id)),
        );
        issues.push({
          termK: k,
          termIndex,
          courseId,
          kind: "missingCoreqAny",
          missingIds: uniq(missingGroups.flat()),
          message: `Missing corequisite option (same term or earlier).`,
        });
      }
    }
  }

  return {
    issues,
    hasIssues: issues.length > 0,
    count: issues.length,
  };
}
