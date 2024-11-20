const Coupon = require("../../models/couponModel");
const CategoryOffer = require("../../models/categoryOffer");
const categoryModel = require("../../models/category");
const productModel = require("../../models/product");
const ProductOffer = require("../../models/productOffer");
const User = require ("../../models/userModel");
const statusCode = require("../../config/statusCode");


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

    if (
      !code ||
      !discountType ||
      !discountValue ||
      !minPurchaseAmount ||
      !validity
    ) {
      return res.status(statusCode.BAD_REQUEST).json({ error: "All fields are required" });
    }

    const existingCoupon = await Coupon.findOne({ code });
    if (existingCoupon) {
      return res.status(statusCode.BAD_REQUEST).json({ error: "Coupon code already exists" });
    }

    const currentDate = new Date();
    const expiryDate = new Date(
      currentDate.getTime() + parseInt(validity) * 24 * 60 * 60 * 1000
    );

    if (isNaN(expiryDate.getTime())) {
      return res.status(statusCode.BAD_REQUEST).json({ error: "Invalid validity value" });
    }

    if (parseFloat(discountValue) > parseFloat(minPurchaseAmount)) {
      return res
        .status(statusCode.BAD_REQUEST)
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
      .status(statusCode.INTERNAL_SERVER_ERROR)
      .json({ error: "An error occurred while adding the coupon" });
  }
};


const getCoupon = async (req, res) => {
  try {
      const couponId = req.params.id;
      const coupon = await Coupon.findById(couponId);
      
      if (!coupon) {
          return res.status(statusCode.NOT_FOUND).json({ error: "Coupon not found" });
      }

      res.json(coupon);
  } catch (error) {
      console.error("Error fetching coupon:", error);
      res.status(statusCode.INTERNAL_SERVER_ERROR).json({ error: "An error occurred while fetching the coupon" });
  }
};


