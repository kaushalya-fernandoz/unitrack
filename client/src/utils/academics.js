import { addDays, todayString } from "../data/sampleData";

export const gradePoints = {
  "A+": 4,
  A: 4,
  "A-": 3.7,
  "B+": 3.3,
  B: 3,
  "B-": 2.7,
  "C+": 2.3,
  C: 2,
  "C-": 1.7,
  E: 0
};

export const gradeOptions = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "E"];

export function allModules(workspace) {
  return [
    ...workspace.modules.map((module) => ({
      ...module,
      grade: workspace.grades[module.id] || module.grade || "",
      semesterId: module.semesterId || workspace.moduleSemester[module.id] || ""
    })),
    ...workspace.pastModules
  ];
}

export function isNonGpa(module) {
  return module.isGpa === false || Number(module.credits) === 0;
}

export function calculateGpa(modules) {
  let weightedPoints = 0;
  let credits = 0;
  for (const module of modules) {
    if (isNonGpa(module) || !(module.grade in gradePoints) || Number(module.credits) <= 0) continue;
    weightedPoints += gradePoints[module.grade] * Number(module.credits);
    credits += Number(module.credits);
  }
  return credits ? weightedPoints / credits : null;
}

export function gpaText(value) {
  return value == null ? "—" : value.toFixed(2);
}

export function formatDate(value, options = { day: "numeric", month: "short" }) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-GB", options);
}

export function formatLongDate(value) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long"
  });
}

export function startOfWeek(value) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return date;
}

export function weekDates(offset = 0) {
  const start = startOfWeek(todayString());
  start.setDate(start.getDate() + offset * 7);
  const first = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
  return Array.from({ length: 7 }, (_, index) => addDays(first, index));
}

export function formatDuration(seconds) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  return [Math.floor(safeSeconds / 3600), Math.floor((safeSeconds % 3600) / 60), safeSeconds % 60]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}
