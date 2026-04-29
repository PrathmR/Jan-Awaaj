const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    phone: { type: String, index: true, default: "" },
    role: { type: String, enum: ["authority"], default: "authority" },
    departmentId: { type: String, default: "" },
    passwordHash: { type: String, default: "" },
    // MVP: authorities authenticate using JWT (register/login) or a shared API key (x-api-key).
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = {
  User: mongoose.model("User", userSchema),
};

