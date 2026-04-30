const express = require("express");
const jwt = require("jsonwebtoken");

const { requireAuthority } = require("../middleware/requireAuthority");
const { z } = require("zod");
const bcrypt = require("bcryptjs");

const { User } = require("../models/User");
const { sendVerificationEmail } = require("../services/emailService");

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
      email: z.string().email(),
      name: z.string().trim().min(2),
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

    const { email, name, departmentId, password } = parsed.data;
    
    // Check if user already exists
    const existing = await User.findOne({ email });
    if (existing) {
      if (existing.isVerified) {
        return res.status(409).json({ error: "Account already exists" });
      }
      // If not verified, we'll just update their details and send a new code
      existing.name = name;
      existing.departmentId = departmentId;
      existing.passwordHash = await bcrypt.hash(password, 10);
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    if (existing) {
      existing.verificationCode = verificationCode;
      existing.verificationCodeExpires = verificationCodeExpires;
      await existing.save();
    } else {
      await User.create({
        email,
        name,
        role: "authority",
        departmentId,
        passwordHash: await bcrypt.hash(password, 10),
        isVerified: false,
        verificationCode,
        verificationCodeExpires,
      });
    }

    await sendVerificationEmail(email, verificationCode);

    return res.json({ ok: true, message: "Verification code sent to email" });
  } catch (e) {
    return next(e);
  }
});

router.post("/verify", async (req, res, next) => {
  try {
    const verifySchema = z.object({
      email: z.string().email(),
      code: z.string().length(6),
    });

    const parsed = verifySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

    const { email, code } = parsed.data;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.isVerified) return res.status(400).json({ error: "Email already verified" });
    
    if (user.verificationCode !== code) {
      return res.status(400).json({ error: "Invalid verification code" });
    }

    if (new Date() > user.verificationCodeExpires) {
      return res.status(400).json({ error: "Verification code expired" });
    }

    user.isVerified = true;
    user.verificationCode = null;
    user.verificationCodeExpires = null;
    await user.save();

    return res.json({ ok: true, message: "Email verified successfully" });
  } catch (e) {
    return next(e);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const loginSchema = z.object({
      email: z.string().email(),
      password: z.string().trim().min(1),
    });

    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    if (!process.env.AUTH_JWT_SECRET) {
      return res.status(500).json({ error: "Server JWT secret not configured (AUTH_JWT_SECRET)." });
    }

    const { email, password } = parsed.data;
    const user = await User.findOne({ email }).populate("organization");
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    if (!user.isVerified) {
      return res.status(401).json({ error: "Please verify your email before logging in." });
    }

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

