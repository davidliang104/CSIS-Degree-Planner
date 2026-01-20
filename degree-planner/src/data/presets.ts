// src/data/presets.ts
import type { Course } from "../types/planner";

export type ProgramKey = "cs" | "is";
export type Category = Course["category"];

// Labels for the dropdown
export const PROGRAM_LABEL: Record<ProgramKey, string> = {
  cs: "Computer Science",
  is: "Information Systems",
};

export const REQUIREMENTS: Record<ProgramKey, Record<Category, string[]>> = {
  cs: { 
    GenEd: [
      "eng100",
      "eng101",
      "eng102",
      "univ100",
      "univ101",
      "hum1",
      "hum2",
      "soc1",
      "soc2",
    ], 
    Core: [
      "csis120",
      "csis130",
      "csis150",
      "csis210",
      "csis220",
      "csis240",
      "csis240l",
      "csis250",
      "csis255",
      "csis310",
      "csis320",
      "csis322",
      "csis329",
      "csis330",
      "csis401",
      "csis405",
      "csis476",
      "csis490",
      "csis491",
    ], 
    Elective: [
      "csis230",
      "csis260",
      "csis300",
      "csis301",
      "csis302",
      "csis303",
      "csis370",
      "csis371",
      "csis372",
      "csis389",
      "csis390",
      "csis395",
      "csis402",
      "csis404",
      "csis406",
      "csis411",
      "csis415",
      "csis417",
      "csis418",
      "csis425",
      "csis426",
      "csis432",
      "csis435",
      "csis438",
      "csis440",
      "csis445",
      "csis450",
      "csis470",
      "csis475",
      "csis480",
      "csis493",      
    ], 
    Other: [
      // Math
      "math100",
      "math110",
      "math201",
      "math203",
      "math205",
      "math213",
      "stat203",
      "mathelec",

      // Science
      "biol101",
      "biol101l",
      "biol102",
      "biol102l",
      "phys115",
      "phys115l",
      "phys116",
      "phys116l",
    
      // Management / Entrepreneurship
      "mgmt201",
      "engr210",      
    ] },
  is: { 
    GenEd: [

    ], 
    Core: [
      "csis110",
      "csis120",
      "csis130",
      "csis150",
      "csis210",
      "csis230",
      "csis240",
      "csis240l",
      "csis250",
      "csis255",
      "csis260",
      "csis302",
      "csis322",
      "csis330",
      "csis440",
      "csis476",
      "csis480",
      "csis490",
      "csis491",
    ], 
    Elective: [
      "csis220",
      "csis230",
      "csis300",
      "csis301",
      "csis303",
      "csis310",
      "csis320",
      "csis329",
      "csis371",
      "csis372",
      "csis389",
      "csis390",
      "csis395",
      "csis400",
      "csis402",
      "csis404",
      "csis406",
      "csis411",
      "csis415",
      "csis417",
      "csis418",
      "csis425",
      "csis426",
      "csis432",
      "csis435",
      "csis438",
      "csis445",
      "csis450",
      "csis470",
      "csis475",
    ], 
    Other: [
      // Math
      "math100",
      "math110",
      "math201",
      "math203",
      "math205",
      "math213",
      "stat203",
      "mathelc",

      // Science
      "biol101",
      "biol101l",
      "biol102",
      "biol102l",
      "phys115",
      "phys115l",
      "phys116",
      "phys116l",
    
      // Management / Entrepreneurship
      "mgmt201",
      "engr210",
      
      // Management set
      "mgmt301",
      "mgmt315",
      "entr301",

      // Accounting set
      "acct201",
      "acct205",
      "acct301",

      // Finance set
      "acct201",
      "finc332",
      "finc343",

      // Marketing set
      "econ200",
      "mrkt200",
      "mrkt309",
    ] },
};

export function presetIds(program: ProgramKey): string[] {
  const req = REQUIREMENTS[program];
  return Array.from(
    new Set([...req.GenEd, ...req.Core, ...req.Elective, ...req.Other]),
  );
}

export function categoryForCourseId(program: ProgramKey, courseId: string): Category {
  const req = REQUIREMENTS[program];
  if (req.Core.includes(courseId)) return "Core";
  if (req.GenEd.includes(courseId)) return "GenEd";
  if (req.Elective.includes(courseId)) return "Elective";
  if (req.Other.includes(courseId)) return "Other";
  return "Other";
}