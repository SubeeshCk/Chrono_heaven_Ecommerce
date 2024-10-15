const CategoryOffer = require("../../models/categoryOffer");
const categoryModel = require("../../models/category");
const productModel = require("../../models/product");
const ProductOffer = require("../../models/productOffer");

const renderProductOffers = async (req, res) => {
  try {
    const offers = await ProductOffer.find().populate("productId");

    res.render("productOffers", { offers });
  } catch (error) {
    next(error);
  }
};

const renderAddProductOffer = async (req, res) => {
  try {
    const products = await productModel.find({});
    res.render("addProductOffer", { products });
  } catch (error) {
    console.error("Error adding offer:", error);
    res.status(500).json({ error: "An error occurred while adding the offer" });
  }
};

const addProductOffer = async (req, res) => {
  try {
    const { description, selectedProduct, discountValue, startDate, endDate } =
      req.body;

    if (discountValue > 50) {
      req.flash("error", "offer should be below 50 %");
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

const removeProductOffer = async (req, res) => {
  try {
    const { offerId } = req.params;

    const productWithId = await ProductOffer.findById(offerId);

    await productWithId.deleteOne();
    res.json(200);
  } catch (error) {
    next(error);
  }
};

const renderCategoryOffer = async (req, res) => {
  try {
    const offers = await CategoryOffer.find().populate("categoryId");

    res.render("categoryOffers", { offers });
  } catch (error) {
    return next(error);
  }
};

const renderAddCategoryOffer = async (req, res) => {
  try {
    const categories = await categoryModel.find({});

    res.render("addCategoryOffer", { categories });
  } catch (error) {
    error.message = "An error occurred while adding the offer";
    return next(error);
  }
};

const AddCategoryOffer = async (req, res) => {
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

const removeCategoryOffer = async (req, res) => {
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
};
