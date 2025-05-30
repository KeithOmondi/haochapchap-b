const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please enter your event product name!"],
  },
  description: {
    type: String,
    required: [true, "Please enter your event product description!"],
  },
  category: {
    type: String,
    required: [true, "Please enter your event product category!"],
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ["Running", "Completed", "Cancelled"],
    default: "Running",
  },
  tags: {
    type: [String],
    default: [],
  },
  originalPrice: {
    type: Number,
    default: 0,
  },
  discountPrice: {
    type: Number,
    required: [true, "Please enter your event product price!"],
  },
  stock: {
    type: Number,
    required: [true, "Please enter your event product stock!"],
  },
  images: [
    {
      public_id: {
        type: String,
        required: true,
      },
      url: {
        type: String,
        required: true,
      },
    },
  ],
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Shop",
  },
  shop: {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Shop",
    },
    name: {
      type: String,
      required: true,
    },
  },
  sold_out: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Event", eventSchema);
