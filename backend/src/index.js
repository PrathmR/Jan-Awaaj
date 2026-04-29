const path = require("path");
const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

const authRoutes = require("./routes/auth");
const complaintsRoutes = require("./routes/complaints");
const postsRoutes = require("./routes/posts");

dotenv.config();

const app = express();

app.use(helmet());
app.use(morgan("dev"));

const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim())
  : "*";

app.use(
  cors({
    origin: corsOrigin,
    credentials: false,
  })
);

app.use(express.json({ limit: "10mb" }));

// Serve uploaded files for MVP development.
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/complaints", complaintsRoutes);
app.use("/api/posts", postsRoutes);

app.use((err, _req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(err.statusCode || 500).json({
    error: err.publicMessage || "Internal Server Error",
  });
});

async function main() {
  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/grievance_mvp";
  await mongoose.connect(mongoUri);
  // eslint-disable-next-line no-console
  console.log("Connected to MongoDB");

  const port = Number(process.env.PORT || 4000);
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`API listening on port ${port}`);
  });
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start:", e);
  process.exit(1);
});

