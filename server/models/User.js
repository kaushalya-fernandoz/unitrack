const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true, maxlength: 80 },
  university: { type: String, required: true, trim: true, maxlength: 120 },
  degree: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254, unique: true },
  academicYear: { type: Number, min: 1, max: 8, default: undefined },
  dailyStudyGoal: { type: Number, min: 1, max: 1440, default: undefined },
  passwordHash: { type: String, required: true, select: false }
}, { timestamps: true });

userSchema.pre("save", async function hashPassword() {
  if (!this.isModified("passwordHash")) return;
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
});

userSchema.methods.verifyPassword = function verifyPassword(password) {
  return bcrypt.compare(password, this.passwordHash);
};

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
