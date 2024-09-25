const mongoose = require("mongoose");
const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    is_listed: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Category", categorySchema);
