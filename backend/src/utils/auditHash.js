const crypto = require("crypto");

function computeAuditHash({ complaintId, type, payload, previousHash, createdAt }) {
  const base = {
    complaintId,
    type,
    payload,
    previousHash: previousHash || null,
    createdAt: createdAt.toISOString(),
  };

  const serialized = JSON.stringify(base);
  return crypto.createHash("sha256").update(serialized).digest("hex");
}

module.exports = {
  computeAuditHash,
};
