import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

import type { Course, Term, Season } from "./types/planner";
import { COURSE_CATALOG } from "./data/catalog";
import { buildTerms, termKey } from "./utils/terms";
import { addCourseToTerm, regenerateTimeline } from "./utils/plan";
import { renderPrintableHTML } from "./utils/print";

import Catalog from "./components/Catalog";
import Board from "./components/Board";
import ToastHost from "./components/ToastHost";
import type { Toast, ToastKind } from "./components/ToastHost";
import CourseEditorModal from "./components/CourseEditorModal";

import {
   PROGRAM_LABEL,
   presetIds,
   categoryForCourseId,
   type ProgramKey,
 } from "./data/presets";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  pointerWithin,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type {
  DragEndEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";

/* ----------------------------- Pure helpers ----------------------------- */

function categoryClass(cat: Course["category"]) {
  switch (cat) {
    case "Core":
      return "pill pill-core";
    case "GenEd":
      return "pill pill-gened";
    case "Elective":
      return "pill pill-elective";
    case "Other":
      return "pill pill-other";
  }
}

function safeJSONParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/* ---------------------------------- App --------------------------------- */

export default function App() {
  /* ----------------------- Defaults / timeline start ---------------------- */

  const now = new Date();
  const defaultStartAY =
    now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;

  /* ---------------------------------- State ------------------------------ */

  const [query, setQuery] = useState("");

  const [startAcademicYear, setStartAcademicYear] =
    useState<number>(defaultStartAY);
  const [startSeason, setStartSeason] = useState<Season>("Fall");
  const [academicYears, setAcademicYears] = useState<number>(2);

  const [terms, setTerms] = useState<Term[]>(() =>
    buildTerms(defaultStartAY, "Fall", 2),
  );
  const [selectedTermKey, setSelectedTermKey] = useState<string>(() =>
    termKey(buildTerms(defaultStartAY, "Fall", 2)[0]),
  );

  const [openGroups, setOpenGroups] = useState<
    Record<Course["category"], boolean>
  >({
    GenEd: false,
    Core: false,
    Elective: false,
    Other: false,
  });

  const [program, setProgram] = useState<ProgramKey>(() => {
    const raw = localStorage.getItem("dp.program");
    return raw === "cs" || raw === "is" ? raw : "cs";
  });

  type CourseOverride = Partial<Omit<Course, "id">>;

  const [editorOpen, setEditorOpen] = useState(false);

  const [courseOverrides, setCourseOverrides] = useState<
    Record<string, CourseOverride>
  >(() => {
    return safeJSONParse(
      localStorage.getItem(`dp.courseOverrides.${program}`),
      {},
    );
  });

  /* ------------------------- Persistence (localStorage) ------------------- */

  useEffect(() => {
    localStorage.setItem("dp.program", program);
  }, [program]);

  useEffect(() => {
    // when program changes, load that program’s overrides
    setCourseOverrides(
      safeJSONParse(localStorage.getItem(`dp.courseOverrides.${program}`), {}),
    );
  }, [program]);

  useEffect(() => {
    localStorage.setItem(
      `dp.courseOverrides.${program}`,
      JSON.stringify(courseOverrides),
    );
  }, [program, courseOverrides]);

  /* ---------------------------- Derived data ------------------------------ */

  // ✅ define this BEFORE anything that references it
  const effectiveCatalog = useMemo(() => {
    return COURSE_CATALOG.map((c) => ({
      ...c,
      ...(courseOverrides[c.id] ?? {}),
    }));
  }, [courseOverrides]);

  const coursesById = useMemo(() => {
    return new Map(effectiveCatalog.map((c) => [c.id, c] as const));
  }, [effectiveCatalog]);

  const dependentsByPrereqId = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const course of effectiveCatalog) {
      const allPrereqIds = [
        ...(course.prereqIds ?? []),
        ...((course.prereqAnyIds ?? []).flat()),
      ];

      for (const prereqId of allPrereqIds) {
        if (!m.has(prereqId)) m.set(prereqId, new Set());
        m.get(prereqId)!.add(course.id);
      }
    }
    return m;
  }, [effectiveCatalog]);

  const selectedTerm = useMemo(
    () => terms.find((t) => termKey(t) === selectedTermKey)!,
    [terms, selectedTermKey],
  );

  const placedCourseIds = useMemo(() => {
    const all = new Set<string>();
    for (const t of terms) for (const id of t.courseIds) all.add(id);
    return all;
  }, [terms]);

  const selectedCredits = useMemo(() => {
    return selectedTerm.courseIds.reduce(
      (sum, id) => sum + (coursesById.get(id)?.credits ?? 0),
      0,
    );
  }, [selectedTerm, coursesById]);

  const totalCredits = useMemo(() => {
    return terms.reduce((sum, t) => {
      return (
        sum +
        t.courseIds.reduce(
          (s, id) => s + (coursesById.get(id)?.credits ?? 0),
          0,
        )
      );
    }, 0);
  }, [terms, coursesById]);

  const presetCourseIdSet = useMemo(
    () => new Set(presetIds(program)),
    [program],
  );

  const presetCatalog = useMemo(() => {
    return effectiveCatalog.filter((c) => presetCourseIdSet.has(c.id));
  }, [effectiveCatalog, presetCourseIdSet]);

  const filteredCatalog = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return presetCatalog;
    return presetCatalog.filter((c) =>
      `${c.code} ${c.title}`.toLowerCase().includes(q),
    );
  }, [query, presetCatalog]);

  /* ------------------------------- Toasts -------------------------------- */

  const [toasts, setToasts] = useState<Toast[]>([]);
  const lastToastRef = useRef<Record<string, number>>({});

  function pushToast(kind: ToastKind, title: string, message?: string) {
    const key = `${kind}|${title}|${message ?? ""}`;
    const tnow = Date.now();
    const last = lastToastRef.current[key] ?? 0;
    if (tnow - last < 250) return;

    lastToastRef.current[key] = tnow;

    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : String(Date.now() + Math.random());

    setToasts((prev) => [{ id, kind, title, message }, ...prev].slice(0, 4));
    window.setTimeout(
      () => setToasts((prev) => prev.filter((x) => x.id !== id)),
      3500,
    );
  }

  function dismissToast(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  /* --------------------------- Add / remove logic ------------------------- */

  function addCourseToSelected(courseId: string) {
    if (placedCourseIds.has(courseId)) return;

    setTerms((prev) => {
      return addCourseToTerm(prev, selectedTermKey, courseId);
    });
  }

  function removeCourseAndDependents(prev: Term[], removedId: string) {
    const toRemove = new Set<string>([removedId]);
    const stack = [removedId];

    while (stack.length) {
      const cur = stack.pop()!;
      const deps = dependentsByPrereqId.get(cur);
      if (!deps) continue;

      for (const depId of deps) {
        if (!toRemove.has(depId)) {
          toRemove.add(depId);
          stack.push(depId);
        }
      }
    }

    return prev.map((t) => ({
      ...t,
      courseIds: t.courseIds.filter((id) => !toRemove.has(id)),
    }));
  }

  function removeCourse(_termK: string, courseId: string) {
    setTerms((prev) => removeCourseAndDependents(prev, courseId));
  }

  function regenerateTerms(
    nextStartAY: number,
    nextStartSeason: Season,
    nextYears: number,
  ) {
    setTerms((prev) => {
      const next = regenerateTimeline(
        prev,
        nextStartAY,
        nextStartSeason,
        nextYears,
      );
      const nextKeys = new Set(next.map(termKey));
      if (!nextKeys.has(selectedTermKey)) setSelectedTermKey(termKey(next[0]));
      return next;
    });
  }

  /* ---------------------------------- DnD -------------------------------- */

  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [overTermK, setOverTermK] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 8 },
    }),
  );

  useEffect(() => {
    document.body.classList.toggle("dragging", !!activeCourseId);
    return () => document.body.classList.remove("dragging");
  }, [activeCourseId]);

  function onDragStart(e: DragStartEvent) {
    const cid = e.active?.data?.current?.courseId as string | undefined;
    if (cid) setActiveCourseId(cid);
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    setActiveCourseId(null);
    if (!over) return;

    // ✅ Real course id (catalog drags may NOT use active.id)
    const draggedCourseId =
      (active.data.current?.courseId as string | undefined) ?? String(active.id);

    const overId = String(over.id);

    // Reorder inside same term
    if (
      active.data.current?.origin === "term" &&
      over.data.current?.origin === "term"
    ) {
      const fromTermK = active.data.current.termK as string;
      const toTermK = over.data.current.termK as string;

      if (fromTermK === toTermK) {
        setTerms((prev) =>
          prev.map((t) => {
            const k = termKey(t);
            if (k !== fromTermK) return t;

            const oldIndex = t.courseIds.indexOf(draggedCourseId);
            const newIndex = t.courseIds.indexOf(overId);
            if (oldIndex < 0 || newIndex < 0) return t;

            const nextIds = arrayMove(t.courseIds, oldIndex, newIndex);
            return { ...t, courseIds: nextIds };
          }),
        );
        return;
      }
    }

    // Dropping onto a term dropzone (or onto a course inside a term)
    const destTermK = (() => {
      // Preferred: droppable data explicitly says which term
      const d = over.data.current as any;
      if (d?.origin === "term" && typeof d.termK === "string") return d.termK;
      if (typeof d?.termK === "string") return d.termK;

      // Fallback: if we're over a course card, find the term that contains that course id
      const hoveredId = String(over.id);
      const containing = terms.find((t) => t.courseIds.includes(hoveredId));
      if (containing) return termKey(containing);

      // Last resort: maybe over.id is itself a term key
      return hoveredId;
    })();


    setTerms((prev) => {
      // clone terms
      const next = prev.map((t) => ({ ...t, courseIds: [...t.courseIds] }));

      // ✅ Always remove the dragged course from everywhere first (prevents duplication)
      for (const t of next) {
        t.courseIds = t.courseIds.filter((id) => id !== draggedCourseId);
      }

      // Add to destination term (and try to insert near the drop target if possible)
      const destIdx = next.findIndex((t) => termKey(t) === destTermK);
      if (destIdx >= 0) {
        const ids = next[destIdx].courseIds;

        if (!ids.includes(draggedCourseId)) {
          const overIndex = ids.indexOf(String(over.id));
          if (overIndex >= 0) ids.splice(overIndex, 0, draggedCourseId);
          else ids.push(draggedCourseId);
        }
      }

      return next;
    });

  }

  function onDragOver(e: any) {
    const over = e.over;
    if (!over) {
      setOverTermK(null);
      return;
    }

    const d = over.data?.current as any;

    // If we're directly over a term dropzone
    if (d?.origin === "term" && typeof d.termK === "string") {
      setOverTermK(d.termK);
      return;
    }

    // If we're over a course card, over.id is usually the courseId
    const overId = String(over.id);
    const containing = terms.find((t) => t.courseIds.includes(overId));
    setOverTermK(containing ? termKey(containing) : null);
  }

  /* ---------------------------------- UI --------------------------------- */

  function openPrintView() {
    // ✅ remove empty semesters at the end
    const lastNonEmptyIdx = (() => {
      for (let i = terms.length - 1; i >= 0; i--) {
        if (terms[i].courseIds.length > 0) return i;
      }
      return -1;
    })();

    const printableTerms =
      lastNonEmptyIdx === -1 ? terms.slice(0, 1) : terms.slice(0, lastNonEmptyIdx + 1);

    const html = renderPrintableHTML(printableTerms, coursesById);
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
  }


  /* ---------------------------------- JSX -------------------------------- */

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={(e) => { setOverTermK(null); onDragEnd(e); }}
      onDragCancel={() => { setActiveCourseId(null); setOverTermK(null); }}
    >
      <div className="appShell">
        <header className="topBar">
          <div className="brand">
            <div className="logo">🎓</div>
            <div>
              <div className="title">CSIS Degree Planner</div>
              <div className="subtitle">
                Pick courses, fill semesters, print your plan
              </div>
            </div>
          </div>

          <button
            className="btn"
            onClick={openPrintView}
            title="Opens a printable view in a new tab"
            type="button"
          >
            🖨️ Print / Save PDF
          </button>
        </header>

        <div className="layout">
          <Catalog
            program={program}
            setProgram={setProgram}
            programLabel={PROGRAM_LABEL[program]}
            onOpenEditor={() => setEditorOpen(true)}
            query={query}
            setQuery={setQuery}
            filteredCatalog={filteredCatalog}
            openGroups={openGroups}
            setOpenGroups={setOpenGroups}
            placedCourseIds={placedCourseIds}
            coursesById={coursesById}
            addCourseToSelected={addCourseToSelected}
            categoryClass={categoryClass}
            categoryForCourseId={(courseId) => categoryForCourseId(program, courseId)}
          />

          <Board
            terms={terms}
            coursesById={coursesById}
            selectedTermKey={selectedTermKey}
            setSelectedTermKey={setSelectedTermKey}
            defaultStartAY={defaultStartAY}
            startAcademicYear={startAcademicYear}
            setStartAcademicYear={setStartAcademicYear}
            startSeason={startSeason}
            setStartSeason={setStartSeason}
            academicYears={academicYears}
            setAcademicYears={setAcademicYears}
            regenerateTerms={regenerateTerms}
            selectedCredits={selectedCredits}
            totalCredits={totalCredits}
            removeCourse={removeCourse}
            overTermK={overTermK}
          />
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeCourseId ? (
          <div className="dragGhost">
            <div style={{ fontWeight: 900 }}>
              {coursesById.get(activeCourseId)?.code ?? activeCourseId}
            </div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              {coursesById.get(activeCourseId)?.title ?? ""}
            </div>
          </div>
        ) : null}
      </DragOverlay>

      <CourseEditorModal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        programLabel={PROGRAM_LABEL[program]}
        baseCatalog={presetCatalog}
        overrides={courseOverrides}
        onSave={(next) => {
          setCourseOverrides(next);
          setEditorOpen(false);
          pushToast(
            "info",
            "Saved",
            "Course changes were saved for this preset.",
          );
        }}
      />

      <ToastHost toasts={toasts} onDismiss={dismissToast} />
    </DndContext>
  );
}
