const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const dotenv = require("dotenv");
const fs = require("fs");
const crypto = require("crypto");
const cookieParser = require("cookie-parser");
const { connectToDatabase } = require("./database");
const authRouter = require("./routes/auth");
const academicsRouter = require("./routes/academics");
const tasksRouter = require("./routes/tasks");
const studyRouter = require("./routes/study");

const app = express();
const envPath = path.join(__dirname, ".env");
const runningOnVercel = process.env.VERCEL === "1";
const production = process.env.NODE_ENV === "production" || runningOnVercel;
if (!production) dotenv.config({ path: envPath, override: true });

if (!process.env.JWT_SECRET) {
  if (production) throw new Error("JWT_SECRET must be set in the production environment.");
  const jwtSecret = crypto.randomBytes(64).toString("base64url");
  fs.appendFileSync(envPath, `${fs.existsSync(envPath) && fs.statSync(envPath).size ? "\n" : ""}JWT_SECRET=${jwtSecret}\n`, { mode: 0o600 });
  process.env.JWT_SECRET = jwtSecret;
}

const port = process.env.PORT || 5000;

if (production) app.set("trust proxy", 1);

function allowedOrigins(req) {
  const origins = new Set(
    (process.env.FRONTEND_ORIGIN || "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
  );
  origins.add(`${req.protocol}://${req.get("host")}`);
  if (process.env.NODE_ENV !== "production") {
    origins.add("http://127.0.0.1:5173");
    origins.add("http://localhost:5173");
  }
  return origins;
}

app.use((req, res, next) => {
  const origin = req.get("Origin");
  if (origin && allowedOrigins(req).has(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Access-Control-Allow-Credentials", "true");
    res.vary("Origin");
    if (req.method === "OPTIONS") {
      res.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
      res.set("Access-Control-Allow-Headers", "Content-Type");
      return res.sendStatus(204);
    }
    return next();
  }
  if (origin) return res.status(403).json({ error: "forbidden_origin", message: "This request origin is not allowed." });
  if (req.method === "OPTIONS") return res.sendStatus(403);
  return next();
});

app.use(express.json({ limit: "16kb" }));
app.use(cookieParser());

app.use("/api/auth", (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.get("Origin");
  if (!origin || !allowedOrigins(req).has(origin)) {
    return res.status(403).json({ error: "forbidden_origin", message: "This request origin is not allowed." });
  }
  return next();
});

function requireDatabase(_req, res, next) {
  connectToDatabase().then(
    () => next(),
    (error) => {
      console.error(`MongoDB connection unavailable (${error.name || "Error"}): ${redactMongoError(error.message)}`);
      res.status(503).json({
        error: "database_unavailable",
        message: "The service is temporarily unavailable. Please try again."
      });
    }
  );
}

app.use("/api/auth", requireDatabase);
app.use("/api/auth", authRouter);
app.use("/api/academics", (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.get("Origin");
  if (!origin || !allowedOrigins(req).has(origin)) {
    return res.status(403).json({ error: "forbidden_origin", message: "This request origin is not allowed." });
  }
  return next();
});
app.use("/api/academics", requireDatabase);
app.use("/api/academics", academicsRouter);
app.use("/api/tasks", (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.get("Origin");
  if (!origin || !allowedOrigins(req).has(origin)) {
    return res.status(403).json({ error: "forbidden_origin", message: "This request origin is not allowed." });
  }
  return next();
});
app.use("/api/tasks", requireDatabase);
app.use("/api/tasks", tasksRouter);
app.use("/api/study", (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.get("Origin");
  if (!origin || !allowedOrigins(req).has(origin)) {
    return res.status(403).json({ error: "forbidden_origin", message: "This request origin is not allowed." });
  }
  return next();
});
app.use("/api/study", requireDatabase);
app.use("/api/study", studyRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

function redactMongoError(message) {
  return message
    .replace(/mongodb(?:\+srv)?:\/\/[^\s"'<>]+/gi, "mongodb://[REDACTED]")
    .replace(/\b(password|passwd|pwd)\s*[:=]\s*[^,\s]+/gi, "$1=[REDACTED]");
}

app.get("/api/ready", async (_req, res) => {
  try {
    await connectToDatabase();
    return res.status(200).json({ status: "ready", database: "connected" });
  } catch (error) {
    console.error(`MongoDB readiness check failed (${error.name || "Error"}): ${redactMongoError(error.message)}`);
    return res.status(503).json({ status: "not_ready", database: "disconnected" });
  }
});

if (!runningOnVercel) {
  if (process.env.MONGO_URI) {
    connectToDatabase().catch((error) => {
      console.error(`MongoDB connection failed (${error.name || "Error"}): ${redactMongoError(error.message)}`);
    });
  } else {
    console.error("MongoDB connection unavailable: MONGO_URI is not configured.");
  }

  app.listen(port, "127.0.0.1", () => {
    console.log(`UniTrack API listening at http://127.0.0.1:${port}`);
  });
}

module.exports = app;
