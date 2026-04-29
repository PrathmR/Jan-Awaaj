const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { Organization } = require("../models/Organization");
const { Complaint } = require("../models/Complaint");
const { requireAuthority } = require("../middleware/requireAuthority");

const router = express.Router();

// ─── Public: list active organizations ──────────────────────────────────────
router.get("/", async (req, res, next) => {
  try {
    const { type, focusArea } = req.query;
    const filter = { active: true };
    if (type) filter.type = String(type).toUpperCase();
    if (focusArea) filter.focusAreas = { $in: [String(focusArea).toLowerCase()] };

    const orgs = await Organization.find(filter)
      .sort({ name: 1 })
      .select("-__v")
      .limit(100);
    return res.json({ organizations: orgs });
  } catch (e) {
    return next(e);
  }
});

// ─── Public: organization detail ────────────────────────────────────────────
router.get("/:orgId", async (req, res, next) => {
  try {
    const org = await Organization.findOne({ orgId: req.params.orgId });
    if (!org) return res.status(404).json({ error: "Organization not found" });
    return res.json({ organization: org });
  } catch (e) {
    return next(e);
  }
});

// ─── Admin/Authority: create organization ───────────────────────────────────
router.post("/", requireAuthority, async (req, res, next) => {
  try {
    const { name, type, description, website, contactEmail, contactPhone, jurisdictions, focusAreas } = req.body;
    if (!name || !type) {
      return res.status(400).json({ error: "name and type are required" });
    }
    if (!["NGO", "CSR", "GOV_PARTNER"].includes(type)) {
      return res.status(400).json({ error: "type must be NGO, CSR, or GOV_PARTNER" });
    }

    const slug = String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const orgId = uuidv4();

    const org = await Organization.create({
      orgId,
      name: String(name).trim(),
      slug,
      type,
      description: description || "",
      website: website || "",
      contactEmail: contactEmail || "",
      contactPhone: contactPhone || "",
      jurisdictions: Array.isArray(jurisdictions) ? jurisdictions : [],
      focusAreas: Array.isArray(focusAreas) ? focusAreas.map((a) => String(a).toLowerCase()) : [],
    });

    return res.json({ organization: org });
  } catch (e) {
    if (e.code === 11000) {
      return res.status(409).json({ error: "Organization with this name already exists" });
    }
    return next(e);
  }
});

// ─── Public: organization metrics (for CSR dashboards) ──────────────────────
router.get("/:orgId/metrics", async (req, res, next) => {
  try {
    const org = await Organization.findOne({ orgId: req.params.orgId });
    if (!org) return res.status(404).json({ error: "Organization not found" });

    // Count complaints targeted to this org
    const complaints = await Complaint.find({
      targetOrganizations: org._id,
    }).select("status category actions").lean();

    const total = complaints.length;
    const byStatus = {};
    const byCategory = {};
    let ngoActionsCount = 0;

    for (const c of complaints) {
      byStatus[c.status] = (byStatus[c.status] || 0) + 1;
      byCategory[c.category] = (byCategory[c.category] || 0) + 1;
      ngoActionsCount += (c.actions || []).filter((a) => a.source === "NGO").length;
    }

    return res.json({
      orgId: org.orgId,
      orgName: org.name,
      metrics: {
        totalComplaints: total,
        byStatus,
        byCategory,
        ngoActionsCount,
        activeComplaints: total - (byStatus.resolved || 0),
      },
    });
  } catch (e) {
    return next(e);
  }
});

module.exports = router;
