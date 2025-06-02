const express = require("express");
const multer = require("multer");
const cloudinary = require("cloudinary");
const router = express.Router();

const Shop = require("../model/shop");
const Event = require("../model/event");
const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const { isSeller, isAuthenticated, isAdmin } = require("../middleware/auth");

// Multer config: store files in memory
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Upload helper for Cloudinary
const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.v2.uploader.upload_stream(
      { folder: "events" },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          public_id: result.public_id,
          url: result.secure_url,
        });
      }
    );
    stream.end(fileBuffer);
  });
};

// Create Event — adjusted for frontend payload & fixes
router.post(
  "/create-event",
  isAuthenticated,
  isSeller,
  upload.array("images"),
  catchAsyncErrors(async (req, res, next) => {
    const { shopId, name, description, startDate, finishDate } = req.body;

    // Basic field validation
    if (!shopId || !name || !description || !startDate || !finishDate || !req.files?.length) {
      return next(new ErrorHandler("All fields are required", 400));
    }

    // Validate date format
    const start = new Date(startDate);
    const finish = new Date(finishDate);
    if (isNaN(start) || isNaN(finish)) {
      return next(new ErrorHandler("Invalid date format", 400));
    }

    // Fetch shop and populate seller
    const shop = await Shop.findById(shopId).populate("seller");
    if (!shop) {
      return next(new ErrorHandler("Shop not found.", 404));
    }

    // Authorization check: seller owns shop
    if (!shop.seller || shop.seller._id.toString() !== req.user._id.toString()) {
      return next(new ErrorHandler("Unauthorized to add event to this shop", 403));
    }

    // Log files received to debug multer
    console.log("Files received for event creation:", req.files.length);

    // Upload images to Cloudinary
    const imagesLinks = await Promise.all(
      req.files.map((file) => uploadToCloudinary(file.buffer))
    );

    // Create the event
    const event = await Event.create({
      name,
      description,
      startDate: start,
      endDate: finish,
      images: imagesLinks,
      shopId,
      shop: {
        _id: shop._id,
        name: shop.name,
      },
    });

    res.status(201).json({ success: true, event });
  })
);

// Get all events (public)
router.get(
  "/get-all-events",
  catchAsyncErrors(async (req, res) => {
    const events = await Event.find();
    res.status(200).json({ success: true, events });
  })
);

// Get all events for a specific shop
router.get(
  "/get-all-events/:id",
  catchAsyncErrors(async (req, res, next) => {
    const shopId = req.params.id;
    const events = await Event.find({ shopId });
    res.status(200).json({ success: true, events });
  })
);

// Delete event (only seller of shop)
router.delete(
  "/delete-shop-event/:id",
  isAuthenticated,
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return next(new ErrorHandler("Event not found with this ID", 404));
    }

    // Fetch shop again to verify ownership (shop.seller not stored in event.shop)
    const shop = await Shop.findById(event.shop._id).populate("seller");
    if (!shop) {
      return next(new ErrorHandler("Shop not found for this event", 404));
    }

    if (!shop.seller || shop.seller._id.toString() !== req.user._id.toString()) {
      return next(new ErrorHandler("Unauthorized: You can't delete this event.", 403));
    }

    // Delete images from Cloudinary
    for (const image of event.images) {
      try {
        await cloudinary.v2.uploader.destroy(image.public_id);
      } catch (err) {
        console.error("Cloudinary deletion failed:", err);
      }
    }

    await event.remove();

    res.status(200).json({
      success: true,
      message: "Event deleted successfully!",
    });
  })
);

// Admin: get all events sorted by createdAt desc
router.get(
  "/admin-all-events",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res) => {
    const events = await Event.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, events });
  })
);

module.exports = router;
