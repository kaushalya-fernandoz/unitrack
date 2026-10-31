const mongoose = require("mongoose");

const semesterSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 70 },
  start: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  end: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ }
}, { timestamps: true });

semesterSchema.index({ owner: 1, name: 1 }, { unique: true, collation: { locale: "en", strength: 2 } });

module.exports = mongoose.models.Semester || mongoose.model("Semester", semesterSchema);
