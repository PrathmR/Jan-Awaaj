const mongoose = require("mongoose");

const postCommentSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
  },
  { _id: false, timestamps: { createdAt: true, updatedAt: false } }
);

const postSchema = new mongoose.Schema(
  {
    postId: { type: String, unique: true, index: true, required: true },
    complaintId: { type: String, index: true, required: true },

    // Display fields (no user identity for privacy-first MVP).
    text: { type: String, required: true },
    photoUrl: { type: String, default: "" },

    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
        default: "Point",
      },
      coordinates: {
        type: [Number], // [lon, lat]
        required: true,
      },
    },

    voteCounts: {
      up: { type: Number, default: 0 },
      down: { type: Number, default: 0 },
    },

    comments: { type: [postCommentSchema], default: [] },

    createdAt: { type: Date, default: Date.now },
  }
);

postSchema.index({ location: "2dsphere" });

module.exports = {
  Post: mongoose.model("Post", postSchema),
};

