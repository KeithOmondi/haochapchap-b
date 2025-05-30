const express = require("express");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const Shop = require("../model/shop");
const Event = require("../model/event");
const ErrorHandler = require("../utils/ErrorHandler");
const { isSeller, isAdmin, isAuthenticated } = require("../middleware/auth");
const cloudinary = require("cloudinary");
const router = express.Router();

// Create event - only authenticated sellers or admins allowed
router.post(
  "/create-event",
  isAuthenticated,
  isSeller, // or isAdmin if admins can also create
  catchAsyncErrors(async (req, res, next) => {
    const {
      shopId,
      images,
      name,
      description,
      category,
      startDate,
      endDate,
      status,
      tags,
      originalPrice,
      discountPrice,
      stock,
    } = req.body;

    if (!shopId) {
      return next(new ErrorHandler("Shop ID is required.", 400));
    }

    const shop = await Shop.findById(shopId).select("name _id");
    if (!shop) {
      return next(new ErrorHandler("Invalid Shop ID.", 400));
    }

    // Normalize images array
    let imagesArray = [];
    if (typeof images === "string") {
      imagesArray.push(images);
    } else if (Array.isArray(images)) {
      imagesArray = images;
    } else {
      return next(new ErrorHandler("Images must be a string or array.", 400));
    }

    // Upload images to Cloudinary
    const imagesLinks = [];
    for (const image of imagesArray) {
      const result = await cloudinary.v2.uploader.upload(image, {
        folder: "events",
      });
      imagesLinks.push({
        public_id: result.public_id,
        url: result.secure_url,
      });
    }

    // Convert tags to array if string
    let tagsArray = [];
    if (typeof tags === "string") {
      tagsArray = tags.split(",").map((tag) => tag.trim()).filter((tag) => tag.length > 0);
    } else if (Array.isArray(tags)) {
      tagsArray = tags;
    }

    // Parse dates
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    // Prepare event data object
    const eventData = {
      name,
      description,
      category,
      startDate: start,
      endDate: end,
      status: status || "Running",
      tags: tagsArray,
      originalPrice: Number(originalPrice) || 0,
      discountPrice: Number(discountPrice),
      stock: Number(stock),
      images: imagesLinks,
      shopId: shop._id,
      shop: { _id: shop._id, name: shop.name },
    };

    const event = await Event.create(eventData);

    res.status(201).json({
      success: true,
      event,
    });
  })
);

// Get all events - public route
router.get(
  "/get-all-events",
  catchAsyncErrors(async (req, res, next) => {
    const events = await Event.find();
    res.status(200).json({
      success: true,
      events,
    });
  })
);

// Get all events of a specific shop - public route
router.get(
  "/get-all-events/:id",
  catchAsyncErrors(async (req, res, next) => {
    const shopId = req.params.id;
    const events = await Event.find({ shopId });
    res.status(200).json({
      success: true,
      events,
    });
  })
);

// Delete event of a shop - only seller or admin
router.delete(
  "/delete-shop-event/:id",
  isAuthenticated,
  isSeller, // or isAdmin
  catchAsyncErrors(async (req, res, next) => {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return next(new ErrorHandler("Event not found with this ID", 404));
    }

    // Delete images from cloudinary
    for (const image of event.images) {
      try {
        await cloudinary.v2.uploader.destroy(image.public_id);
      } catch (cloudErr) {
        console.error("Cloudinary deletion error:", cloudErr);
        // Continue deletion despite failure in image cleanup
      }
    }

    await event.remove();

    res.status(200).json({
      success: true,
      message: "Event deleted successfully!",
    });
  })
);

// Admin - get all events sorted by creation date
router.get(
  "/admin-all-events",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    const events = await Event.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      events,
    });
  })
);

module.exports = router;
