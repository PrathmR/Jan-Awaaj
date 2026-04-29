const express = require("express");
const { z } = require("zod");
const { Complaint, ACTION_TYPES } = require("../models/Complaint");
const { requireNgo } = require("../middleware/requireNgo");
const { recordAuditEvent } = require("../services/auditService");

const router = express.Router();

// All NGO routes require NGO officer authentication
router.use(requireNgo);

// ─── List complaints targeted to this NGO ───────────────────────────────────
router.get("/complaints", async (req, res, next) => {
  try {
    const { status, category } = req.query;
    const filter = { targetOrganizations: req.ngoOfficer.organizationId };
    if (status) filter.status = String(status);
    if (category) filter.category = String(category);

    const complaints = await Complaint.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    return res.json({ complaints });
  } catch (e) {
    return next(e);
  }
});

// ─── Get single complaint detail ────────────────────────────────────────────
router.get("/complaints/:complaintId", async (req, res, next) => {
  try {
    const complaint = await Complaint.findOne({
      complaintId: req.params.complaintId,
      targetOrganizations: req.ngoOfficer.organizationId,
    }).lean();

    if (!complaint) return res.status(404).json({ error: "Complaint not found or not assigned to your organization" });
    return res.json({ complaint });
  } catch (e) {
    return next(e);
  }
});

// ─── Add NGO action to a complaint ──────────────────────────────────────────
const NGO_ACTION_TYPES = [
  "COUNSELLING",
  "LEGAL_SUPPORT",
  "FIELD_VISIT",
  "ESCALATION",
  "REFERRAL",
  "COMMUNITY_MEETING",
  "AWARENESS_CAMPAIGN",
  "OTHER",
];

const ngoActionSchema = z.object({
  actionType: z.enum(NGO_ACTION_TYPES),
  title: z.string().trim().min(2).max(140),
  description: z.string().trim().max(2000).optional().default(""),
});

router.post("/complaints/:complaintId/actions", async (req, res, next) => {
  try {
    const parsed = ngoActionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid action payload" });
    }

    const complaint = await Complaint.findOne({
      complaintId: req.params.complaintId,
      targetOrganizations: req.ngoOfficer.organizationId,
    });

    if (!complaint) return res.status(404).json({ error: "Not found or not assigned to your organization" });

    const actionDoc = {
      actionType: parsed.data.actionType,
      title: parsed.data.title,
      description: parsed.data.description,
      source: "NGO",
      organizationId: req.ngoOfficer.organizationId,
      organizationName: req.ngoOfficer.orgName,
      takenByLabel: `${req.ngoOfficer.name} (${req.ngoOfficer.orgName})`,
      attachments: [],
    };

    complaint.actions.push(actionDoc);

    // Also add an update entry so the citizen's timeline shows NGO involvement
    complaint.updates.push({
      status: complaint.status, // keep current status
      note: `NGO Action: ${parsed.data.title} — ${req.ngoOfficer.orgName}`,
      actorType: "ngo",
      actorId: req.ngoOfficer.orgId,
    });

    await complaint.save();

    await recordAuditEvent({
      complaintId: complaint.complaintId,
      type: "NGO_ACTION_ADDED",
      payload: {
        actionType: parsed.data.actionType,
        title: parsed.data.title,
        orgName: req.ngoOfficer.orgName,
        takenBy: req.ngoOfficer.name,
      },
    });

    return res.json({ complaint });
  } catch (e) {
    return next(e);
  }
});

// ─── Dashboard stats for the NGO officer ────────────────────────────────────
router.get("/stats", async (req, res, next) => {
  try {
    const orgId = req.ngoOfficer.organizationId;
    const complaints = await Complaint.find({ targetOrganizations: orgId })
      .select("status category actions createdAt")
      .lean();

    const total = complaints.length;
    const newCount = complaints.filter((c) => c.status === "new").length;
    const inProgress = complaints.filter((c) => ["acknowledged", "assigned", "in_progress"].includes(c.status)).length;
    const resolved = complaints.filter((c) => c.status === "resolved").length;
    const ngoActions = complaints.reduce(
      (sum, c) => sum + (c.actions || []).filter((a) => a.source === "NGO").length,
      0
    );

    return res.json({
      stats: {
        total,
        new: newCount,
        inProgress,
        resolved,
        ngoActionsCount: ngoActions,
      },
    });
  } catch (e) {
    return next(e);
  }
});

module.exports = router;
