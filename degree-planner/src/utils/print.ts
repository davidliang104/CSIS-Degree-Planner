import type { Course, Term } from "../types/planner";
import { academicYearLabel } from "./terms";

const CATEGORY_ORDER: Course["category"][] = ["GenEd", "Core", "Elective", "Other"];

const CATEGORY_LABEL: Record<Course["category"], string> = {
  GenEd: "General Education",
  Core: "Core Courses",
  Elective: "Electives",
  Other: "Other",
};

export function renderPrintableHTML(terms: Term[], coursesById: Map<string, Course>) {
  // Build table rows (page 1)
  const rows = terms
    .map((t) => {
      const k = `${t.season} ${t.calendarYear}`;

      const courses = t.courseIds
        .map((id) => coursesById.get(id))
        .filter(Boolean)
        .map((c) => `${escapeHtml(c!.code)} (${c!.credits}) ${escapeHtml(c!.title)}`)
        .join("<br/>");

      const credits = t.courseIds.reduce(
        (sum, id) => sum + (coursesById.get(id)?.credits ?? 0),
        0
      );

      return `
        <tr>
          <td class="term">${escapeHtml(k)}</td>
          <td class="courses">${
            courses || "<span class='muted'>No courses selected</span>"
          }</td>
          <td class="credits">${credits}</td>
        </tr>
      `;
    })
    .join("");

  const total = terms.reduce(
    (sum, t) =>
      sum +
      t.courseIds.reduce((s, id) => s + (coursesById.get(id)?.credits ?? 0), 0),
    0
  );

  // Build "Course Index" (page 2)
  // Map courseId -> term label(s)
  const takenIn = new Map<string, string[]>();
  for (const t of terms) {
    const termLabel = `${t.season} ${academicYearLabel(t.academicYearStart)}`;
    for (const id of t.courseIds) {
      if (!takenIn.has(id)) takenIn.set(id, []);
      takenIn.get(id)!.push(termLabel);
    }
  }

  // Group taken courses by category
  const grouped = new Map<Course["category"], Course[]>();
  for (const [id] of takenIn) {
    const c = coursesById.get(id);
    if (!c) continue;
    if (!grouped.has(c.category)) grouped.set(c.category, []);
    grouped.get(c.category)!.push(c);
  }

  // Sort within each group by code
  for (const cat of grouped.keys()) {
    grouped.get(cat)!.sort((a, b) => a.code.localeCompare(b.code));
  }

  const courseIndexHtml = CATEGORY_ORDER.map((cat) => {
    const list = grouped.get(cat) ?? [];
    if (list.length === 0) return "";

    const items = list
      .map((c) => {
        const termsTaken = (takenIn.get(c.id) ?? []).map(escapeHtml).join(", ");
        return `
          <div class="ciItem">
            <div class="ciLeft">
              <div class="ciCode">${escapeHtml(c.code)}</div>
              <div class="ciTitle">${escapeHtml(c.title)}</div>
            </div>
            <div class="ciRight">
              <div class="ciTerm">${termsTaken}</div>
              <div class="ciCredits">${c.credits} cr</div>
            </div>
          </div>
        `;
      })
      .join("");

    return `
      <div class="ciGroup">
        <div class="ciGroupTitle">${escapeHtml(CATEGORY_LABEL[cat])}</div>
        <div class="ciList">${items}</div>
      </div>
    `;
  }).join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Degree Plan</title>
  <style>
    :root{
      --bg1:#f8fbff; --bg2:#f3f6fb;
      --panel:#ffffff; --panel2:#f0f4fa;
      --text:#1f2937; --muted:#6b7280; --line:#e5e7eb;
      --accent:#4f8cff; --shadow: rgba(17, 24, 39, 0.12);
    }
    *{ box-sizing:border-box; }
    body{
      margin:0; padding:28px;
      font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
      color:var(--text);
      background:linear-gradient(180deg,var(--bg1),var(--bg2));
    }
    body::before{
      content:""; position:fixed; inset:0; pointer-events:none;
      opacity:0.16;
      background-image:radial-gradient(rgba(0,0,0,0.06) 1px, transparent 1px);
      background-size:18px 18px;
    }
    .sheet{
      position:relative;
      max-width:980px; margin:0 auto;
      background:rgba(255,255,255,0.92);
      backdrop-filter:blur(6px);
      border:1px solid var(--line);
      border-radius:18px;
      box-shadow:0 18px 40px var(--shadow);
      overflow:hidden;
    }
    .header{
      padding:16px 18px;
      background:var(--panel2);
      border-bottom:1px solid var(--line);
      display:flex;
      justify-content:space-between;
      align-items:flex-end;
      gap:12px;
    }
    h1{ margin:0; font-size:18px; font-weight:950; letter-spacing:0.2px; }
    .sub{ margin:4px 0 0 0; color:var(--muted); font-size:12px; font-weight:650; }
    .badge{
      border:1px solid rgba(79,140,255,0.35);
      background:rgba(79,140,255,0.10);
      color:#1e3a8a;
      padding:6px 10px;
      border-radius:999px;
      font-size:12px;
      font-weight:900;
      white-space:nowrap;
    }
    .content{ padding:16px 18px 18px 18px; }

    table{
      width:100%;
      border-collapse:collapse;
      border:1px solid var(--line);
      border-radius:14px;
      overflow:hidden;
    }
    thead th{
      background:#0b1220;
      color:#fff;
      text-align:left;
      padding:10px 12px;
      font-size:12px;
      font-weight:950;
      border-bottom:1px solid rgba(255,255,255,0.12);
    }
    tbody td{
      padding:10px 12px;
      vertical-align:top;
      border-top:1px solid var(--line);
      font-size:13px;
    }
    tbody tr:nth-child(odd){ background:rgba(240,244,250,0.55); }
    .term{ width:26%; font-weight:900; color:#0f172a; white-space:nowrap; }
    .courses{ width:64%; line-height:1.35; }
    .credits{ width:10%; text-align:right; font-weight:950; white-space:nowrap; }
    .muted{ color:var(--muted); }
    .courses br{ content:""; margin:6px 0; display:block; }

    /* Page 2 */
    .pageBreak{
      break-before: page;
      page-break-before: always;
    }
    .ciHeader{
      padding:16px 18px;
      background:var(--panel2);
      border-bottom:1px solid var(--line);
    }
    .ciTitle{
      font-size:16px;
      font-weight:950;
      margin:0;
    }
    .ciGroup{ margin-top:14px; }
    .ciGroupTitle{
      font-weight:950;
      font-size:12px;
      color:#0f172a;
      margin:0 0 8px 0;
      letter-spacing:0.2px;
      text-transform:uppercase;
    }
    .ciList{
      border:1px solid var(--line);
      border-radius:14px;
      overflow:hidden;
      background:rgba(255,255,255,0.95);
    }
    .ciItem{
      display:flex;
      justify-content:space-between;
      gap:12px;
      padding:10px 12px;
      border-top:1px solid var(--line);
    }
    .ciItem:first-child{ border-top:none; }
    .ciCode{ font-weight:950; color:#0f172a; }
    .ciTitle{ font-size:12px; color:#374151; margin-top:2px; font-weight:700; }
    .ciRight{ text-align:right; white-space:nowrap; }
    .ciTerm{ font-size:12px; font-weight:900; color:#111827; }
    .ciCredits{ font-size:12px; color:var(--muted); font-weight:800; margin-top:2px; }

    @media print{
      body{ padding:0; background:white; }
      body::before{ display:none; }
      .sheet{ box-shadow:none; border:none; border-radius:0; max-width:none; }
      .content{ padding:12px; }
      tr{ page-break-inside:avoid; }
    }
  </style>
</head>
<body>
  <!-- Page 1: term table -->
  <div class="sheet">
    <div class="header">
      <div>
        <h1>Degree Plan</h1>
        <p class="sub">Generated by CSIS Degree Planner</p>
      </div>
      <div class="badge">Total: ${total} credits</div>
    </div>

    <div class="content">
      <table>
        <thead>
          <tr>
            <th>Term</th>
            <th>Courses</th>
            <th style="text-align:right;">Credits</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  </div>

  <!-- Page 2: course index -->
  <div class="sheet pageBreak">
    <div class="ciHeader">
      <div class="ciTitle">Course Index</div>
    </div>
    <div class="content">
      ${courseIndexHtml || `<div class="muted">No courses selected.</div>`}
    </div>
  </div>

  <script>
    window.onload = () => window.print();
  </script>
</body>
</html>`;
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
