const jwt = require("jsonwebtoken");

function requireAuthority(req, res, next) {
  try {
    const apiKey = req.headers["x-api-key"];
    const authHeader = req.headers.authorization || "";

    // Simple MVP auth: shared API key for authority users.
    if (apiKey && process.env.AUTH_API_KEY) {
      if (String(apiKey) !== String(process.env.AUTH_API_KEY)) {
        return res.status(401).json({ error: "Invalid authority key" });
      }
      req.authority = {
        authorityId: "authority-mvp",
        departmentId: process.env.AUTH_DEPARTMENT_ID || "general",
      };
      return next();
    }

    // Optional JWT auth (useful if you expand later).
    if (process.env.AUTH_JWT_SECRET && authHeader.toLowerCase().startsWith("bearer ")) {
      const token = authHeader.slice("bearer ".length);
      const payload = jwt.verify(token, process.env.AUTH_JWT_SECRET);
      if (payload?.role !== "authority") {
        return res.status(403).json({ error: "Forbidden" });
      }
      req.authority = {
        authorityId: payload.sub || "authority",
        departmentId: payload.departmentId || "general",
      };
      return next();
    }

    return res.status(401).json({ error: "Authority authentication required" });
  } catch (e) {
    return res.status(401).json({ error: "Authority authentication failed" });
  }
}

module.exports = { requireAuthority };

