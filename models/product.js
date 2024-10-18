const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    product_name: {
      type: String,
      required: true,
      trim: true,
    },
    brand_name: {
      type: String,
      required: true,
    },
    images: {
      type: [String],
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    gender: {
      type: String,
      required: true,
    },
    movement: {
      type: String,
      required: true,
    },
    size: {
      type: String,
      required: true,
    },
    dial_shape: {
      type: String,
      required: true,
    },
    case_material: {
      type: String,
      required: true,
    },
    strap_bracelet: {
      type: String,
      required: true,
    },
    water_resistance_capacity: {
      type: String,
      required: true,
    },
    brand_warranty: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    is_listed: {
      type: Boolean,
      default: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    activeOffer: {
      type: {
        type: String,
        enum: ['product', 'category']
      },
      discountValue: Number,
      endDate: Date
    },
    sales_count: {
      type: Number,
      default:0,
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Products", productSchema);
