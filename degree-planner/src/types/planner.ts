export type Season = "Fall" | "Spring" | "Summer";

export type Course = {
  id: string;
  code: string;
  title: string;
  credits: number;
  category: "GenEd" | "Core" | "Elective" | "Other";
  
  prereqIds?: string[];        // AND prereqs (must be before)
  prereqAnyIds?: string[][];   // OR groups (each inner group: pick ONE, and it must be before)

  coreqIds?: string[];         // AND coreqs (must be same term or before)
  coreqAnyIds?: string[][];    // OR coreq groups (pick ONE, same term or before)
  
  offered?: Season[];
  note?: string;
};

export type Term = {
  academicYearStart: number;
  season: Season;
  calendarYear: number;
  courseIds: string[];
};
