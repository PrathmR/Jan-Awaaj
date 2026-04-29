const mongoose = require("mongoose");

const UPDATE_STATUSES = [
  "new",
  "acknowledged",
  "assigned",
  "in_progress",
  "resolved",
];

const ACTION_TYPES = [
  // Authority actions
  "INSPECTION",
  "NOTICE_ISSUED",
  "PAYMENT_CONFIRMED",
  "REPAIR_COMPLETED",
  "FORWARDED",
  "OTHER",
  // NGO actions
  "COUNSELLING",
  "LEGAL_SUPPORT",
  "FIELD_VISIT",
  "ESCALATION",
  "REFERRAL",
  "COMMUNITY_MEETING",
  "AWARENESS_CAMPAIGN",
];

const complaintUpdateSchema = new mongoose.Schema(
  {
    status: { type: String, enum: UPDATE_STATUSES, required: true },
    note: { type: String, default: "" },
    proofUrl: { type: String, default: "" },
    actorType: {
      type: String,
      enum: ["system", "citizen", "authority", "ngo"],
      default: "system",
    },
    actorId: { type: String, default: "" },
  },
  { _id: false, timestamps: { createdAt: true, updatedAt: false } }
);

const actionAttachmentSchema = new mongoose.Schema(
  {
    fileUrl: { type: String, required: true, trim: true },
    proofType: { type: String, default: "PHOTO", trim: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const complaintActionSchema = new mongoose.Schema(
  {
    actionType: { type: String, enum: ACTION_TYPES, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    // Source: who performed this action?
    source: {
      type: String,
      enum: ["AUTHORITY", "NGO", "CSR", "SYSTEM"],
      default: "AUTHORITY",
    },
    // Organization that performed this action (for NGO/CSR actions)
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", default: null },
    organizationName: { type: String, default: "", trim: true },
    // Keep both so we can record either JWT user identity or API-key based actor label.
    takenByUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    takenByLabel: { type: String, default: "", trim: true },
    takenAt: { type: Date, default: Date.now },
    attachments: { type: [actionAttachmentSchema], default: [] },
  },
  { _id: true }
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
    actions: { type: [complaintActionSchema], default: [] },
    sharePublic: { type: Boolean, default: false },

    // ─── NGO/CSR Organization targeting ───────────────────────────────
    targetOrganizations: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
    }],
    primaryChannel: {
      type: String,
      enum: ["GOVERNMENT", "NGO", "BOTH"],
      default: "GOVERNMENT",
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = {
  Complaint: mongoose.model("Complaint", complaintSchema),
  UPDATE_STATUSES,
  ACTION_TYPES,
};
