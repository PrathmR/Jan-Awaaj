const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const { z } = require("zod");
const jwt = require("jsonwebtoken");

const { Complaint, UPDATE_STATUSES, ACTION_TYPES } = require("../models/Complaint");
const { Post } = require("../models/Post");
const { AuditEvent } = require("../models/AuditEvent");
const { Organization } = require("../models/Organization");
const { requireAuthority } = require("../middleware/requireAuthority");
const { recordAuditEvent } = require("../services/auditService");

const router = express.Router();

const uploadDir = path.join(__dirname, "..", "..", "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, uploadDir);
  },
  filename: function (_req, file, cb) {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${uuidv4()}-${safe}`);
  },
});

const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB

const complaintIdParamSchema = z.object({
  complaintId: z.string().uuid(),
});

const AUDIT_SENSITIVE_KEYS = new Set([
  "citizenPhone",
  "phone",
  "password",
  "passwordHash",
  "token",
  "authorization",
  "authHeader",
  "xApiKey",
  "apiKey",
  "apiKeyId",
]);

function roundCoord(value) {
  return Math.round(Number(value) * 10000) / 10000;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sanitizeAuditPayload(value) {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeAuditPayload(item));
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const next = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    if (AUDIT_SENSITIVE_KEYS.has(key)) continue;
    next[key] = sanitizeAuditPayload(nestedValue);
  }
  return next;
}

function canViewFullAuditPayload(req) {
  const apiKey = req.headers["x-api-key"];
  if (apiKey && process.env.AUTH_API_KEY && String(apiKey) === String(process.env.AUTH_API_KEY)) {
    return true;
  }

  const authHeader = String(req.headers.authorization || "");
  if (process.env.AUTH_JWT_SECRET && authHeader.toLowerCase().startsWith("bearer ")) {
    try {
      const token = authHeader.slice("bearer ".length);
      const payload = jwt.verify(token, process.env.AUTH_JWT_SECRET);
      return payload?.role === "authority";
    } catch (_e) {
      return false;
    }
  }

  return false;
}

function mapAuditEventForClient(event, { includeSensitivePayload }) {
  return {
    id: String(event._id),
    type: event.type,
    payload: includeSensitivePayload ? event.payload : sanitizeAuditPayload(event.payload),
    createdAt: event.createdAt,
    currentHash: event.currentHash,
    previousHash: event.previousHash || null,
  };
}

const complaintCreateSchema = z.object({
  category: z.string().min(2).max(60),
  description: z.string().min(5).max(2000),
  sharePublic: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((v) => {
      if (v == null) return false;
      return typeof v === "boolean" ? v : String(v).toLowerCase() === "true";
    }),
  citizenPhone: z.string().optional().default(""),
  lat: z
    .union([z.string(), z.number()])
    .transform((v) => Number(v))
    .refine((n) => Number.isFinite(n) && n >= -90 && n <= 90),
  lon: z
    .union([z.string(), z.number()])
    .transform((v) => Number(v))
    .refine((n) => Number.isFinite(n) && n >= -180 && n <= 180),
});

const actionPayloadSchema = z.object({
  actionType: z.enum(ACTION_TYPES),
  title: z.string().trim().min(2).max(140),
  description: z.string().trim().max(2000).optional().default(""),
  attachments: z
    .array(
      z.object({
        fileUrl: z.string().trim().min(1),
        proofType: z.string().trim().min(1).max(40).optional().default("PHOTO"),
      })
    )
    .optional()
    .default([]),
});

function parseActionInput(rawAction) {
  if (rawAction == null) return { value: null };
  if (typeof rawAction === "string") {
    try {
      return { value: JSON.parse(rawAction) };
    } catch (_e) {
      return { error: "Invalid action payload" };
    }
  }
  if (typeof rawAction === "object") return { value: rawAction };
  return { error: "Invalid action payload" };
}

router.post("/", upload.single("photo"), async (req, res, next) => {
  try {
    const parsed = complaintCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      const e = parsed.error.flatten();
      const msg = Object.values(e.fieldErrors).flat()[0] || e.formErrors[0] || "Invalid input parameters";
      return res.status(400).json({ error: msg });
    }

    const complaintId = uuidv4();
    const photoUrl = req.file ? `/uploads/${req.file.filename}` : (req.body.photoUrl || "");

    // ── Org targeting (optional) ──
    let targetOrganizations = [];
    let primaryChannel = "GOVERNMENT";
    const rawOrgId = req.body.targetOrganizationId;
    const rawChannel = req.body.primaryChannel;
    if (rawOrgId) {
      const org = await Organization.findOne({ orgId: String(rawOrgId), active: true });
      if (org) {
        targetOrganizations = [org._id];
        primaryChannel = rawChannel && ["GOVERNMENT", "NGO", "BOTH"].includes(String(rawChannel).toUpperCase())
          ? String(rawChannel).toUpperCase()
          : "NGO";
      }
    } else if (rawChannel) {
      primaryChannel = ["GOVERNMENT", "NGO", "BOTH"].includes(String(rawChannel).toUpperCase())
        ? String(rawChannel).toUpperCase()
        : "GOVERNMENT";
    }

    const complaint = await Complaint.create({
      complaintId,
      citizenPhone: parsed.data.citizenPhone || "",
      lat: parsed.data.lat,
      lon: parsed.data.lon,
      category: parsed.data.category,
      description: parsed.data.description,
      photoUrl,
      sharePublic: parsed.data.sharePublic,
      status: "new",
      targetOrganizations,
      primaryChannel,
      updates: [
        {
          status: "new",
          note: targetOrganizations.length > 0 ? "Complaint shared with NGO partner" : "",
          proofUrl: "",
          actorType: "system",
          actorId: "",
        },
      ],
    });

    await recordAuditEvent({
      complaintId: complaint.complaintId,
      type: "COMPLAINT_CREATED",
      payload: {
        category: complaint.category,
        location: {
          lat: roundCoord(complaint.lat),
          lon: roundCoord(complaint.lon),
        },
        sharePublic: complaint.sharePublic === true,
        anonymousMode: !complaint.citizenPhone,
        status: complaint.status,
        photoUrl: complaint.photoUrl || "",
      },
    });

    let postId = null;
    if (parsed.data.sharePublic) {
      const post = await Post.create({
        postId: uuidv4(),
        complaintId: complaint.complaintId,
        text: complaint.description,
        photoUrl: complaint.photoUrl,
        location: { type: "Point", coordinates: [complaint.lon, complaint.lat] },
        voteCounts: { up: 0, down: 0 },
        comments: [],
        createdAt: new Date(),
      });
      postId = post.postId;
    }

    return res.json({
      complaintId: complaint.complaintId,
      ackMessage: "Your complaint has been received.",
      postId,
    });
  } catch (e) {
    return next(e);
  }
});

router.get("/", requireAuthority, async (req, res, next) => {
  try {
    const { status, category, createdAfter } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = String(category);
    if (createdAfter) filter.createdAt = { $gte: new Date(String(createdAfter)) };

    const complaints = await Complaint.find(filter).sort({ createdAt: -1 }).limit(200);
    return res.json({ complaints });
  } catch (e) {
    return next(e);
  }
});

router.get("/:complaintId/audit", async (req, res) => {
  const parsedParams = complaintIdParamSchema.safeParse(req.params);
  if (!parsedParams.success) {
    return res.status(400).json({ error: "Invalid complaintId" });
  }

  try {
    const complaint = await Complaint.findOne({ complaintId: parsedParams.data.complaintId }).select("_id");
    if (!complaint) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    const includeSensitivePayload = canViewFullAuditPayload(req);
    const events = await AuditEvent.find({ complaint: complaint._id })
      .sort({ createdAt: 1, _id: 1 })
      .select("_id type payload createdAt currentHash previousHash")
      .lean();

    return res.json(events.map((event) => mapAuditEventForClient(event, { includeSensitivePayload })));
  } catch (_e) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/:complaintId", async (req, res, next) => {
  try {
    const { complaintId } = req.params;
    const complaint = await Complaint.findOne({ complaintId });
    if (!complaint) return res.status(404).json({ error: "Not found" });
    return res.json({ complaint });
  } catch (e) {
    return next(e);
  }
});

router.put("/:complaintId", upload.single("proof"), requireAuthority, async (req, res, next) => {
  try {
    const { complaintId } = req.params;
    const statusInput = req.body.status;
    const hasStatusInput = statusInput != null && String(statusInput).trim() !== "";
    const statusRaw = hasStatusInput ? String(statusInput).trim().toLowerCase() : "";
    if (hasStatusInput && !UPDATE_STATUSES.includes(statusRaw)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const parsedActionInput = parseActionInput(req.body.action);
    if (parsedActionInput.error) {
      return res.status(400).json({ error: parsedActionInput.error });
    }
    const hasActionInput = Boolean(parsedActionInput.value);
    if (!hasStatusInput && !hasActionInput) {
      return res.status(400).json({ error: "Provide status or action" });
    }

    const note = String(req.body.note || "");
    const proofUrl = req.file ? `/uploads/${req.file.filename}` : (req.body.proofUrl || "");

    const complaint = await Complaint.findOne({ complaintId });
    if (!complaint) return res.status(404).json({ error: "Not found" });
    const oldStatus = complaint.status;

    if (hasStatusInput) {
      complaint.status = statusRaw;
      if (statusRaw === "resolved") complaint.resolvedAt = new Date();

      complaint.updates.push({
        status: statusRaw,
        note,
        proofUrl,
        actorType: "authority",
        actorId: req.authority.authorityId,
      });
    }

    let actionForAudit = null;
    if (hasActionInput) {
      const parsedAction = actionPayloadSchema.safeParse(parsedActionInput.value);
      if (!parsedAction.success) {
        return res.status(400).json({ error: "Invalid action payload" });
      }

      const actionPayload = parsedAction.data;
      const attachments = [...actionPayload.attachments];
      if (proofUrl) {
        attachments.push({
          fileUrl: proofUrl,
          proofType: "PHOTO",
        });
      }

      const takenByUser = req.user?._id || null;
      const takenByLabel = req.authority?.authorityId || (takenByUser ? String(takenByUser) : "authority");

      const actionDoc = {
        actionType: actionPayload.actionType,
        title: actionPayload.title,
        description: actionPayload.description || "",
        takenByUser,
        takenByLabel,
        attachments,
      };

      complaint.actions.push(actionDoc);
      actionForAudit = actionDoc;
    }

    await complaint.save();

    if (hasActionInput && actionForAudit) {
      await recordAuditEvent({
        complaintId: complaint.complaintId,
        type: "ACTION_ADDED",
        payload: {
          actionType: actionForAudit.actionType,
          title: actionForAudit.title,
          takenBy: actionForAudit.takenByLabel,
          attachments: actionForAudit.attachments.map((item) => ({
            fileUrl: item.fileUrl,
            proofType: item.proofType,
          })),
          oldStatus,
          newStatus: hasStatusInput ? complaint.status : undefined,
        },
      });
    } else {
      await recordAuditEvent({
        complaintId: complaint.complaintId,
        type: "STATUS_UPDATED",
        payload: {
          oldStatus,
          newStatus: complaint.status,
          updatedBy: req.authority?.authorityId || "authority",
          authMode:
            req.headers.authorization && String(req.headers.authorization).toLowerCase().startsWith("bearer ")
              ? "jwt"
              : "api_key",
          proofUrl: proofUrl || "",
        },
      });
    }

    return res.json({ complaint });
  } catch (e) {
    return next(e);
  }
});

module.exports = router;

