const express = require("express");
const mongoose = require("mongoose");
const Module = require("../models/Module");
const Semester = require("../models/Semester");
const Task = require("../models/Task");
const StudySession = require("../models/StudySession");
const { databaseUnavailable, requireUser, sendDatabaseUnavailable } = require("../middleware/auth");

const router = express.Router();
const gpaGradeOptions = new Set(["", "A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "E"]);
const nonGpaGradeOptions = new Set(["", "High", "Medium", "Low"]);
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(value) {
  if (typeof value !== "string" || !datePattern.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function handleError(res, error) {
  if (databaseUnavailable(error)) return sendDatabaseUnavailable(res);
  if (error?.code === 11000) {
    const field = Object.hasOwn(error.keyPattern || {}, "name") ? "semester" : "module code";
    return res.status(409).json({ error: "duplicate_record", message: `A ${field} with these details already exists.` });
  }
  if (error?.name === "ValidationError" || error?.name === "CastError") {
    return res.status(400).json({ error: "invalid_input", message: "Check the submitted academic record." });
  }
  console.error(`Academics request failed (${error?.name || "Error"}).`);
  return res.status(500).json({ error: "internal_error", message: "The request could not be completed." });
}

function recordId(req, res, next) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: "invalid_id", message: "The requested record ID is invalid." });
  }
  return next();
}

function validateSemester(body) {
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const start = body?.start;
  const end = body?.end;
  if (!name || name.length > 70) return { error: "Semester name is required and must be 70 characters or fewer." };
  if (!isValidDate(start) || !isValidDate(end)) return { error: "Enter valid semester start and end dates." };
  if (end <= start) return { error: "End date must be after the start date." };
  return { name, start, end };
}

function validateModule(body) {
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const code = typeof body?.code === "string" ? body.code.trim().toUpperCase() : "";
  const credits = typeof body?.credits === "number" || typeof body?.credits === "string"
    ? Number(body.credits)
    : Number.NaN;
  if (typeof body?.credits === "string" && !body.credits.trim()) {
    return { error: "Credits must be a number from 0 to 30." };
  }
  const semesterId = body?.semesterId;
  const isGpa = body?.isGpa;
  const grade = body?.grade ?? "";
  if (!name || name.length > 80) return { error: "Module name is required and must be 80 characters or fewer." };
  if (!code || code.length > 20) return { error: "Module code is required and must be 20 characters or fewer." };
  if (!Number.isFinite(credits) || credits < 0 || credits > 30) return { error: "Credits must be a number from 0 to 30." };
  if (typeof isGpa !== "boolean") return { error: "Choose whether this module is GPA or Non-GPA." };
  if (isGpa && credits <= 0) return { error: "GPA modules need positive credits." };
  if (typeof semesterId !== "string" || !mongoose.isValidObjectId(semesterId)) {
    return { error: "Select a valid semester for this module." };
  }
  if (!(isGpa ? gpaGradeOptions : nonGpaGradeOptions).has(grade)) return { error: "Select a valid grade for this module type." };
  return { name, code, credits, semesterId, isGpa, grade };
}

function semesterJson(semester) {
  return { id: semester.id, name: semester.name, start: semester.start, end: semester.end };
}

function moduleJson(module) {
  return {
    id: module.id,
    name: module.name,
    code: module.code,
    credits: module.credits,
    semesterId: String(module.semester),
    isGpa: module.isGpa,
    grade: module.grade
  };
}

router.use(requireUser);

router.get("/", async (req, res) => {
  try {
    const [semesters, modules] = await Promise.all([
      Semester.find({ owner: req.user.id }).sort({ start: 1, _id: 1 }),
      Module.find({ owner: req.user.id }).sort({ code: 1, _id: 1 })
    ]);
    return res.json({ semesters: semesters.map(semesterJson), modules: modules.map(moduleJson) });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/semesters", async (req, res) => {
  const value = validateSemester(req.body || {});
  if (value.error) return res.status(400).json({ error: "invalid_input", message: value.error });
  try {
    const semester = await Semester.create({ ...value, owner: req.user.id });
    return res.status(201).json({ semester: semesterJson(semester) });
  } catch (error) {
    return handleError(res, error);
  }
});

router.put("/semesters/:id", recordId, async (req, res) => {
  const value = validateSemester(req.body || {});
  if (value.error) return res.status(400).json({ error: "invalid_input", message: value.error });
  try {
    const semester = await Semester.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },
      value,
      { new: true, runValidators: true }
    );
    if (!semester) return res.status(404).json({ error: "not_found", message: "Semester not found." });
    return res.json({ semester: semesterJson(semester) });
  } catch (error) {
    return handleError(res, error);
  }
});

router.delete("/semesters/:id", recordId, async (req, res) => {
  try {
    const semester = await Semester.findOne({ _id: req.params.id, owner: req.user.id });
    if (!semester) return res.status(404).json({ error: "not_found", message: "Semester not found." });
    const hasModules = await Module.exists({ owner: req.user.id, semester: semester.id });
    if (hasModules) {
      return res.status(409).json({
        error: "semester_has_modules",
        message: "Move or delete this semester’s modules before deleting the semester."
      });
    }
    await semester.deleteOne();
    return res.json({ message: "Semester deleted." });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/modules", async (req, res) => {
  const value = validateModule(req.body || {});
  if (value.error) return res.status(400).json({ error: "invalid_input", message: value.error });
  try {
    const semester = await Semester.findOne({ _id: value.semesterId, owner: req.user.id });
    if (!semester) return res.status(400).json({ error: "invalid_semester", message: "Choose a semester in your account." });
    const module = await Module.create({
      owner: req.user.id,
      semester: semester.id,
      name: value.name,
      code: value.code,
      credits: value.credits,
      isGpa: value.isGpa,
      grade: value.grade
    });
    return res.status(201).json({ module: moduleJson(module) });
  } catch (error) {
    return handleError(res, error);
  }
});

router.put("/modules/:id", recordId, async (req, res) => {
  const value = validateModule(req.body || {});
  if (value.error) return res.status(400).json({ error: "invalid_input", message: value.error });
  try {
    const semester = await Semester.findOne({ _id: value.semesterId, owner: req.user.id });
    if (!semester) return res.status(400).json({ error: "invalid_semester", message: "Choose a semester in your account." });
    const module = await Module.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },
      {
        semester: semester.id,
        name: value.name,
        code: value.code,
        credits: value.credits,
        isGpa: value.isGpa,
        grade: value.grade
      },
      { new: true, runValidators: true }
    );
    if (!module) return res.status(404).json({ error: "not_found", message: "Module not found." });
    return res.json({ module: moduleJson(module) });
  } catch (error) {
    return handleError(res, error);
  }
});

router.delete("/modules/:id", recordId, async (req, res) => {
  try {
    const module = await Module.findOne({ _id: req.params.id, owner: req.user.id });
    if (!module) return res.status(404).json({ error: "not_found", message: "Module not found." });
    if (await Task.exists({ owner: req.user.id, module: module.id })) {
      return res.status(409).json({
        error: "module_has_tasks",
        message: "Delete or reassign this module’s tasks before deleting the module."
      });
    }
    if (await StudySession.exists({ owner: req.user.id, module: module.id })) {
      return res.status(409).json({
        error: "module_has_study_sessions",
        message: "Delete or reassign this module’s study sessions before deleting the module."
      });
    }
    await module.deleteOne();
    return res.json({ message: "Module and its saved grade deleted." });
  } catch (error) {
    return handleError(res, error);
  }
});

module.exports = router;
