const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, index: true, sparse: true },
    phone: { type: String, index: true, default: "" },
    name: { type: String, default: "", trim: true },
    role: {
      type: String,
      enum: ["authority", "ngo_officer", "csr_viewer", "admin"],
      default: "authority",
      index: true,
    },
    departmentId: { type: String, default: "" },
    // Links NGO officers and CSR viewers to their organization
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      default: null,
    },
    passwordHash: { type: String, default: "" },
    isVerified: { type: Boolean, default: false },
    verificationCode: { type: String, default: null },
    verificationCodeExpires: { type: Date, default: null },
    // MVP: authorities authenticate using JWT (register/login) or a shared API key (x-api-key).
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = {
  User: mongoose.model("User", userSchema),
};
