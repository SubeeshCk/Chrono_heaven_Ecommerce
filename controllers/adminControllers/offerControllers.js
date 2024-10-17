const Coupon = require("../../models/couponModel");
const CategoryOffer = require("../../models/categoryOffer");
const categoryModel = require("../../models/category");
const productModel = require("../../models/product");
const ProductOffer = require("../../models/productOffer");
const User = require ("../../models/userModel");


const renderCoupons = async (req, res, next) => {
  try {
    const coupons = await Coupon.find();

    res.render("coupons", { coupons });
  } catch (error) {
    return next(error);
  }
};

const addCoupons = async (req, res, next) => {
  try {
    const { code, discountType, discountValue, minPurchaseAmount, validity } =
      req.body;

    // Check if all required fields are present
    if (
      !code ||
      !discountType ||
      !discountValue ||
      !minPurchaseAmount ||
      !validity
    ) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const existingCoupon = await Coupon.findOne({ code });
    if (existingCoupon) {
      return res.status(400).json({ error: "Coupon code already exists" });
    }

    const currentDate = new Date();
    const expiryDate = new Date(
      currentDate.getTime() + parseInt(validity) * 24 * 60 * 60 * 1000
    );

    if (isNaN(expiryDate.getTime())) {
      return res.status(400).json({ error: "Invalid validity value" });
    }

    if (parseFloat(discountValue) > parseFloat(minPurchaseAmount)) {
      return res
        .status(400)
        .json({
          error: "Discount value cannot exceed minimum purchase amount",
        });
    }

    const newCoupon = new Coupon({
      code,
      discountType,
      discountValue: parseFloat(discountValue),
      minPurchaseAmount: parseFloat(minPurchaseAmount),
      validity: expiryDate,
    });

    await newCoupon.save();

    res.status(201).json({ message: "Coupon added successfully" });
  } catch (error) {
    console.error("Error adding coupon:", error);
    res
      .status(500)
      .json({ error: "An error occurred while adding the coupon" });
  }
};

const removeCoupon = async (req, res, next) => {
  try {
    const couponId = req.params.couponId;

    await User.updateMany(
      { "availableCoupons.couponId": couponId },
      { $pull: { availableCoupons: { couponId } } }
    );

    await User.updateMany(
      { usedCoupons: couponId },
      { $pull: { usedCoupons: couponId } }
    );

    await Coupon.findByIdAndDelete(couponId);

    res.status(200).json({ message: "Coupon removed successfully" });
  } catch (error) {
    console.error("Error in removeCoupon:", error);
    res.status(500).json({ error: "Failed to remove coupon" });
  }
};

const renderProductOffers = async (req, res, next) => {
  try {
    const offers = await ProductOffer.find().populate("productId");

    res.render("productOffers", { offers });
  } catch (error) {
    return next(error);
  }
};

const renderAddProductOffer = async (req, res, next) => {
  try {
    const products = await productModel.find({});
    res.render("addProductOffer", { products });
  } catch (error) {
    console.error("Error adding offer:", error);
    res.status(500).json({ error: "An error occurred while adding the offer" });
  }
};

const addProductOffer = async (req, res, next) => {
  try {
    const { description, selectedProduct, discountValue, startDate, endDate } =
      req.body;

    if (discountValue > 40) {
      req.flash("error", "offer should be below 40 %");
      return res.redirect("/admin/addOffer");
    }
    const productOffer = new ProductOffer({
      description: description,
      discountValue: discountValue,
      startDate: startDate,
      endDate: endDate,
      productId: selectedProduct,
    });

    await productOffer.save();
    res.redirect("/admin/product-offers");
  } catch (error) {
    next(error);
  }
};

const removeProductOffer = async (req, res, next) => {
  try {
    const { offerId } = req.params;

    const productWithId = await ProductOffer.findById(offerId);

    await productWithId.deleteOne();
    res.json(200);
  } catch (error) {
    next(error);
  }
};

const renderCategoryOffer = async (req, res, next) => {
  try {
    const offers = await CategoryOffer.find().populate("categoryId");

    res.render("categoryOffers", { offers });
  } catch (error) {
    return next(error);
  }
};

const renderAddCategoryOffer = async (req, res, next) => {
  try {
    const categories = await categoryModel.find({});

    res.render("addCategoryOffer", { categories });
  } catch (error) {
    error.message = "An error occurred while adding the offer";
    return next(error);
  }
};

const AddCategoryOffer = async (req, res, next) => {
  try {
    const { description, selectedCategory, discountValue, startDate, endDate } =
      req.body;
    if (discountValue > 50) {
      req.flash("error", "offer should be below 50 %");
      return res.redirect("/admin/addCategoryOffer");
    }
    const categoryOffer = new CategoryOffer({
      description: description,
      discountValue: discountValue,
      startDate: startDate,
      endDate: endDate,
      categoryId: selectedCategory,
    });

    await categoryOffer.save();
    res.redirect("/admin/category-offers");
  } catch (error) {
    return next(error);
  }
};

const removeCategoryOffer = async (req, res, next) => {
  try {
    const { offerId } = req.params;

    const categroyWithId = await CategoryOffer.findById(offerId);

    await categroyWithId.deleteOne();
    res.json(200);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  renderProductOffers,
  renderAddProductOffer,
  renderCategoryOffer,
  renderAddCategoryOffer,
  AddCategoryOffer,
  removeCategoryOffer,
  addProductOffer,
  removeProductOffer,
  renderCoupons,
  addCoupons,
  removeCoupon,
};
