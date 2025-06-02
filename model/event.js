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
    required: [true, "Please enter your event start date!"],
  },
  endDate: {
    type: Date,
    required: [true, "Please enter your event end date!"],
  },
  status: {
    type: String,
    default: "Running",
  },
  images: [
    {
      public_id: {
        type: String,
        required: false,
      },
      url: {
        type: String,
        required: true,
      },
    },
  ],
  shopId: {
    type: String,
    required: true,
  },
  shop: {
    type: Object,
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Event", eventSchema);
