import type { Season, Term } from "../types/planner";

export function academicYearLabel(start: number) {
  return `${start}–${start + 1}`;
}

export function termKey(t: Term) {
  return `${t.academicYearStart}-${t.season}`;
}

export function buildTerms(
  startAcademicYear: number,
  startSeason: Season,
  academicYears: number
): Term[] {
  const seasons: Season[] = ["Fall", "Spring", "Summer"];
  const startSeasonIndex = seasons.indexOf(startSeason);
  const terms: Term[] = [];

  for (let y = 0; y < academicYears; y++) {
    const ay = startAcademicYear + y;

    for (let i = 0; i < seasons.length; i++) {
      if (y === 0 && i < startSeasonIndex) continue;

      const season = seasons[i];
      const calendarYear = season === "Fall" ? ay : ay + 1;

      terms.push({
        academicYearStart: ay,
        season,
        calendarYear,
        courseIds: [],
      });
    }
  }

  return terms;
}