const updateCoupon = async (req, res) => {
  try {
      const couponId = req.params.id;
      const { code, discountType, discountValue, minPurchaseAmount, validity } = req.body;

      if (!code || !discountType || !discountValue || !minPurchaseAmount) {
          return res.status(statusCode.BAD_REQUEST).json({ error: "All fields are required" });
      }

      const coupon = await Coupon.findById(couponId);
      if (!coupon) {
          return res.status(statusCode.NOT_FOUND).json({ error: "Coupon not found" });
      }

      const existingCoupon = await Coupon.findOne({ 
          code: code, 
          _id: { $ne: couponId } 
      });
      
      if (existingCoupon) {
          return res.status(statusCode.BAD_REQUEST).json({ error: "Coupon code already exists" });
      }

      if (parseFloat(discountValue) > parseFloat(minPurchaseAmount)) {
          return res.status(statusCode.BAD_REQUEST).json({ 
              error: "Discount value cannot exceed minimum purchase amount" 
          });
      }

      let newValidityDate = coupon.validity;
      if (validity && !isNaN(parseInt(validity))) {
          newValidityDate = new Date(
              new Date().getTime() + parseInt(validity) * 24 * 60 * 60 * 1000
          );
      }

      const updatedCoupon = await Coupon.findByIdAndUpdate(
          couponId,
          {
              code,
              discountType,
              discountValue: parseFloat(discountValue),
              minPurchaseAmount: parseFloat(minPurchaseAmount),
              validity: newValidityDate
          },
          { new: true }
      );

      res.json({ 
          message: "Coupon updated successfully", 
          coupon: updatedCoupon 
      });
  } catch (error) {
      console.error("Error updating coupon:", error);
      res.status(statusCode.INTERNAL_SERVER_ERROR).json({ 
          error: "An error occurred while updating the coupon" 
      });
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

    res.status(statusCode.OK).json({ message: "Coupon removed successfully" });
  } catch (error) {
    console.error("Error in removeCoupon:", error);
    res.status(statusCode.INTERNAL_SERVER_ERROR).json({ error: "Failed to remove coupon" });
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
    res.status(statusCode.INTERNAL_SERVER_ERROR).json({ error: "An error occurred while adding the offer" });
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


const renderEditOffer = async (req, res) => {
  try {
      const offerId = req.params.id;
      
      const offer = await ProductOffer.findById(offerId);
      if (!offer) {
          req.flash('error', 'Offer not found');
          return res.redirect('/admin/product-offers');
      }

      const products = await productModel.find({ is_listed: true });

      res.render('editProductOffer', {
          offer,
          products,
          messages: {
              success: req.flash('success'),
              error: req.flash('error')
          }
      });
  } catch (error) {
      console.error('Error in renderEditOffer:', error);
      req.flash('error', 'Something went wrong while loading the edit page');
      res.redirect('/admin/product-offers');
  }
};


const updateProductOffer = async (req, res) => {
  try {
      const offerId = req.params.id;
      const { description, selectedProduct, discountValue, startDate, endDate } = req.body;

      if (!description || !selectedProduct || !discountValue || !startDate || !endDate) {
          req.flash('error', 'All fields are required');
          return res.redirect(`/admin/editProductOffer/${offerId}`);
      }

      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (end <= start) {
          req.flash('error', 'End date must be after start date');
          return res.redirect(`/admin/editProductOffer/${offerId}`);
      }

      if (discountValue <= 0 || discountValue > 100) {
          req.flash('error', 'Discount value must be between 1 and 100');
          return res.redirect(`/admin/editProductOffer/${offerId}`);
      }

      await ProductOffer.findByIdAndUpdate(offerId, {
          description,
          productId: selectedProduct,
          discountValue,
          startDate: start,
          endDate: end
      });

      req.flash('success', 'Offer updated successfully');
      res.redirect('/admin/product-offers');
  } catch (error) {
      console.error('Error in updateProductOffer:', error);
      req.flash('error', 'Failed to update offer');
      res.redirect(`/admin/editProductOffer/${offerId}`);
  }
};

const removeProductOffer = async (req, res, next) => {
  try {
    const { offerId } = req.params;

    const productWithId = await ProductOffer.findById(offerId);

    await productWithId.deleteOne();
    res.json(statusCode.OK);
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


const renderEditCategoryOffer = async (req, res, next) => {
  try {
      const offerId = req.params.id;
      
      const offer = await CategoryOffer.findById(offerId);
      if (!offer) {
          req.flash('error', 'Category offer not found');
          return res.redirect('/admin/category-offers');
      }
      const categories = await categoryModel.find({ is_listed: true });

      res.render('editCategoryOffer', {
          offer,
          categories,
          messages: {
              success: req.flash('success'),
              error: req.flash('error')
          }
      });
  } catch (error) {
      next(error);
  }
};


const updateCategoryOffer = async (req, res, next) => {
  try {
      const offerId = req.params.id;
      const { description, selectedCategory, discountValue, startDate, endDate } = req.body;

      if (discountValue > 50) {
          req.flash('error', 'Offer should be below 50%');
          return res.redirect(`/admin/editCategoryOffer/${offerId}`);
      }

      const currentDate = new Date();
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);

      if (endDateObj <= startDateObj) {
          req.flash('error', 'End date must be after start date');
          return res.redirect(`/admin/editCategoryOffer/${offerId}`);
      }

      await CategoryOffer.findByIdAndUpdate(offerId, {
          description,
          categoryId: selectedCategory,
          discountValue,
          startDate,
          endDate
      });

      req.flash('success', 'Category offer updated successfully');
      res.redirect('/admin/category-offers');
  } catch (error) {
      next(error);
  }
};


const removeCategoryOffer = async (req, res, next) => {
  try {
    const { offerId } = req.params;

    const categroyWithId = await CategoryOffer.findById(offerId);

    await categroyWithId.deleteOne();
    res.json(statusCode.OK);
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
  renderEditCategoryOffer,
  updateCategoryOffer,
  removeCategoryOffer,
  addProductOffer,
  renderEditOffer,
  updateProductOffer,
  removeProductOffer,
  renderCoupons,
  addCoupons,
  getCoupon,
  updateCoupon,
  removeCoupon,


};
