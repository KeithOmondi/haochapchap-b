const express = require("express");
const router = express.Router();
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const ErrorHandler = require("../utils/ErrorHandler");
const PublicReview = require("../model/publicReview");

// POST route to submit review
router.post(
  "/public",
  catchAsyncErrors(async (req, res, next) => {
    const { rating, comment, name } = req.body;

    if (!rating || !comment || !name) {
      return next(new ErrorHandler("Name, rating, and comment are required", 400));
    }

    if (typeof rating !== "number" || rating < 1 || rating > 5) {
      return next(new ErrorHandler("Rating must be a number between 1 and 5", 400));
    }

    await PublicReview.create({
      name,
      rating,
      comment,
      createdAt: new Date(),
    });

    res.status(201).json({ success: true, message: "Thank you for your review!" });
  })
);

// ✅ GET route to fetch all reviews
router.get(
  "/get-all-reviews",
  catchAsyncErrors(async (req, res, next) => {
    const reviews = await PublicReview.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, reviews });
  })
);

// POST /vote-helpful to record helpful/unhelpful votes
router.post(
  "/vote-helpful",
  catchAsyncErrors(async (req, res, next) => {
    const { reviewId, vote } = req.body;

    if (!reviewId || !vote || !["up", "down"].includes(vote)) {
      return next(new ErrorHandler("Invalid vote data", 400));
    }

    const review = await PublicReview.findById(reviewId);
    if (!review) {
      return next(new ErrorHandler("Review not found", 404));
    }

    if (vote === "up") {
      review.helpfulUp = (review.helpfulUp || 0) + 1;
    } else if (vote === "down") {
      review.helpfulDown = (review.helpfulDown || 0) + 1;
    }

    await review.save();

    res.status(200).json({ success: true, message: "Vote recorded", helpfulUp: review.helpfulUp, helpfulDown: review.helpfulDown });
  })
);


module.exports = router;
