const express = require("express");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const ErrorHandler = require("../utils/ErrorHandler");
const { isAdmin, isAuthenticated, isSeller } = require("../middleware/auth");
const Blog = require("../model/blog");
const cloudinary = require("cloudinary").v2;

const router = express.Router();

// Create a new blog post (Admin only)
router.post(
  "/create-blog",
  isAuthenticated,
  isAdmin("Admin"),
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      let images = [];

      if (typeof req.body.images === "string") {
        images.push(req.body.images);
      } else if (Array.isArray(req.body.images)) {
        images = req.body.images;
      }

      const imagesLinks = [];

      for (let i = 0; i < images.length; i++) {
        const result = await cloudinary.uploader.upload(images[i], {
          folder: "blogs",
        });

        imagesLinks.push({
          public_id: result.public_id,
          url: result.secure_url,
        });
      }

      const blogData = {
        author: req.body.author || "Realty Blogger",
        title: req.body.title,
        content: req.body.content,
        image: imagesLinks.length > 0 ? imagesLinks[0].url : "", // use first image url as main image
        images: imagesLinks, // optional if you want to store multiple images
        date: req.body.date || Date.now(),
      };

      const blog = await Blog.create(blogData);

      res.status(201).json({
        success: true,
        blog,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message || "Blog creation failed", 400));
    }
  })
);

// Get all blogs (public)
router.get(
  "/get-all-blogs",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const blogs = await Blog.find().sort({ date: -1 });

      res.status(200).json({
        success: true,
        blogs,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message || "Failed to get blogs", 500));
    }
  })
);

// Get a single blog by ID (public)
router.get(
  "/get-blog/:id",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const blog = await Blog.findById(req.params.id);
      if (!blog) {
        return next(new ErrorHandler("Blog not found with this ID", 404));
      }

      res.status(200).json({
        success: true,
        blog,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message || "Failed to get blog", 500));
    }
  })
);

// Delete a blog by ID (Admin only)
router.delete(
  "/delete-blog/:id",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const blog = await Blog.findById(req.params.id);
      if (!blog) {
        return next(new ErrorHandler("Blog not found with this ID", 404));
      }

      // If you stored multiple images, remove them from Cloudinary here:
      // if (blog.images && blog.images.length) {
      //   for (const img of blog.images) {
      //     await cloudinary.uploader.destroy(img.public_id);
      //   }
      // }

      // Delete blog
      await blog.deleteOne();

      res.status(200).json({
        success: true,
        message: "Blog deleted successfully",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message || "Delete failed", 500));
    }
  })
);

// Admin route to get all blogs sorted by newest
router.get(
  "/admin-all-blogs",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const blogs = await Blog.find().sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        blogs,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message || "Failed to fetch blogs", 500));
    }
  })
);

module.exports = router;
