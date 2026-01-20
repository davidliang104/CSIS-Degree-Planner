import { useEffect, useMemo, useRef, useState } from "react";
import type { Course, Season } from "../types/planner";

type CourseOverride = Partial<Omit<Course, "id">>; // keep id fixed

type Props = {
  open: boolean;
  onClose: () => void;

  programLabel: string;

  baseCatalog: Course[];
  overrides: Record<string, CourseOverride>; // key = courseId
  onSave: (nextOverrides: Record<string, CourseOverride>) => void;
};

const SEASONS: Season[] = ["Fall", "Spring", "Summer"];

export default function CourseEditorModal({
  open,
  onClose,
  programLabel,
  baseCatalog,
  overrides,
  onSave,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftOverrides, setDraftOverrides] = useState<
    Record<string, CourseOverride>
  >({});

  // When opening, seed draft from current overrides
  useEffect(() => {
    if (!open) return;
    setDraftOverrides(overrides);
    setSelectedId((prev) => prev ?? baseCatalog[0]?.id ?? null);
  }, [open, overrides, baseCatalog]);

  const draftMerged = useMemo(() => {
    return baseCatalog.map((c) => ({ ...c, ...(draftOverrides[c.id] ?? {}) }));
  }, [baseCatalog, draftOverrides]);

  const selected = useMemo(() => {
    if (!selectedId) return null;
    return draftMerged.find((c) => c.id === selectedId) ?? null;
  }, [draftMerged, selectedId]);

  const codeConflict = useMemo(() => {
    if (!selected) return false;
    const nextCode = selected.code.trim().toLowerCase();
    if (!nextCode) return false;

    return draftMerged.some(
      (c) => c.id !== selected.id && c.code.trim().toLowerCase() === nextCode,
    );
  }, [draftMerged, selected]);

  const [prereqQuery, setPrereqQuery] = useState("");
  const [prereqOpen, setPrereqOpen] = useState(false);
  const prereqWrapRef = useRef<HTMLDivElement | null>(null);

  const [coreqQuery, setCoreqQuery] = useState("");
  const [coreqOpen, setCoreqOpen] = useState(false);
  const coreqWrapRef = useRef<HTMLDivElement | null>(null);

  const byId = useMemo(
    () => new Map(draftMerged.map((c) => [c.id, c] as const)),
    [draftMerged],
  );

  const prereqOptions = useMemo(() => {
    if (!selected) return [];
    const q = prereqQuery.trim().toLowerCase();

    const already = new Set(selected.prereqIds ?? []);
    return draftMerged
      .filter((c) => c.id !== selected.id) // not itself
      .filter((c) => !already.has(c.id)) // not already selected
      .filter((c) => {
        if (!q) return true;
        return `${c.code} ${c.title}`.toLowerCase().includes(q);
      })
      .slice(0, 10); // cap list
  }, [prereqQuery, selectedId, draftMerged]);

  const shouldShowPrereqMenu =
    prereqOpen && prereqQuery.trim().length > 0 && prereqOptions.length > 0;

  const coreqOptions = useMemo(() => {
    if (!selected) return [];
    const q = coreqQuery.trim().toLowerCase();
    if (!q) return [];

    const already = new Set([...(selected.coreqIds ?? []), ...(selected.prereqIds ?? [])]);

    return draftMerged
      .filter((c) => c.id !== selected.id) // no self
      .filter((c) => !already.has(c.id))   // don’t duplicate
      .filter((c) => `${c.code} ${c.title}`.toLowerCase().includes(q))
      .slice(0, 10);
  }, [coreqQuery, draftMerged, selected]);

  const shouldShowCoreqMenu = coreqOpen && coreqQuery.trim().length > 0 && coreqOptions.length > 0;

  useEffect(() => {
    if (!open) return;

    function onDocMouseDown(e: MouseEvent) {
      const t = e.target as Node;

      const pre = prereqWrapRef.current;
      if (pre && !pre.contains(t)) setPrereqOpen(false);

      const co = coreqWrapRef.current;
      if (co && !co.contains(t)) setCoreqOpen(false);
    }

    function onDocKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setPrereqOpen(false);
        setCoreqOpen(false);
      }
    }

    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onDocKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onDocKeyDown);
    };
  }, [open]);

  function addPrereq(id: string) {
    if (!selected) return;
    const cur = selected.prereqIds ?? [];
    if (cur.includes(id)) return;
    patchSelected({ prereqIds: [...cur, id] });
    setPrereqQuery("");
  }

  function removePrereq(id: string) {
    if (!selected) return;
    const cur = selected.prereqIds ?? [];
    patchSelected({ prereqIds: cur.filter((x) => x !== id) });
  }

  function addCoreq(id: string) {
    if (!selected) return;
    const cur = selected.coreqIds ?? [];
    if (cur.includes(id)) return;
    patchSelected({ coreqIds: [...cur, id] });
    setCoreqQuery("");
    setCoreqOpen(false);
  }

  function removeCoreq(id: string) {
    if (!selected) return;
    patchSelected({ coreqIds: (selected.coreqIds ?? []).filter((x) => x !== id) });
  }

  function patchSelected(patch: CourseOverride) {
    if (!selectedId) return;
    setDraftOverrides((prev) => ({
      ...prev,
      [selectedId]: { ...(prev[selectedId] ?? {}), ...patch },
    }));
  }

  function toggleOffered(season: Season) {
    if (!selected) return;
    const cur = selected.offered ?? [];
    const next = cur.includes(season)
      ? cur.filter((s) => s !== season)
      : [...cur, season];
    patchSelected({ offered: next });
  }

  function resetAll() {
    setDraftOverrides({});
    // optional: snap selection back to first course
    // setSelectedId(baseCatalog[0]?.id ?? null);
  }

  function closeOnBackdrop(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  if (!open) return null;

  return (
    <div className="modalBackdrop" onMouseDown={closeOnBackdrop}>
      <div className="modalCard" role="dialog" aria-modal="true">
        <div className="modalHeader">
          <div>
            <div className="modalTitle">Edit courses</div>
            <div className="modalSub">{programLabel} preset</div>
          </div>

          <div className="modalHeaderBtns">
            <button
              className="smallBtn resetBtn"
              type="button"
              onClick={resetAll}
            >
              Reset
            </button>
            <button className="smallBtn" type="button" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn"
              type="button"
              onClick={() => onSave(draftOverrides)}
              disabled={codeConflict}
              title={
                codeConflict
                  ? "Fix duplicate course code first"
                  : "Save changes"
              }
            >
              Save
            </button>
          </div>
        </div>

        <div className="modalBody">
          <aside className="modalList">
            {draftMerged.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`modalListItem ${
                  c.id === selectedId ? "isActive" : ""
                }`}
                onClick={() => setSelectedId(c.id)}
              >
                <div className="liTop">
                  <div className="liCode">{c.code}</div>
                  <div className="liCredits">{c.credits}</div>
                </div>
                <div className="liTitle">{c.title}</div>
              </button>
            ))}
          </aside>

          <section className="modalForm">
            {!selected ? (
              <div className="muted">No course selected.</div>
            ) : (
              <>
                <div className="formRow">
                  <label className="formLabel">Code</label>
                  <input
                    className="formInput"
                    value={selected.code}
                    onChange={(e) => patchSelected({ code: e.target.value })}
                    placeholder="e.g. CSIS 210"
                  />
                  {codeConflict ? (
                    <div
                      className="muted"
                      style={{ color: "#b91c1c", marginTop: 6 }}
                    >
                      That code is already used by another course. Please choose
                      a unique code.
                    </div>
                  ) : null}
                </div>

                <div className="formRow">
                  <label className="formLabel">Title</label>
                  <input
                    className="formInput"
                    value={selected.title}
                    onChange={(e) => patchSelected({ title: e.target.value })}
                  />
                </div>

                <div className="formRow formRow2">
                  <div>
                    <label className="formLabel">Credits</label>
                    <input
                      className="formInput"
                      type="number"
                      min={0}
                      value={selected.credits}
                      onChange={(e) =>
                        patchSelected({ credits: Number(e.target.value) })
                      }
                    />
                  </div>

                  <div>
                    <label className="formLabel">Category</label>
                    <select
                      className="formInput"
                      value={selected.category}
                      onChange={(e) =>
                        patchSelected({
                          category: e.target.value as Course["category"],
                        })
                      }
                    >
                      <option value="GenEd">GenEd</option>
                      <option value="Core">Core</option>
                      <option value="Elective">Elective</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="formRow">
                  <label className="formLabel">Offered</label>
                  <div className="chipsRow">
                    {SEASONS.map((s) => {
                      const on = (selected.offered ?? []).includes(s);
                      return (
                        <button
                          key={s}
                          type="button"
                          className={`chipBtn ${on ? "on" : ""}`}
                          onClick={() => toggleOffered(s)}
                        >
                          {s}
                        </button>
                      );
                    })}
                    <span className="muted" style={{ marginLeft: 8 }}>
                      (none = allowed any term)
                    </span>
                  </div>
                </div>

                <div className="formRow">
                  <label className="formLabel">Prerequisites</label>

                  {/* Selected prereqs as chips */}
                  <div className="chipsRow" style={{ marginBottom: 8 }}>
                    {(selected.prereqIds ?? []).length === 0 ? (
                      <span className="muted">(none)</span>
                    ) : (
                      (selected.prereqIds ?? []).map((pid) => {
                        const c = byId.get(pid);
                        const label = c ? `${c.code}` : pid;
                        return (
                          <button
                            key={pid}
                            type="button"
                            className="prereqChip"
                            onClick={() => removePrereq(pid)}
                            title={
                              c ? `Remove: ${c.code} – ${c.title}` : "Remove"
                            }
                          >
                            {label} <span aria-hidden>✕</span>
                          </button>
                        );
                      })
                    )}
                  </div>

                  {/* Search + dropdown results */}
                  <div className="prereqPicker" ref={prereqWrapRef}>
                    <input
                      className="formInput"
                      value={prereqQuery}
                      onChange={(e) => {
                        setPrereqQuery(e.target.value);
                        setPrereqOpen(true); // user is typing
                      }}
                      onFocus={() => setPrereqOpen(true)}
                      onBlur={() => {
                        // small delay lets menu clicks register before it closes
                        window.setTimeout(() => setPrereqOpen(false), 120);
                      }}
                      placeholder="Search courses to add… (code or title)"
                    />

                    {shouldShowPrereqMenu && (
                      <div className="prereqMenu" role="listbox">
                        {prereqOptions.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            className="prereqOption"
                            // IMPORTANT: prevents input blur before click runs
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => addPrereq(c.id)}
                            title={`Add: ${c.code} – ${c.title}`}
                          >
                            <div className="poCode">{c.code}</div>
                            <div className="poTitle">{c.title}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="muted" style={{ marginTop: 10 }}>
                    Tip: Click a prereq chip to remove it.
                  </div>
                </div>

                <div className="formRow">
                  <label className="formLabel">Corequisites</label>

                  {/* Selected coreqs as chips */}
                  <div className="chipsRow" style={{ marginBottom: 8 }}>
                    {(selected.coreqIds ?? []).length === 0 ? (
                      <span className="muted">(none)</span>
                    ) : (
                      (selected.coreqIds ?? []).map((cid) => {
                        const c = byId.get(cid);
                        const label = c ? c.code : cid;
                        return (
                          <button
                            key={cid}
                            type="button"
                            className="prereqChip"
                            onClick={() => removeCoreq(cid)}
                            title={c ? `Remove: ${c.code} – ${c.title}` : "Remove"}
                          >
                            {label} <span aria-hidden>✕</span>
                          </button>
                        );
                      })
                    )}
                  </div>

                  {/* Search + dropdown results */}
                  <div className="prereqPicker" ref={coreqWrapRef}>
                    <input
                      className="formInput"
                      value={coreqQuery}
                      onChange={(e) => {
                        setCoreqQuery(e.target.value);
                        setCoreqOpen(true);
                      }}
                      onFocus={() => setCoreqOpen(true)}
                      onBlur={() => window.setTimeout(() => setCoreqOpen(false), 120)}
                      placeholder="Search courses to add… (code or title)"
                    />

                    {shouldShowCoreqMenu && (
                      <div className="prereqMenu" role="listbox">
                        {coreqOptions.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            className="prereqOption"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => addCoreq(c.id)}
                            title={`Add: ${c.code} – ${c.title}`}
                          >
                            <div className="poCode">{c.code}</div>
                            <div className="poTitle">{c.title}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="muted" style={{ marginTop: 6 }}>
                    Coreq can be taken in the same term or earlier.
                  </div>
                </div>


                <div className="formRow">
                  <label className="formLabel">Note (optional)</label>
                  <textarea
                    className="formTextarea"
                    value={selected.note ?? ""}
                    onChange={(e) => patchSelected({ note: e.target.value })}
                    placeholder="Anything you want to remember…"
                  />
                </div>

                <div className="muted" style={{ marginTop: 6 }}>
                  Tip: These edits only affect your device for this preset.
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
