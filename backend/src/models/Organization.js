const mongoose = require("mongoose");

const organizationSchema = new mongoose.Schema(
  {
    orgId: { type: String, unique: true, index: true, required: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, index: true, required: true, trim: true, lowercase: true },
    type: {
      type: String,
      enum: ["NGO", "CSR", "GOV_PARTNER", "SDG", "ABVP"],
      required: true,
      index: true,
    },
    description: { type: String, default: "", trim: true },
    logoUrl: { type: String, default: "" },
    website: { type: String, default: "" },
    contactEmail: { type: String, default: "" },
    contactPhone: { type: String, default: "" },
    jurisdictions: { type: [String], default: [] }, // districts/areas served
    focusAreas: { type: [String], default: [] },    // e.g. "labour", "sanitation"
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

module.exports = {
  Organization: mongoose.model("Organization", organizationSchema),
};
