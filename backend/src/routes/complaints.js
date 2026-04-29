const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const { z } = require("zod");

const { Complaint, UPDATE_STATUSES } = require("../models/Complaint");
const { Post } = require("../models/Post");
const { requireAuthority } = require("../middleware/requireAuthority");

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

const upload = multer({ storage, limits: { fileSize: 8 * 1024 * 1024 } }); // 8MB

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

router.post("/", upload.single("photo"), async (req, res, next) => {
  try {
    const parsed = complaintCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const complaintId = uuidv4();
    const photoUrl = req.file ? `/uploads/${req.file.filename}` : (req.body.photoUrl || "");

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
      updates: [
        {
          status: "new",
          note: "",
          proofUrl: "",
          actorType: "system",
          actorId: "",
        },
      ],
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
    const statusRaw = String(req.body.status || "");
    if (!UPDATE_STATUSES.includes(statusRaw)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const note = String(req.body.note || "");
    const proofUrl = req.file ? `/uploads/${req.file.filename}` : (req.body.proofUrl || "");

    const complaint = await Complaint.findOne({ complaintId });
    if (!complaint) return res.status(404).json({ error: "Not found" });

    complaint.status = statusRaw;
    if (statusRaw === "resolved") complaint.resolvedAt = new Date();

    complaint.updates.push({
      status: statusRaw,
      note,
      proofUrl,
      actorType: "authority",
      actorId: req.authority.authorityId,
    });

    await complaint.save();

    return res.json({ complaint });
  } catch (e) {
    return next(e);
  }
});

module.exports = router;

