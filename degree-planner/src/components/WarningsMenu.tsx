import { useEffect, useMemo, useRef, useState } from "react";
import type { Course, Term } from "../types/planner";
import { academicYearLabel, termKey } from "../utils/terms";
import { validatePlan } from "../utils/validatePlan";

type Props = {
  terms: Term[];
  coursesById: Map<string, Course>;
  onJumpToTerm?: (termK: string) => void; // optional nice-to-have
};

export default function WarningsMenu({ terms, coursesById, onJumpToTerm }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const { issues, count } = useMemo(() => validatePlan(terms, coursesById), [terms, coursesById]);

  const grouped = useMemo(() => {
    const m = new Map<string, typeof issues>();
    for (const it of issues) {
      const arr = m.get(it.termK) ?? [];
      arr.push(it);
      m.set(it.termK, arr);
    }

    return Array.from(m.entries()).sort((a, b) => {
      const ai = a[1][0]?.termIndex ?? 0;
      const bi = b[1][0]?.termIndex ?? 0;
      return ai - bi;
    });
  }, [issues]);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      const el = wrapRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    function onAnyScroll(e: Event) {
      const el = wrapRef.current;
      if (!el) return;

      // If the user is scrolling INSIDE the warnings menu, don't close it.
      const target = e.target as Node | null;
      if (target && el.contains(target)) return;

      setOpen(false);
    }

    // Capture scrolls from any scroll container (boardContent, main panel, etc.)
    document.addEventListener("scroll", onAnyScroll, true);
    window.addEventListener("resize", onAnyScroll);

    return () => {
      document.removeEventListener("scroll", onAnyScroll, true);
      window.removeEventListener("resize", onAnyScroll);
    };
  }, [open]);

  if (count === 0) return null;

  return (
    <div className="warningsWrap" ref={wrapRef}>
      <button
        type="button"
        className="warningsBtn"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        title="Show plan warnings"
      >
        <span className="warningsIcon" aria-hidden>⚠️</span>
        <span>Warnings</span>
        <span className="warningsCount">{count}</span>
      </button>

      {open && (
        <div className="warningsMenu" role="menu">
          <div className="warningsHeader">Plan checks</div>

          {grouped.map(([termK, items]) => {
            const t = terms.find((x) => termKey(x) === termK);
            const label = t
              ? `${t.season} ${t.calendarYear} (${academicYearLabel(t.academicYearStart)})`
              : termK;

            return (
              <div key={termK} className="warningsGroup">
                <button
                  type="button"
                  className="warningsGroupTitle"
                  onClick={() => onJumpToTerm?.(termK)}
                  title={onJumpToTerm ? "Jump to this term" : undefined}
                >
                  {label}
                  <span className="warningsGroupCount">{items.length}</span>
                </button>

                {items.map((it, idx) => {
                  const c = coursesById.get(it.courseId);
                  const code = c?.code ?? it.courseId;
                  const title = c?.title ?? "";
                  const missing = (it.missingIds ?? [])
                    .map((id) => coursesById.get(id)?.code ?? id)
                    .slice(0, 6);

                  return (
                    <div key={`${it.courseId}-${it.kind}-${idx}`} className="warningRow">
                      <div className="warningTop">
                        <span className="warningCode">{code}</span>
                        {title ? <span className="warningTitle">{title}</span> : null}
                      </div>
                      <div className="warningMsg">
                        {it.message}
                        {missing.length ? (
                          <span className="warningMissing">
                            {" "}Missing: {missing.join(", ")}
                            {(it.missingIds?.length ?? 0) > missing.length ? "…" : ""}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
