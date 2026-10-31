const express = require("express");
const mongoose = require("mongoose");
const Module = require("../models/Module");
const StudySession = require("../models/StudySession");
const User = require("../models/User");
const { databaseUnavailable, requireUser, sendDatabaseUnavailable } = require("../middleware/auth");

const router = express.Router();
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const requestIdPattern = /^[A-Za-z0-9._:-]{1,128}$/;

function isValidDate(value) {
  if (typeof value !== "string" || !datePattern.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function sessionJson(session) {
  return {
    id: session.id,
    moduleId: String(session.module),
    date: session.date,
    seconds: session.seconds,
    notes: session.notes || ""
  };
}

function handleError(res, error) {
  if (databaseUnavailable(error)) return sendDatabaseUnavailable(res);
  if (error?.code === 11000) {
    return res.status(409).json({ error: "duplicate_request", message: "This session request has already been saved." });
  }
  if (error?.name === "ValidationError" || error?.name === "CastError") {
    return res.status(400).json({ error: "invalid_input", message: "Check the submitted study details." });
  }
  console.error(`Study request failed (${error?.name || "Error"}).`);
  return res.status(500).json({ error: "internal_error", message: "The request could not be completed." });
}

function recordId(req, res, next) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: "invalid_id", message: "The requested session ID is invalid." });
  }
  return next();
}

function validateSession(body, { creating = false } = {}) {
  const moduleId = body?.moduleId;
  const date = body?.date;
  const seconds = body?.seconds;
  const notes = body?.notes === undefined ? "" : body.notes;
  const requestId = body?.requestId;

  if (typeof moduleId !== "string" || !mongoose.isValidObjectId(moduleId)) return { error: "Select a valid module." };
  if (!isValidDate(date)) return { error: "Enter a valid study date." };
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || !Number.isInteger(seconds) || seconds < 1 || seconds > 86400) {
    return { error: "Duration must be a positive whole number of seconds, up to 24 hours." };
  }
  if (typeof notes !== "string" || notes.length > 2000) return { error: "Study notes must be 2000 characters or fewer." };
  if (creating && (typeof requestId !== "string" || !requestIdPattern.test(requestId))) {
    return { error: "A valid unique session request ID is required." };
  }
  return { moduleId, date, seconds, notes: notes.trim(), ...(creating ? { requestId } : {}) };
}

router.use(requireUser);

router.get("/", async (req, res) => {
  try {
    const [sessions, user] = await Promise.all([
      StudySession.find({ owner: req.user.id }).sort({ date: -1, createdAt: -1, _id: -1 }),
      User.findById(req.user.id).select("dailyStudyGoal")
    ]);
    return res.json({
      sessions: sessions.map(sessionJson),
      goal: user?.dailyStudyGoal ?? null
    });
  } catch (error) {
    return handleError(res, error);
  }
});

router.put("/goal", async (req, res) => {
  const goal = req.body?.goal;
  if (typeof goal !== "number" || !Number.isInteger(goal) || goal < 1 || goal > 1440) {
    return res.status(400).json({ error: "invalid_input", message: "Daily study goal must be a whole number from 1 to 1440 minutes." });
  }
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { dailyStudyGoal: goal } },
      { new: true, runValidators: true }
    ).select("dailyStudyGoal");
    if (!user) return res.status(401).json({ error: "unauthorized", message: "Please log in to continue." });
    return res.json({ goal: user.dailyStudyGoal });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/sessions", async (req, res) => {
  const value = validateSession(req.body || {}, { creating: true });
  if (value.error) return res.status(400).json({ error: "invalid_input", message: value.error });
  try {
    const existing = await StudySession.findOne({ owner: req.user.id, requestId: value.requestId });
    if (existing) return res.json({ session: sessionJson(existing), duplicate: true });

    const module = await Module.findOne({ _id: value.moduleId, owner: req.user.id });
    if (!module) return res.status(400).json({ error: "invalid_module", message: "Choose a module in your account." });

    const session = await StudySession.create({
      owner: req.user.id,
      module: module.id,
      date: value.date,
      seconds: value.seconds,
      notes: value.notes,
      requestId: value.requestId
    });
    return res.status(201).json({ session: sessionJson(session), duplicate: false });
  } catch (error) {
    if (error?.code === 11000) {
      try {
        const existing = await StudySession.findOne({ owner: req.user.id, requestId: value.requestId });
        if (existing) return res.json({ session: sessionJson(existing), duplicate: true });
      } catch (lookupError) {
        return handleError(res, lookupError);
      }
    }
    return handleError(res, error);
  }
});

router.put("/sessions/:id", recordId, async (req, res) => {
  const value = validateSession(req.body || {});
  if (value.error) return res.status(400).json({ error: "invalid_input", message: value.error });
  try {
    const module = await Module.findOne({ _id: value.moduleId, owner: req.user.id });
    if (!module) return res.status(400).json({ error: "invalid_module", message: "Choose a module in your account." });
    const session = await StudySession.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },
      { module: module.id, date: value.date, seconds: value.seconds, notes: value.notes },
      { new: true, runValidators: true }
    );
    if (!session) return res.status(404).json({ error: "not_found", message: "Study session not found." });
    return res.json({ session: sessionJson(session) });
  } catch (error) {
    return handleError(res, error);
  }
});

router.delete("/sessions/:id", recordId, async (req, res) => {
  try {
    const session = await StudySession.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
    if (!session) return res.status(404).json({ error: "not_found", message: "Study session not found." });
    return res.json({ message: "Study session deleted." });
  } catch (error) {
    return handleError(res, error);
  }
});

module.exports = router;
