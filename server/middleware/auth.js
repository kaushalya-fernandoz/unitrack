const jwt = require("jsonwebtoken");
const User = require("../models/User");

const cookieName = "unitrack_session";
const sessionDurationMs = 7 * 24 * 60 * 60 * 1000;

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" || process.env.VERCEL === "1",
    // The browser calls the API through the frontend's same-origin Vercel rewrite.
    sameSite: "lax",
    path: "/"
  };
}

function sendDatabaseUnavailable(res) {
  return res.status(503).json({
    error: "database_unavailable",
    message: "The service is temporarily unavailable. Please try again."
  });
}

function databaseUnavailable(error) {
  return User.db.readyState !== 1
    || error?.name === "MongooseServerSelectionError"
    || error?.name === "MongoNetworkError";
}

function publicUser(user) {
  return {
    id: user.id,
    fullName: user.fullName,
    university: user.university,
    degree: user.degree,
    email: user.email,
    academicYear: user.academicYear ?? null
  };
}

function setSessionCookie(res, user) {
  const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });
  res.cookie(cookieName, token, { ...cookieOptions(), maxAge: sessionDurationMs });
}

function clearSessionCookie(res) {
  res.clearCookie(cookieName, cookieOptions());
}

async function requireUser(req, res, next) {
  const token = req.cookies?.[cookieName];
  if (!token) return res.status(401).json({ error: "unauthorized", message: "Please log in to continue." });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (typeof payload !== "object" || typeof payload.sub !== "string") {
      clearSessionCookie(res);
      return res.status(401).json({ error: "unauthorized", message: "Please log in to continue." });
    }
    const user = await User.findById(payload.sub);
    if (!user) {
      clearSessionCookie(res);
      return res.status(401).json({ error: "unauthorized", message: "Please log in to continue." });
    }
    req.user = user;
    return next();
  } catch (error) {
    if (databaseUnavailable(error)) return sendDatabaseUnavailable(res);
    clearSessionCookie(res);
    return res.status(401).json({ error: "unauthorized", message: "Please log in to continue." });
  }
}

module.exports = {
  cookieName,
  clearSessionCookie,
  databaseUnavailable,
  publicUser,
  requireUser,
  sendDatabaseUnavailable,
  setSessionCookie
};
