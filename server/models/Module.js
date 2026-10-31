const mongoose = require("mongoose");

const moduleSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  semester: { type: mongoose.Schema.Types.ObjectId, ref: "Semester", required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 80 },
  code: { type: String, required: true, trim: true, uppercase: true, maxlength: 20 },
  credits: { type: Number, required: true, min: 0, max: 30 },
  isGpa: { type: Boolean, default: true },
  grade: { type: String, enum: ["", "A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "E", "High", "Medium", "Low"], default: "" }
}, { timestamps: true });

moduleSchema.index({ owner: 1, code: 1 }, { unique: true, collation: { locale: "en", strength: 2 } });

module.exports = mongoose.models.Module || mongoose.model("Module", moduleSchema);
