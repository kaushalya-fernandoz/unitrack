const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  module: { type: mongoose.Schema.Types.ObjectId, ref: "Module", required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  type: { type: String, required: true, enum: ["Assignment", "Project", "Exam", "Quiz", "Study"] },
  priority: { type: String, required: true, enum: ["Low", "Medium", "High"], default: "Medium" },
  date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  done: { type: Boolean, default: false },
  completedAt: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
  notes: { type: String, trim: true, maxlength: 2000, default: "" }
}, { timestamps: true });

taskSchema.index({ owner: 1, date: 1 });
taskSchema.index({ owner: 1, module: 1 });

module.exports = mongoose.models.Task || mongoose.model("Task", taskSchema);
