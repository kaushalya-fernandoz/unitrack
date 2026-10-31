function toLocalDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayString() {
  return toLocalDateString(new Date());
}

export function addDays(value, amount) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + amount);
  return toLocalDateString(date);
}

export function createEmptyWorkspace(user = null) {
  return {
    profile: {
      name: user?.fullName || "",
      university: user?.university || "",
      degree: user?.degree || "",
      year: user?.academicYear ?? "",
      email: user?.email || ""
    },
    goal: null,
    modules: [],
    tasks: [],
    semesters: [],
    grades: {},
    moduleSemester: {},
    pastModules: [],
    sessions: [],
    timer: null
  };
}

export function createSampleWorkspace() {
  const today = todayString();
  const modules = [
    { id: "web", name: "Web Development", code: "EE4207", credits: 2 },
    { id: "db", name: "Database Systems", code: "ICT3202", credits: 3 },
    { id: "net", name: "Computer Networks", code: "ICT3203", credits: 3 },
    { id: "se", name: "Software Engineering", code: "ICT3204", credits: 3 }
  ];
  const tasks = [
    ["1", "Build the task management API", "web", "Project", 0, "High", false],
    ["2", "Revise normalization & SQL joins", "db", "Study", 0, "High", false],
    ["3", "Review the use case diagram", "se", "Assignment", 0, "Medium", false],
    ["4", "Complete subnetting exercises", "net", "Study", 1, "Medium", false],
    ["5", "Database practical exam", "db", "Exam", 2, "High", false],
    ["6", "Mini project submission", "web", "Project", 3, "High", false],
    ["7", "Network design report", "net", "Assignment", 5, "Medium", false],
    ["8", "Submit the project proposal", "web", "Project", -2, "Medium", true],
    ["9", "Prepare database revision notes", "db", "Study", -1, "Medium", true],
    ["10", "Complete the network lab", "net", "Assignment", -1, "Low", true]
  ].map(([id, title, moduleId, type, offset, priority, done]) => ({
    id,
    title,
    moduleId,
    type,
    date: addDays(today, offset),
    priority,
    notes: "",
    done,
    completedAt: done ? addDays(today, -1) : null
  }));

  return {
    profile: {
      name: "Themiya",
      university: "University of Ruhuna",
      degree: "Bachelor of Information & Communication Technology",
      year: 3,
      email: ""
    },
    goal: 120,
    modules,
    tasks,
    semesters: [
      { id: "s1", name: "Year 3 · Semester 1", start: addDays(today, -35), end: addDays(today, 100) },
      { id: "s0", name: "Year 2 · Semester 2", start: addDays(today, -200), end: addDays(today, -50) }
    ],
    grades: { web: "A-", db: "B+", net: "A", se: "B+" },
    moduleSemester: { web: "s1", db: "s1", net: "s1", se: "s1" },
    pastModules: [
      { id: "old1", name: "Object-Oriented Programming", code: "ICT2201", credits: 3, semesterId: "s0", grade: "A" },
      { id: "old2", name: "Operating Systems", code: "ICT2202", credits: 3, semesterId: "s0", grade: "B+" },
      { id: "old3", name: "Mathematics for Computing", code: "ICT2203", credits: 2, semesterId: "s0", grade: "A-" }
    ],
    sessions: [
      { id: "session-1", moduleId: "web", date: today, seconds: 2700 },
      { id: "session-2", moduleId: "db", date: today, seconds: 1800 },
      ...Array.from({ length: 6 }, (_, index) => ({
        id: `history-${index}`,
        moduleId: index % 2 ? "db" : "web",
        date: addDays(today, -index - 1),
        seconds: [3600, 5400, 2700, 4200, 1800, 3600][index]
      }))
    ],
    timer: null
  };
}
