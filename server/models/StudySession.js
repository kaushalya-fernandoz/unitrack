const mongoose = require("mongoose");

const studySessionSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  module: { type: mongoose.Schema.Types.ObjectId, ref: "Module", required: true, index: true },
  date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  seconds: { type: Number, required: true, min: 1, max: 86400 },
  notes: { type: String, trim: true, maxlength: 2000, default: "" },
  requestId: { type: String, required: true, trim: true, maxlength: 128 }
}, { timestamps: true });

studySessionSchema.index({ owner: 1, requestId: 1 }, { unique: true });
studySessionSchema.index({ owner: 1, date: 1 });
studySessionSchema.index({ owner: 1, module: 1 });

module.exports = mongoose.models.StudySession || mongoose.model("StudySession", studySessionSchema);
