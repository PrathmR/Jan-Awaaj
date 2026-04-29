const mongoose = require("mongoose");

const UPDATE_STATUSES = [
  "new",
  "acknowledged",
  "assigned",
  "in_progress",
  "resolved",
];

const complaintUpdateSchema = new mongoose.Schema(
  {
    status: { type: String, enum: UPDATE_STATUSES, required: true },
    note: { type: String, default: "" },
    proofUrl: { type: String, default: "" },
    actorType: {
      type: String,
      enum: ["system", "citizen", "authority"],
      default: "system",
    },
    actorId: { type: String, default: "" },
  },
  { _id: false, timestamps: { createdAt: true, updatedAt: false } }
);

const complaintSchema = new mongoose.Schema(
  {
    complaintId: { type: String, unique: true, index: true, required: true },
    citizenPhone: { type: String, index: true, default: "" },
    lat: { type: Number, required: true, index: true },
    lon: { type: Number, required: true, index: true },
    category: { type: String, required: true, index: true },
    description: { type: String, required: true, trim: true },
    photoUrl: { type: String, default: "" },
    status: {
      type: String,
      enum: UPDATE_STATUSES,
      default: "new",
      index: true,
    },
    resolvedAt: { type: Date, default: null },
    updates: { type: [complaintUpdateSchema], default: [] },
    sharePublic: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = {
  Complaint: mongoose.model("Complaint", complaintSchema),
  UPDATE_STATUSES,
};

