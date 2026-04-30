const path = require("path");
const os = require("os");
const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const authRoutes = require("./routes/auth");
const complaintsRoutes = require("./routes/complaints");
const postsRoutes = require("./routes/posts");
const organizationsRoutes = require("./routes/organizations");
const ngoRoutes = require("./routes/ngo");

dotenv.config();

const app = express();

// Helmet with relaxed CSP so the authority dashboard (TailwindCSS CDN + inline scripts) works in WebView
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
  })
);
app.use(morgan("dev"));

// MVP: allow all origins so Expo on real devices / tunnels can reach the API
app.use(
  cors({
    origin: "*",
    credentials: false,
  })
);

app.use(express.json({ limit: "10mb" }));

// Serve uploaded files for MVP development.
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.get("/api/health", (_req, res) => res.json({ ok: true }));


app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/complaints", complaintsRoutes);
app.use("/api/posts", postsRoutes);
app.use("/api/organizations", organizationsRoutes);
app.use("/api/ngo", ngoRoutes);

app.use((err, _req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(err.statusCode || 500).json({
    error: err.publicMessage || "Internal Server Error",
  });
});

// Helper: get LAN IPv4 addresses so user knows what to use on phone
function getLanAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const [name, nets] of Object.entries(interfaces)) {
    for (const net of nets) {
      if (net.family === "IPv4" && !net.internal) {
        addresses.push({ name, address: net.address });
      }
    }
  }
  return addresses;
}

// ─── Seed demo NGO/CSR organizations on first startup ────────────────────────
async function seedOrganizations() {
  const { Organization } = require("./models/Organization");
  const { User } = require("./models/User");

  const orgs = [
    {
      orgId: "ngo-janshakti",
      name: "JanShakti Foundation",
      slug: "janshakti-foundation",
      type: "NGO",
      description: "Empowering marginalized communities through legal aid, counselling, and advocacy for labour rights and women's safety.",
      contactEmail: "contact@janshakti.org",
      jurisdictions: ["Jaipur", "Ajmer", "Udaipur", "All Rajasthan"],
      focusAreas: ["labour", "gender_violence", "legal_aid", "education"],
    },
    {
      orgId: "ngo-jalseva",
      name: "JalSeva Trust",
      slug: "jalseva-trust",
      type: "NGO",
      description: "Working on water access, sanitation infrastructure, and hygiene awareness in rural and peri-urban communities.",
      contactEmail: "info@jalseva.org",
      jurisdictions: ["Ajmer", "Bikaner", "Jodhpur"],
      focusAreas: ["water", "sanitation", "public_health"],
    },
    {
      orgId: "ngo-safestreets",
      name: "SafeStreets Collective",
      slug: "safestreets-collective",
      type: "NGO",
      description: "Citizens' initiative for road safety, street lighting, and pedestrian infrastructure improvements.",
      contactEmail: "hello@safestreets.in",
      jurisdictions: ["Jodhpur", "Kota", "Jaipur"],
      focusAreas: ["road_safety", "infrastructure", "public_works"],
    },
    {
      orgId: "sdg-action",
      name: "SDG Action Network",
      slug: "sdg-action-network",
      type: "SDG",
      description: "Advocacy and implementation group for United Nations Sustainable Development Goals (SDGs) at local levels.",
      contactEmail: "global@sdg-action.net",
      jurisdictions: ["All India", "Global"],
      focusAreas: ["education", "environment", "equality", "poverty"],
    },
    {
      orgId: "sdg-impact",
      name: "SDG Impact Partners",
      slug: "sdg-impact-partners",
      type: "SDG",
      description: "Corporate initiative funding large-scale sustainable development projects aligned with UN SDGs.",
      contactEmail: "csr@sdg-impact.net",
      jurisdictions: ["All India"],
      focusAreas: ["environment", "poverty", "clean_energy"],
    },
    {
      orgId: "abvp-welfare",
      name: "ABVP Student Welfare",
      slug: "abvp-student-welfare",
      type: "ABVP",
      description: "Student organization focused on educational reforms, student rights, and social service initiatives across campuses.",
      contactEmail: "info@abvp.org.in",
      jurisdictions: ["All India", "Rajasthan"],
      focusAreas: ["education", "youth_empowerment", "social_service"],
    },
    {
      orgId: "abvp-digital",
      name: "ABVP Digital Outreach",
      slug: "abvp-digital-outreach",
      type: "ABVP",
      description: "A digital outreach and CSR wing focused on tech-education and bridge-building for rural students.",
      contactEmail: "tech@abvp.org.in",
      jurisdictions: ["Rajasthan", "Delhi"],
      focusAreas: ["education", "digital_literacy"],
    },
    {
      orgId: "csr-tatafoundation",
      name: "Tata Community Impact",
      slug: "tata-community-impact",
      type: "CSR",
      description: "CSR initiative supporting civic infrastructure, education facilities, and sustainable development in underserved areas.",
      website: "https://tata.com/csr",
      jurisdictions: ["All India"],
      focusAreas: ["education", "infrastructure", "sanitation", "water"],
    },
    {
      orgId: "csr-reliancecare",
      name: "Reliance CareForward",
      slug: "reliance-careforward",
      type: "CSR",
      description: "Corporate social responsibility program focused on health services, digital literacy, and community development.",
      website: "https://reliance.com/csr",
      jurisdictions: ["All India"],
      focusAreas: ["health", "education", "digital_literacy"],
    },
  ];

  let seededCount = 0;
  for (const org of orgs) {
    const existing = await Organization.findOne({ orgId: org.orgId });
    if (!existing) {
      await Organization.create(org);
      seededCount++;
    } else {
      // Update type in case it changed (e.g. from NGO to SDG)
      existing.type = org.type;
      await existing.save();
    }
  }

  if (seededCount > 0) {
    // eslint-disable-next-line no-console
    console.log(`  Seeded ${seededCount} new organizations.`);
  }

  // Create a demo NGO officer account (if JWT secret is set)
  if (process.env.AUTH_JWT_SECRET) {
    const janshaktiOrg = await Organization.findOne({ orgId: "ngo-janshakti" });
    if (janshaktiOrg) {
      const existing = await User.findOne({ email: "ngo-officer@janshakti.org" });
      if (!existing) {
        const passwordHash = await bcrypt.hash("ngo123", 10);
        await User.create({
          email: "ngo-officer@janshakti.org",
          name: "Priya Sharma",
          role: "ngo_officer",
          organization: janshaktiOrg._id,
          passwordHash,
          isVerified: true,
        });
        // eslint-disable-next-line no-console
        console.log("  Created demo NGO officer: email=ngo-officer@janshakti.org password=ngo123");
      }
    }
  }

  // eslint-disable-next-line no-console
  console.log(`  Seeded ${orgs.length} organizations\n`);
}

