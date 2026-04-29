const express = require("express");
const jwt = require("jsonwebtoken");

const { requireAuthority } = require("../middleware/requireAuthority");
const { z } = require("zod");
const bcrypt = require("bcryptjs");

const { User } = require("../models/User");

const router = express.Router();

router.post("/token", (req, res) => {
  const apiKey = req.headers["x-api-key"];
  if (!apiKey || !process.env.AUTH_API_KEY) {
    return res.status(401).json({ error: "Missing authority key" });
  }
  if (String(apiKey) !== String(process.env.AUTH_API_KEY)) {
    return res.status(401).json({ error: "Invalid authority key" });
  }

  // If JWT secret isn't configured, we keep the endpoint functional but un-signed.
  if (!process.env.AUTH_JWT_SECRET) {
    return res.json({
      token: null,
      authority: {
        authorityId: "authority-mvp",
        departmentId: process.env.AUTH_DEPARTMENT_ID || "general",
      },
    });
  }

  const departmentId = req.body?.departmentId || process.env.AUTH_DEPARTMENT_ID || "general";
  const token = jwt.sign(
    { role: "authority", departmentId },
    process.env.AUTH_JWT_SECRET,
    { subject: "authority-mvp", expiresIn: "24h" }
  );
  return res.json({ token });
});

router.post("/register", async (req, res, next) => {
  try {
    const registerSchema = z.object({
      phone: z.string().trim().min(6).max(20),
      departmentId: z.string().trim().min(1).max(60),
      password: z.string().trim().min(6).max(100),
    });

    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    if (!process.env.AUTH_JWT_SECRET) {
      return res.status(500).json({
        error: "Server JWT secret not configured (AUTH_JWT_SECRET).",
      });
    }

    const phone = parsed.data.phone;
    const departmentId = parsed.data.departmentId;

    const existing = await User.findOne({ phone });
    if (existing) return res.status(409).json({ error: "Account already exists" });

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);

    await User.create({
      phone,
      role: "authority",
      departmentId,
      passwordHash,
    });

    return res.json({ ok: true });
  } catch (e) {
    return next(e);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const loginSchema = z.object({
      phone: z.string().trim().min(1).max(60),
      password: z.string().trim().min(1),
    });

    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    if (!process.env.AUTH_JWT_SECRET) {
      return res.status(500).json({ error: "Server JWT secret not configured (AUTH_JWT_SECRET)." });
    }

    const phone = parsed.data.phone;
    const user = await User.findOne({ phone }).populate("organization");
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(parsed.data.password, user.passwordHash || "");
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const role = user.role || "authority";
    const tokenPayload = {
      role,
      departmentId: user.departmentId || "general",
    };

    const token = jwt.sign(
      tokenPayload,
      process.env.AUTH_JWT_SECRET,
      { subject: String(user._id), expiresIn: "24h" }
    );

    const response = { token, role };

    // Include organization info for NGO/CSR users
    if (user.organization) {
      response.organization = {
        orgId: user.organization.orgId,
        name: user.organization.name,
        type: user.organization.type,
        focusAreas: user.organization.focusAreas,
      };
    }

    return res.json(response);
  } catch (e) {
    return next(e);
  }
});

router.get("/me", requireAuthority, (req, res) => {
  return res.json({ authority: req.authority });
});

module.exports = router;

