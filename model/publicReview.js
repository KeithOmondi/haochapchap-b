const mongoose = require("mongoose");

const publicReviewSchema = new mongoose.Schema({
  name: { type: String, required: true },
  rating: { type: Number, required: true },
  comment: { type: String, required: true },
  helpfulUp: { type: Number, default: 0 },
  helpfulDown: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("PublicReview", publicReviewSchema);
