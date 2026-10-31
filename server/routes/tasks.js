const express = require("express");
const mongoose = require("mongoose");
const Module = require("../models/Module");
const Task = require("../models/Task");
const { databaseUnavailable, requireUser, sendDatabaseUnavailable } = require("../middleware/auth");

const router = express.Router();
const taskTypes = new Set(["Assignment", "Project", "Exam", "Quiz", "Study"]);
const priorities = new Set(["Low", "Medium", "High"]);
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(value) {
  if (typeof value !== "string" || !datePattern.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function taskJson(task) {
  return {
    id: task.id,
    title: task.title,
    moduleId: String(task.module),
    type: task.type,
    priority: task.priority,
    date: task.date,
    done: task.done,
    completedAt: task.completedAt || null,
    notes: task.notes
  };
}

function handleError(res, error) {
  if (databaseUnavailable(error)) return sendDatabaseUnavailable(res);
  if (error?.name === "ValidationError" || error?.name === "CastError") {
    return res.status(400).json({ error: "invalid_input", message: "Check the submitted task details." });
  }
  console.error(`Tasks request failed (${error?.name || "Error"}).`);
  return res.status(500).json({ error: "internal_error", message: "The request could not be completed." });
}

function recordId(req, res, next) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: "invalid_id", message: "The requested task ID is invalid." });
  }
  return next();
}

function validateTask(body) {
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const moduleId = body?.moduleId;
  const type = body?.type;
  const priority = body?.priority;
  const date = body?.date;
  const done = body?.done;
  const completedAt = body?.completedAt ?? null;
  const notes = body?.notes === undefined ? "" : body.notes;

  if (!title || title.length > 120) return { error: "Task title is required and must be 120 characters or fewer." };
  if (typeof moduleId !== "string" || !mongoose.isValidObjectId(moduleId)) return { error: "Select a valid module." };
  if (!taskTypes.has(type)) return { error: "Select a valid task type." };
  if (!priorities.has(priority)) return { error: "Select a valid priority." };
  if (!isValidDate(date)) return { error: "Enter a valid due date." };
  if (typeof done !== "boolean") return { error: "Select a valid task status." };
  if (done && !isValidDate(completedAt)) return { error: "A completed task needs a valid completion date." };
  if (!done && completedAt !== null) return { error: "An unfinished task cannot have a completion date." };
  if (typeof notes !== "string" || notes.length > 2000) return { error: "Task notes must be 2000 characters or fewer." };
  return { title, moduleId, type, priority, date, done, completedAt, notes: notes.trim() };
}

async function findOwnedModule(moduleId, owner) {
  return Module.findOne({ _id: moduleId, owner });
}

router.use(requireUser);

router.get("/", async (req, res) => {
  try {
    const tasks = await Task.find({ owner: req.user.id }).sort({ date: 1, _id: 1 });
    return res.json({ tasks: tasks.map(taskJson) });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/", async (req, res) => {
  const value = validateTask(req.body || {});
  if (value.error) return res.status(400).json({ error: "invalid_input", message: value.error });
  try {
    const module = await findOwnedModule(value.moduleId, req.user.id);
    if (!module) return res.status(400).json({ error: "invalid_module", message: "Choose a module in your account." });
    const task = await Task.create({
      owner: req.user.id,
      module: module.id,
      title: value.title,
      type: value.type,
      priority: value.priority,
      date: value.date,
      done: value.done,
      completedAt: value.done ? value.completedAt : undefined,
      notes: value.notes
    });
    return res.status(201).json({ task: taskJson(task) });
  } catch (error) {
    return handleError(res, error);
  }
});

router.put("/:id", recordId, async (req, res) => {
  const value = validateTask(req.body || {});
  if (value.error) return res.status(400).json({ error: "invalid_input", message: value.error });
  try {
    const module = await findOwnedModule(value.moduleId, req.user.id);
    if (!module) return res.status(400).json({ error: "invalid_module", message: "Choose a module in your account." });
    const set = {
      module: module.id,
      title: value.title,
      type: value.type,
      priority: value.priority,
      date: value.date,
      done: value.done,
      notes: value.notes
    };
    const update = { $set: set };
    if (value.done) set.completedAt = value.completedAt;
    else update.$unset = { completedAt: 1 };
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },
      update,
      { new: true, runValidators: true }
    );
    if (!task) return res.status(404).json({ error: "not_found", message: "Task not found." });
    return res.json({ task: taskJson(task) });
  } catch (error) {
    return handleError(res, error);
  }
});

router.patch("/:id/completion", recordId, async (req, res) => {
  const { done, completedAt } = req.body || {};
  if (typeof done !== "boolean") return res.status(400).json({ error: "invalid_input", message: "Select a valid task status." });
  if (done && !isValidDate(completedAt)) {
    return res.status(400).json({ error: "invalid_input", message: "A completed task needs a valid completion date." });
  }
  if (!done && completedAt !== null) {
    return res.status(400).json({ error: "invalid_input", message: "An unfinished task cannot have a completion date." });
  }
  try {
    const update = { $set: { done } };
    if (done) update.$set.completedAt = completedAt;
    else update.$unset = { completedAt: 1 };
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },
      update,
      { new: true, runValidators: true }
    );
    if (!task) return res.status(404).json({ error: "not_found", message: "Task not found." });
    return res.json({ task: taskJson(task) });
  } catch (error) {
    return handleError(res, error);
  }
});

router.delete("/:id", recordId, async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
    if (!task) return res.status(404).json({ error: "not_found", message: "Task not found." });
    return res.json({ message: "Task deleted." });
  } catch (error) {
    return handleError(res, error);
  }
});

module.exports = router;
