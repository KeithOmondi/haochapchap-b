const express = require("express");
const multer = require("multer");
const { isSeller, isAuthenticated, isAdmin } = require("../middleware/auth");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const ErrorHandler = require("../utils/ErrorHandler");
const Product = require("../model/product");
const Booking = require("../model/booking");
const Shop = require("../model/shop");
const cloudinary = require("cloudinary").v2;
const mongoose = require("mongoose");

const router = express.Router();

// ---------- Multer setup for file uploads ----------
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // max 50MB per file
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi|mkv|webm/;
    const ext = file.originalname.toLowerCase().split(".").pop();
    if (allowedTypes.test(ext)) {
      cb(null, true);
    } else {
      cb(new ErrorHandler("Unsupported file type", 400));
    }
  },
});

// ========== Media Upload Route ==========
// POST /upload-media
// Accepts multipart/form-data with "media" field (array of files)
// Uploads each file to Cloudinary and returns array of { public_id, url, resource_type }
router.post(
  "/upload-media",
  isSeller,
  upload.array("media", 10), // max 10 files per upload
  catchAsyncErrors(async (req, res, next) => {
    if (!req.files || req.files.length === 0) {
      return next(new ErrorHandler("No files uploaded", 400));
    }

    const uploadedMedia = [];

    for (const file of req.files) {
      try {
        // Detect resource type (image or video) from mimetype
        const resource_type = file.mimetype.startsWith("video") ? "video" : "image";

        const result = await cloudinary.uploader.upload_stream(
          {
            folder: resource_type === "image" ? "products/images" : "products/videos",
            resource_type,
          },
          (error, result) => {
            if (error) throw error;
            uploadedMedia.push({
              public_id: result.public_id,
              url: result.secure_url,
              resource_type,
            });
          }
        );

        // Use promise wrapper for upload_stream
        await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: resource_type === "image" ? "products/images" : "products/videos",
              resource_type,
            },
            (error, result) => {
              if (error) reject(error);
              else {
                uploadedMedia.push({
                  public_id: result.public_id,
                  url: result.secure_url,
                  resource_type,
                });
                resolve(result);
              }
            }
          );
          stream.end(file.buffer);
        });
      } catch (error) {
        console.error("Upload error:", error);
        return next(new ErrorHandler("File upload failed", 500));
      }
    }

    res.status(201).json({
      success: true,
      media: uploadedMedia,
    });
  })
);

// ========== Create Product Route ==========
// POST /create-product
// Expects images/videos fields as arrays of { public_id, url } received from client
router.post(
  "/create-product",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    const { shopId, images, videos, location, details, ...rest } = req.body;

    if (!location || location.trim() === "") {
      return next(new ErrorHandler("Product location is required", 400));
    }

    if (!shopId) {
      return next(new ErrorHandler("Shop ID is required", 400));
    }

    const shop = await Shop.findById(shopId);
    if (!shop) {
      return next(new ErrorHandler("Invalid Shop ID", 400));
    }

    // Parse images/videos (accept stringified JSON from frontend)
    const parseMediaArray = (media) => {
      if (!media) return [];
      if (typeof media === "string") {
        try {
          return JSON.parse(media);
        } catch {
          return [];
        }
      }
      if (Array.isArray(media)) return media;
      return [];
    };

    const imagesLinks = parseMediaArray(images);
    const videoLinks = parseMediaArray(videos);

    // Validate media array format
    for (const img of imagesLinks) {
      if (!img.public_id || !img.url) {
        return next(new ErrorHandler("Invalid image data format", 400));
      }
    }
    for (const vid of videoLinks) {
      if (!vid.public_id || !vid.url) {
        return next(new ErrorHandler("Invalid video data format", 400));
      }
    }

    const productData = {
      ...rest,
      location,
      details: Array.isArray(details) ? details : [],
      images: imagesLinks,
      videos: videoLinks,
      shopId,
      shop: shop.toObject(),
      sold_out: 0,
      createdAt: new Date(),
    };

    const product = await Product.create(productData);

    res.status(201).json({
      success: true,
      product,
    });
  })
);

// ========== Get All Products of a Shop ==========
router.get(
  "/get-all-products-shop/:id",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const products = await Product.find({ shopId: req.params.id });

      res.status(200).json({
        success: true,
        products,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 400));
    }
  })
);

// ========== Delete Product of a Shop ==========
router.delete(
  "/delete-shop-product/:id",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const product = await Product.findById(req.params.id);

      if (!product) {
        return next(new ErrorHandler("Product not found with this id", 404));
      }

      // Delete media from Cloudinary
      for (const image of product.images) {
        try {
          await cloudinary.uploader.destroy(image.public_id);
        } catch (err) {
          console.error("Failed to delete image:", err);
        }
      }

      for (const video of product.videos || []) {
        try {
          await cloudinary.uploader.destroy(video.public_id, { resource_type: "video" });
        } catch (err) {
          console.error("Failed to delete video:", err);
        }
      }

      await product.remove();

      res.status(200).json({
        success: true,
        message: "Product deleted successfully!",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 400));
    }
  })
);

// ========== Get All Products ==========
router.get(
  "/get-all-products",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const products = await Product.find().sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        products,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 400));
    }
  })
);

// ========== Create New Review ==========



// ========== Admin - Get All Products ==========
router.get(
  "/admin-all-products",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const products = await Product.find().sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        products,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// ========== Admin - Delete Any Product ==========
router.delete(
  "/delete-product/:id",
  isAuthenticated,
  isAdmin("Admin"),
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return next(new ErrorHandler("Product not found", 404));
    }

    // Delete media from Cloudinary
    for (const image of product.images) {
      try {
        await cloudinary.uploader.destroy(image.public_id);
      } catch (err) {
        console.error("Image delete failed:", err);
      }
    }

    for (const video of product.videos || []) {
      try {
        await cloudinary.uploader.destroy(video.public_id, {
          resource_type: "video",
        });
      } catch (err) {
        console.error("Video delete failed:", err);
      }
    }

    await Product.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Product deleted by admin successfully!",
    });
  })
);








module.exports = router;
