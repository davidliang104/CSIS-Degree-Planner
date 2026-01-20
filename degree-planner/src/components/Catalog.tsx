import type React from "react";
import type { Course } from "../types/planner";
import DraggableCatalogCourse from "../dnd/DraggableCatalogCourse";
import type { ProgramKey } from "../data/presets";

type Props = {
  program: ProgramKey;
  setProgram: (p: ProgramKey) => void;
  programLabel: string;
  onOpenEditor: () => void;

  query: string;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
  filteredCatalog: Course[];

  openGroups: Record<Course["category"], boolean>;
  setOpenGroups: React.Dispatch<
    React.SetStateAction<Record<Course["category"], boolean>>
  >;

  placedCourseIds: Set<string>;
  coursesById: Map<string, Course>;
  addCourseToSelected: (courseId: string) => void;

  categoryClass: (cat: Course["category"]) => string;
  categoryForCourseId: (courseId: string) => Course["category"];
};

function categoryLabel(cat: Course["category"]) {
  return cat === "GenEd"
    ? "Gen Ed."
    : cat === "Core"
      ? "Core Courses"
      : cat === "Elective"
        ? "Electives"
        : "Others";
}

function idToCode(id: string, coursesById: Map<string, Course>) {
  return coursesById.get(id)?.code ?? id;
}

function formatReqs(
  andIds: string[] | undefined,
  anyGroups: string[][] | undefined,
  coursesById: Map<string, Course>,
) {
  const parts: string[] = [];

  if (andIds && andIds.length > 0) {
    parts.push(andIds.map((id) => idToCode(id, coursesById)).join(", "));
  }

  if (anyGroups && anyGroups.length > 0) {
    parts.push(
      ...anyGroups.map(
        (g) => `(${g.map((id) => idToCode(id, coursesById)).join(" or ")})`,
      ),
    );
  }

  // AND between the AND-list and each OR-group
  return parts.join(" and ");
}


export default function Catalog({
  program,
  setProgram,
  onOpenEditor,
  query,
  setQuery,
  filteredCatalog,
  openGroups,
  setOpenGroups,
  placedCourseIds,
  coursesById,
  addCourseToSelected,
  categoryClass,
  categoryForCourseId,
}: Props) {
  return (
    <aside className="panel sidebar">
      <div className="panelTitle catalogHeaderRow">
        <div className="catalogTitle">Course Catalog</div>

        <div className="catalogHeaderControls">
          <select
            className="programSelect"
            value={program}
            onChange={(e) => setProgram(e.target.value as ProgramKey)}
            title="Choose program preset"
          >
            <option value="cs">CS</option>
            <option value="is">IS</option>
          </select>

          <button
            className="iconBtn"
            type="button"
            title="Edit courses"
            onClick={onOpenEditor}
          >
            <svg
              className="iconSvg"
              viewBox="0 0 24 24"
              width="18"
              height="18"
              aria-hidden="true"
            >
              <path
                fill="currentColor"
                d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.83H5v-.92l8.06-8.06.92.92L5.92 20.08zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z"
              />
            </svg>
          </button>
        </div>
      </div>

      <input
        className="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search (e.g., CS 120, calculus)…"
      />

      <div className="catalogScroll">
        {(["GenEd", "Core", "Elective", "Other"] as const).map((cat) => {
          const group = filteredCatalog.filter((c) => categoryForCourseId(c.id) === cat);
          if (group.length === 0) return null;

          const isOpen = openGroups[cat];
          const label = categoryLabel(cat);

          return (
            <div key={cat} className="groupBox">
              <button
                className={`groupHeader ${isOpen ? "isOpen" : "isClosed"}`}
                onClick={() => setOpenGroups((p) => ({ ...p, [cat]: !p[cat] }))}
                type="button"
              >
                <span className="groupTitle">{label}</span>
                <span className="groupMeta">{group.length}</span>
                <span className="chev">{isOpen ? "▾" : "▸"}</span>
              </button>

              {isOpen && (
                <div className="list">
                  {group.map((c) => {
                    const catForThisCourse = categoryForCourseId(c.id);
                    const disabled = placedCourseIds.has(c.id);
                    const prereqText = formatReqs(c.prereqIds, c.prereqAnyIds, coursesById);
                    const coreqText = formatReqs(c.coreqIds, c.coreqAnyIds, coursesById);

                    return (
                      <DraggableCatalogCourse
                        key={c.id}
                        courseId={c.id}
                        disabled={disabled}
                      >
                        <button
                          className={`courseCard ${disabled ? "disabled" : ""}`}
                          onClick={() => addCourseToSelected(c.id)}
                          disabled={disabled}
                          title={
                            disabled
                              ? "Already placed in the plan"
                              : "Click to add (or drag it)"
                          }
                          type="button"
                        >
                          <div className="courseTop">
                            <div className="courseCode">{c.code}</div>
                            <span className={categoryClass(catForThisCourse)}>{label}</span>
                          </div>

                          <div className="courseTitle">{c.title}</div>

                          {c.offered && c.offered.length > 0 && (
                            <div className="courseOffered">
                              Offered:{" "}
                              {c.offered.map((s, i) => (
                                <span key={s}>
                                  <span
                                    className={`seasonText season-${s.toLowerCase()}`}
                                  >
                                    {s}
                                  </span>
                                  {i < c.offered!.length - 1 && ", "}
                                </span>
                              ))}
                            </div>
                          )}

                          {prereqText && (
                            <div className="coursePrereq">
                              Prerequisite: <b>{prereqText}</b>
                            </div>
                          )}

                          {coreqText && (
                            <div className="courseCoreq">
                              Corequisite: <b>{coreqText}</b>
                            </div>
                          )}

                          {c.note && <div className="courseNote">{c.note}</div>}

                          <div className="courseMeta">{c.credits} credits</div>
                        </button>
                      </DraggableCatalogCourse>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="hint">
        Click a course to add it to the highlighted term,
        <br />
        or drag and drop it anywhere in your plan!
      </div>
    </aside>
  );
}
