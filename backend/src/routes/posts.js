const express = require("express");
const { Post } = require("../models/Post");
const { Complaint } = require("../models/Complaint");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const { nearby, lat, lon, radiusKm } = req.query;
    let latNum = lat != null ? Number(lat) : null;
    let lonNum = lon != null ? Number(lon) : null;

    if (nearby && (latNum == null || lonNum == null)) {
      const parts = String(nearby).split(",").map((s) => s.trim());
      if (parts.length === 2) {
        latNum = Number(parts[0]);
        lonNum = Number(parts[1]);
      }
    }

    const rKm = radiusKm != null ? Number(radiusKm) : 3;
    if (
      !Number.isFinite(latNum) ||
      !Number.isFinite(lonNum) ||
      !Number.isFinite(rKm) ||
      rKm <= 0
    ) {
      return res.status(400).json({
        error: "Provide nearby=lat,lon and radiusKm (example radiusKm=3)",
      });
    }

    let results = [];
    try {
      results = await Post.aggregate([
        {
          $geoNear: {
            near: { type: "Point", coordinates: [lonNum, latNum] }, // [lon, lat]
            distanceField: "distMeters",
            spherical: true,
            maxDistance: rKm * 1000,
          },
        },
        {
          $lookup: {
            from: "complaints",
            localField: "complaintId",
            foreignField: "complaintId",
            as: "complaint",
          },
        },
        // Use preserveNullAndEmptyArrays so posts without a matching complaint aren't dropped
        { $unwind: { path: "$complaint", preserveNullAndEmptyArrays: true } },
        // Privacy-first: feed posts come only from shared complaints.
        {
          $match: {
            $or: [
              { "complaint.sharePublic": true },
              { complaint: { $exists: false } },
            ],
          },
        },
        {
          $project: {
            postId: 1,
            complaintId: 1,
            text: 1,
            photoUrl: 1,
            createdAt: 1,
            voteCounts: 1,
            comments: { $slice: ["$comments", -20] }, // last 20 comments
            category: "$complaint.category",
            complaintStatus: "$complaint.status",
            complaintDescription: "$complaint.description",
            complaintPhotoUrl: "$complaint.photoUrl",
            distMeters: 1,
          },
        },
        { $sort: { createdAt: -1 } },
        { $limit: 50 },
      ]);
    } catch (geoError) {
      // If the 2dsphere index doesn't exist yet (empty collection), return empty results
      // eslint-disable-next-line no-console
      console.warn("Geo query failed (index may not exist yet):", geoError.message);
      results = [];
    }

    return res.json({ posts: results });
  } catch (e) {
    return next(e);
  }
});

router.post("/:postId/vote", async (req, res, next) => {
  try {
    const { postId } = req.params;
    const value = String(req.body.value || "").toLowerCase();
    if (!["up", "down"].includes(value)) {
      return res.status(400).json({ error: "value must be up or down" });
    }

    const post = await Post.findOne({ postId });
    if (!post) return res.status(404).json({ error: "Not found" });

    if (value === "up") post.voteCounts.up += 1;
    if (value === "down") post.voteCounts.down += 1;

    await post.save();
    return res.json({ postId, voteCounts: post.voteCounts });
  } catch (e) {
    return next(e);
  }
});

router.post("/:postId/comments", async (req, res, next) => {
  try {
    const { postId } = req.params;
    const text = String(req.body.text || "").trim();
    if (text.length < 2) return res.status(400).json({ error: "Text is too short" });

    const post = await Post.findOne({ postId });
    if (!post) return res.status(404).json({ error: "Not found" });

    post.comments.push({ text });
    await post.save();
    return res.json({ postId, comments: post.comments.slice(-20) });
  } catch (e) {
    return next(e);
  }
});

// MVP helper: used by authority to inspect which complaints are shared.
router.get("/by-complaint/:complaintId", async (req, res, next) => {
  try {
    const { complaintId } = req.params;
    const complaint = await Complaint.findOne({ complaintId });
    if (!complaint) return res.status(404).json({ error: "Not found" });
    if (!complaint.sharePublic) return res.json({ post: null });
    const post = await Post.findOne({ complaintId });
    return res.json({ post });
  } catch (e) {
    return next(e);
  }
});

module.exports = router;

