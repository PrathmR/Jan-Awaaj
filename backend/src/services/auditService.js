const { AuditEvent } = require("../models/AuditEvent");
const { Complaint } = require("../models/Complaint");
const { computeAuditHash } = require("../utils/auditHash");

/**
 * Appends a hash-linked audit event for a complaint.
 * This creates a simple tamper-evident ledger: changing old records breaks downstream hashes.
 */
async function recordAuditEvent({ complaintId, type, payload }) {
  const complaint = await Complaint.findOne({ complaintId }).select("_id complaintId");
  if (!complaint) {
    const err = new Error("Complaint not found for audit event");
    err.statusCode = 404;
    throw err;
  }

  const previousEvent = await AuditEvent.findOne({ complaint: complaint._id })
    .sort({ createdAt: -1, _id: -1 })
    .select("currentHash")
    .lean();

  const previousHash = previousEvent?.currentHash || null;
  const createdAt = new Date();
  const currentHash = computeAuditHash({
    complaintId: complaint.complaintId,
    type,
    payload,
    previousHash,
    createdAt,
  });

  return AuditEvent.create({
    complaint: complaint._id,
    type,
    payload,
    previousHash,
    currentHash,
    createdAt,
  });
}

module.exports = {
  recordAuditEvent,
};
