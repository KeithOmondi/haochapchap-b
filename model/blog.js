const mongoose = require("mongoose");

const blogSchema = new mongoose.Schema({
  author: { type: String, required: true, default: "Realty Blogger" },
  title: { type: String, required: true },
  content: { type: String, required: true },
  image: { type: String, default: "" },
  date: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Blog", blogSchema);
