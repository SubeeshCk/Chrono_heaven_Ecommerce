const Category = require("../../models/category");
const API_ROUTES = require("../../config/apiRoutes");
const { findByIdAndUpdate } = require("../../models/userModel");

const renderCategories = async (req, res) => {
  try {
    const categories = await Category.find({});
    res.render("categories", { categories });
  } catch (error) {
    return next(error);
  }
};

const renderAddCategory = async (req, res) => {
  try {
    res.render("add-category");
  } catch (error) {
    return next(error);
  }
};

const insertCategory = async (req, res) => {
  try {
    const { name } = req.body;
    console.log(req.body);

    if (!name) {
      req.flash("error", "Name field is mandatory");
      return res.redirect(API_ROUTES.CATEGORY.ADD);
    }

    const existingCategory = await Category.findOne({
      name: { $regex: `^${name}$`, $options: "i" },
    });

    if (existingCategory) {
      req.flash("error", "Category already exists");
      return res.redirect(API_ROUTES.CATEGORY.ADD);
    }

    const category = new Category({
      name,
      description: req.body.description,
    });

    await category.save();

    req.flash("success", "Category added successfully!");
    return res.redirect(API_ROUTES.CATEGORY.LIST);
  } catch (error) {
    console.error(error.message);
    req.flash("error", "An error occurred while adding the category.");
    return res.redirect(API_ROUTES.CATEGORY.ADD);
  }
};

const renderUpdateCategory = async (req, res) => {
  try {
    const categoryId = req.params.id;
    const category = await Category.findById(categoryId);
    res.render("update-category", { category });
  } catch (error) {
    return next(error);
  }
};

const updateCategory = async (req, res) => {
  try {
    const id = req.params.id;
    const { name, description } = req.body;

    if (!name) {
      req.flash("error", "Name field is mandatory");
      return res.redirect(API_ROUTES.CATEGORY.UPDATE);
    }
    const existingCategory = await Category.findOne({
      name: { $regex: `^${name}$`, $options: "i" },
    });

    if (existingCategory) {
      req.flash("error", "Category already exists");
      return res.redirect(API_ROUTES.CATEGORY.ADD);
    }


    await Category.findByIdAndUpdate(id, { name, description }, { new: true });
    req.flash("success", "Category updated successfully!");
    return res.redirect(API_ROUTES.CATEGORY.LIST);
  } catch (error) {
    console.error(error.message);
    req.flash("error", "An error occurred while updating the category.");
    return res.redirect(`/admin/categories/update-category/${id}`);
  }
};

const unlistCategory = async (req, res) => {
  try {
    const id = req.params.id;

    if (!id) {
      req.flash("error", "invalid data");
      return res.redirect(API_ROUTES.CATEGORY.LIST);
    }
    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      { is_listed: false },
      { new: true }
    );

    if (!updatedCategory) {
      req.flash("error", "Failed unlisting category");
      return res.redirect(API_ROUTES.CATEGORY.LIST);
    }

    req.flash("success", "Category unlisted successfully");
    res.redirect(API_ROUTES.CATEGORY.LIST);
  } catch (error) {
    return next(error);
  }
};

const listCategory = async (req, res) => {
  try {
    const id = req.params.id;

    if (!id) {
      req.flash("error", "invalid data");
      return res.redirect(API_ROUTES.CATEGORY.LIST);
    }
    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      { is_listed: true },
      { new: true }
    );

    if (!updatedCategory) {
      req.flash("error", "Failed listing category");
      return res.redirect(API_ROUTES.CATEGORY.LIST);
    }

    req.flash("success", "Category listed successfully");
    res.redirect(API_ROUTES.CATEGORY.LIST);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  renderCategories,
  insertCategory,
  renderAddCategory,
  renderUpdateCategory,
  updateCategory,
  unlistCategory,
  listCategory,
};