async function seedAuthority() {
  const { User } = require("./models/User");
  const email = "authority@janawaaj.in";
  const existing = await User.findOne({ email });
  if (!existing) {
    const passwordHash = await bcrypt.hash("authority-pass-2026", 10);
    await User.create({
      email,
      name: "General Authority",
      role: "authority",
      departmentId: "General",
      passwordHash,
      isVerified: true,
    });
    // eslint-disable-next-line no-console
    console.log(`\n  [SEED] Super Authority Created:`);
    console.log(`  Email: ${email}`);
    console.log(`  Password: authority-pass-2026\n`);
  }
}

async function main() {
  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/grievance_mvp";
  await mongoose.connect(mongoUri);
  // eslint-disable-next-line no-console
  console.log("Connected to MongoDB");

  // Seed demo data
  await seedOrganizations();
  await seedAuthority();

  const port = Number(process.env.PORT || 4000);
  const host = "0.0.0.0"; // Bind to all interfaces so phone on LAN can connect

  app.listen(port, host, () => {
    // eslint-disable-next-line no-console
    console.log(`\n  API listening on http://${host}:${port}\n`);
    const lanAddresses = getLanAddresses();
    if (lanAddresses.length > 0) {
      // eslint-disable-next-line no-console
      console.log("  LAN addresses (use one of these on your phone):");
      for (const { name, address } of lanAddresses) {
        // eslint-disable-next-line no-console
        console.log(`    http://${address}:${port}  (${name})`);
      }
      // eslint-disable-next-line no-console
      console.log("");
    }
  });
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start:", e);
  process.exit(1);
});
