const jwt = require("jsonwebtoken");
const { User } = require("../models/User");

/**
 * Middleware for NGO officer routes.
 * Supports JWT auth (Bearer token) where role === "ngo_officer".
 * Populates req.ngoOfficer with { userId, name, organizationId, orgId }.
 */
async function requireNgo(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";

    if (!process.env.AUTH_JWT_SECRET) {
      return res.status(500).json({ error: "Server JWT secret not configured" });
    }

    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return res.status(401).json({ error: "NGO authentication required (Bearer token)" });
    }

    const token = authHeader.slice("bearer ".length);
    const payload = jwt.verify(token, process.env.AUTH_JWT_SECRET);

    if (payload?.role !== "ngo_officer") {
      return res.status(403).json({ error: "NGO officer role required" });
    }

    // Fetch user with populated organization
    const user = await User.findById(payload.sub).populate("organization").lean();
    if (!user || !user.organization) {
      return res.status(403).json({ error: "NGO officer account not properly configured" });
    }

    req.ngoOfficer = {
      userId: String(user._id),
      name: user.name || user.phone,
      organizationId: user.organization._id,
      orgId: user.organization.orgId,
      orgName: user.organization.name,
      orgType: user.organization.type,
      focusAreas: user.organization.focusAreas || [],
    };

    return next();
  } catch (e) {
    if (e.name === "JsonWebTokenError" || e.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    return res.status(401).json({ error: "NGO authentication failed" });
  }
}

module.exports = { requireNgo };
