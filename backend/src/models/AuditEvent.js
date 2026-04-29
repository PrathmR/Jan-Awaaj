const mongoose = require("mongoose");

const auditEventSchema = new mongoose.Schema(
  {
    complaint: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Complaint",
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    previousHash: {
      type: String,
      default: null,
    },
    currentHash: {
      type: String,
      required: true,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { versionKey: false }
);

auditEventSchema.index({ complaint: 1, createdAt: -1, _id: -1 });

module.exports = {
  AuditEvent: mongoose.model("AuditEvent", auditEventSchema),
};
