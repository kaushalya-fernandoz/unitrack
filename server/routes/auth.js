const express = require("express");
const rateLimit = require("express-rate-limit");
const User = require("../models/User");
const {
  clearSessionCookie,
  databaseUnavailable,
  publicUser,
  requireUser,
  sendDatabaseUnavailable,
  setSessionCookie
} = require("../middleware/auth");

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "rate_limited", message: "Too many attempts. Please try again later." }
});

function validEmail(value) {
  return typeof value === "string"
    && value.length <= 254
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function validateProfile(body, { registration = false } = {}) {
  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
  const university = typeof body.university === "string" ? body.university.trim() : "";
  const degree = typeof body.degree === "string" ? body.degree.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const yearValue = body.academicYear;
  const hasYear = yearValue !== undefined && yearValue !== null && yearValue !== "";
  const academicYear = hasYear ? Number(yearValue) : undefined;

  if (!fullName || fullName.length > 80) return { error: "Full name is required and must be 80 characters or fewer." };
  if (!university || university.length > 120) return { error: "University is required and must be 120 characters or fewer." };
  if (!degree || degree.length > 120) return { error: "Degree is required and must be 120 characters or fewer." };
  if (!validEmail(email)) return { error: "Enter a valid email address." };
  if (hasYear && (!Number.isInteger(academicYear) || academicYear < 1 || academicYear > 8)) {
    return { error: "Academic year must be a whole number from 1 to 8." };
  }
  if (!registration && (Object.hasOwn(body, "password") || Object.hasOwn(body, "passwordHash"))) {
    return { error: "Password cannot be changed through profile updates." };
  }
  return { fullName, university, degree, email, academicYear };
}

function databaseGuard(_req, res, next) {
  if (User.db.readyState !== 1) return sendDatabaseUnavailable(res);
  return next();
}

function handleDatabaseError(res, error) {
  if (databaseUnavailable(error)) return sendDatabaseUnavailable(res);
  if (error?.code === 11000) {
    return res.status(409).json({ error: "email_exists", message: "An account with this email already exists." });
  }
  if (error?.name === "ValidationError") {
    return res.status(400).json({ error: "invalid_input", message: "Check the submitted account details." });
  }
  console.error(`Authentication request failed (${error?.name || "Error"}).`);
  return res.status(500).json({ error: "internal_error", message: "The request could not be completed." });
}

router.post("/register", authLimiter, databaseGuard, async (req, res) => {
  const profile = validateProfile(req.body || {}, { registration: true });
  const password = req.body?.password;
  if (profile.error) return res.status(400).json({ error: "invalid_input", message: profile.error });
  if (typeof password !== "string" || Buffer.byteLength(password, "utf8") < 8 || Buffer.byteLength(password, "utf8") > 72) {
    return res.status(400).json({ error: "invalid_input", message: "Password must be between 8 and 72 bytes." });
  }

  try {
    const user = new User({ ...profile, passwordHash: password });
    await user.save();
    setSessionCookie(res, user);
    return res.status(201).json({ user: publicUser(user) });
  } catch (error) {
    return handleDatabaseError(res, error);
  }
});

router.post("/login", authLimiter, databaseGuard, async (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = req.body?.password;
  if (!validEmail(email) || typeof password !== "string" || !password.length || Buffer.byteLength(password, "utf8") > 72) {
    return res.status(400).json({ error: "invalid_input", message: "Enter a valid email address and password." });
  }

  try {
    const user = await User.findOne({ email }).select("+passwordHash");
    if (!user || !(await user.verifyPassword(password))) {
      return res.status(401).json({ error: "invalid_credentials", message: "Email or password is incorrect." });
    }
    setSessionCookie(res, user);
    return res.json({ user: publicUser(user) });
  } catch (error) {
    return handleDatabaseError(res, error);
  }
});

router.post("/logout", (req, res) => {
  clearSessionCookie(res);
  return res.json({ message: "Logged out." });
});

router.get("/me", databaseGuard, requireUser, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

router.put("/profile", databaseGuard, requireUser, async (req, res) => {
  const profile = validateProfile(req.body || {});
  if (profile.error) return res.status(400).json({ error: "invalid_input", message: profile.error });

  try {
    req.user.fullName = profile.fullName;
    req.user.university = profile.university;
    req.user.degree = profile.degree;
    req.user.email = profile.email;
    req.user.academicYear = profile.academicYear;
    await req.user.save();
    return res.json({ user: publicUser(req.user) });
  } catch (error) {
    return handleDatabaseError(res, error);
  }
});

module.exports = router;
