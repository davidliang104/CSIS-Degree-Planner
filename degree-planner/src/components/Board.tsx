import type { Course, Term, Season } from "../types/planner";
import { academicYearLabel, termKey } from "../utils/terms";
import TermTileDropZone from "../dnd/TermTileDropZone";
import SortablePlacedCourse from "../dnd/SortablePlacedCourse";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import WarningsMenu from "./WarningsMenu";

type Props = {
  terms: Term[];
  coursesById: Map<string, Course>;

  startAcademicYear: number;
  setStartAcademicYear: (v: number) => void;

  startSeason: Season;
  setStartSeason: (v: Season) => void;

  academicYears: number;
  setAcademicYears: (v: number) => void;

  defaultStartAY: number;

  regenerateTerms: (
    ayStart: number,
    startSeason: Season,
    years: number,
  ) => void;

  selectedTermKey: string | null;
  setSelectedTermKey: (k: string) => void;

  removeCourse: (termK: string, courseId: string) => void;

  selectedCredits: number;
  totalCredits: number;

  activeCourseId: string | null; // keep if you still want it in props; otherwise remove
  overTermK: string | null;
};

export default function Board({
  terms,
  coursesById,

  startAcademicYear,
  setStartAcademicYear,

  startSeason,
  setStartSeason,

  academicYears,
  setAcademicYears,

  defaultStartAY,

  regenerateTerms,

  selectedTermKey,
  setSelectedTermKey,

  removeCourse,

  selectedCredits,
  totalCredits,

  activeCourseId,
  overTermK,
}: Props) {
  return (
    <main className="panel board">
      <div className="panelTitleRow">
        <div className="panelHeaderTop">
          <div
            className="panelTitle"
            style={{
              padding: 0,
              borderBottom: "none",
              background: "transparent",
            }}
          >
            Plan Board
          </div>

          <div className="mini">
            Selected: <b>{selectedCredits}</b> • Total planned:{" "}
            <b>{totalCredits}</b>
          </div>
        </div>

        <div className="controlsRow">
          <label className="ctl">
            <span>Start Academic Year</span>
            <select
              value={startAcademicYear}
              onChange={(e) => {
                const v = Number(e.target.value);
                setStartAcademicYear(v);
                regenerateTerms(v, startSeason, academicYears);
              }}
            >
              {Array.from({ length: 12 }, (_, i) => defaultStartAY - 4 + i).map(
                (y) => (
                  <option key={y} value={y}>
                    {academicYearLabel(y)}
                  </option>
                ),
              )}
            </select>
          </label>

          <label className="ctl">
            <span>Start Term</span>
            <select
              value={startSeason}
              onChange={(e) => {
                const v = e.target.value as Season;
                setStartSeason(v);
                regenerateTerms(startAcademicYear, v, academicYears);
              }}
            >
              <option value="Fall">Fall</option>
              <option value="Spring">Spring</option>
              <option value="Summer">Summer</option>
            </select>
          </label>

          <div className="ctlButtons">
            <button
              className="smallBtn"
              onClick={() => {
                const next = academicYears + 1;
                setAcademicYears(next);
                regenerateTerms(startAcademicYear, startSeason, next);
              }}
              type="button"
            >
              + Add Academic Year
            </button>

            <button
              className="smallBtn"
              onClick={() => {
                const next = Math.max(1, academicYears - 1);
                setAcademicYears(next);
                regenerateTerms(startAcademicYear, startSeason, next);
              }}
              type="button"
            >
              − Remove Last
            </button>
          </div>
          <div className="controlsSpacer" aria-hidden />
          <div className="warningsWrap">
            <WarningsMenu terms={terms} coursesById={coursesById} />
          </div>
        </div>
      </div>

      <div className="boardContent">
        {Object.entries(
          terms.reduce<Record<number, Term[]>>((acc, t) => {
            acc[t.academicYearStart] ??= [];
            acc[t.academicYearStart].push(t);
            return acc;
          }, {}),
        ).map(([ayStart, yearTerms]) => (
          <div key={ayStart} className="yearBlock">
            <div className="yearHeader">
              {academicYearLabel(Number(ayStart))}
            </div>

            <div className="termRow">
              {yearTerms.map((t) => {
                const k = termKey(t);
                const isSelected = k === selectedTermKey;

                const credits = t.courseIds.reduce(
                  (sum, id) => sum + (coursesById.get(id)?.credits ?? 0),
                  0,
                );

                return (
                  <TermTileDropZone
                    key={k}
                    termK={k}
                    isInvalid={false} // explicitly not blocking
                    className={`termTile season-${t.season.toLowerCase()} ${
                      isSelected ? "selected" : ""
                    }`}
                    onClick={() => setSelectedTermKey(k)}
                  >
                    {({ isOver }) => {
                      const isOverThisTerm = isOver || overTermK === k;
                      return (
                        <>
                          <div className="termHeader">
                            <div>
                              <div className="termName">
                                {t.season} {t.calendarYear}
                              </div>
                              <div className="termSub">{credits} credits</div>
                            </div>
                          </div>

                          <SortableContext
                            items={t.courseIds}
                            strategy={verticalListSortingStrategy}
                          >
                            <div className={`termBody ${isOverThisTerm ? "dropOver" : ""}`}>
                              {t.courseIds.length === 0 ? (
                                <div className="empty">Drag a course here</div>
                              ) : (
                                t.courseIds.map((id) => {
                                  const c = coursesById.get(id);
                                  if (!c) return null;

                                  return (
                                    <SortablePlacedCourse
                                      key={id}
                                      courseId={id}
                                      termK={k}
                                      left={
                                        <div className="placedLeft">
                                          <div className="placedCode">
                                            {c.code}
                                          </div>
                                          <div className="placedTitle">
                                            {c.title}
                                          </div>
                                        </div>
                                      }
                                      right={
                                        <button
                                          className="x"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            removeCourse(k, id);
                                          }}
                                          type="button"
                                        >
                                          ✕
                                        </button>
                                      }
                                    />
                                  );
                                })
                              )}
                            </div>
                          </SortableContext>
                        </>
                      );
                    }}
                  </TermTileDropZone>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
