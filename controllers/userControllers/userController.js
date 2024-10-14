const User = require("../../models/userModel");
const Category = require("../../models/category");
const Products = require("../../models/product");
const { StatusCode } = require("../../config/StatusCode");


const renderHome = async (req, res) => {
  try {
    const categories = await Category.find({ is_listed: true });
    const unblockedCategoryIds = categories.map((category) => category._id);

    const productData = await Products.find({
      is_listed: true,
      category: { $in: unblockedCategoryIds },
    });

    let userData = res.locals.userData; 

    if (userData) {
      if (userData.block) {
        req.session.destroy((err) => {
          if (err) {
            console.log("Error destroying session:", err.message);
          }
        });
        userData = null;
      }
    }
    res.render("home", { productData });

  } catch (error) {
    return next(error);
  }
};

const renderProducts = async (req, res) => {
  try {
    const categories = await Category.find({ is_listed: true });
    const unblockedCategoryIds = categories.map((category) => category._id);

    const productData = await Products.find({
      is_listed: true,
      category: { $in: unblockedCategoryIds },
    });

    if (!productData.length) {
      req.flash("error", "No products available");
      return res.redirect("/products");
    }

    res.render("products", { productData });
  } catch (error) {
    return next(error);
  }
};

const productDetails = async (req, res) => {
  try {
    const id = req.params.id;
    const product = await Products.findById(id);

    if (!product) {
      req.flash("error", "Something went wrong");
      return res.redirect("/products");
    }
    
    res.render("product-details", { product });

  } catch (error) {
    return next(error); 
  }
};

const renderWomens = async (req, res) => {
  try {
    const womenCategory = await Category.findOne({ name: "women" });

    if (!womenCategory) {
      return res.status(StatusCode.NOT_FOUND).send("Women category not found");
    }

    const productData = await Products.find({
      category: womenCategory._id,
      is_listed: true,
    }).populate("category");

    const categories = [womenCategory];

    res.render("womens", { productData, categories, pageCategory: "women" });

  } catch (error) {
    return next(error);
  }
};

const renderMens = async (req, res) => {
  try {
    const mensCategory = await Category.findOne({ name: "men" });

    if (!mensCategory) {
      return res.status(StatusCode.NOT_FOUND).send("Men category not found");
    }

    const productData = await Products.find({
      category: mensCategory._id,
      is_listed: true,
    }).populate("category");

    const categories = [mensCategory];

    res.render("mens", { productData, categories, pageCategory: "men" });
  } catch (error) {
    return next(error);
  }
};

const sortProducts = async (req, res) => {
  try {
    const { sortBy, category } = req.query;
    let sortOption = {};
    let aggregatePipeline = [];

    let matchCondition = { is_listed: true };

    if (category && category !== 'all') {
      const categoryDoc = await Category.findOne({ name: category, is_listed: true });
      if (!categoryDoc) {
        return res.status(StatusCode.NOT_FOUND).json({ error: 'Category not found' });
      }
      matchCondition.category = categoryDoc._id;

    } else {
      const listedCategories = await Category.find({ is_listed: true });
      const listedCategoryIds = listedCategories.map(cat => cat._id);
      matchCondition.category = { $in: listedCategoryIds };
    }

    aggregatePipeline.push({ $match: matchCondition });

    switch (sortBy) {
      case 'popularity':
        sortOption = { sales_count: -1 };
        break;
      case 'price-low-to-high':
        sortOption = { price: 1 };
        break;
      case 'price-high-to-low':
        sortOption = { price: -1 };
        break;
      case 'average-rating':
        sortOption = { average_rating: -1 };
        break;
      case 'featured':
        sortOption = { is_featured: -1 };
        break;
      case 'new-arrivals':
        sortOption = { createdAt: -1 };
        break;
      case 'name-az':
        aggregatePipeline.push({
          $addFields: {
            lowercaseName: { $toLower: "$product_name" }
          }
        });
        sortOption = { lowercaseName: 1 };
        break;
      case 'name-za':
        aggregatePipeline.push({
          $addFields: {
            lowercaseName: { $toLower: "$product_name" }
          }
        });
        sortOption = { lowercaseName: -1 };
        break;
      case 'in-stock':
        aggregatePipeline.push({
          $match: {
            quantity: { $gt: 0 }
          }
        });
        sortOption = { stock: -1 };
        break;
      default:
        sortOption = { createdAt: -1 };
    }

    aggregatePipeline.push({ $sort: sortOption });

    const productData = await Products.aggregate(aggregatePipeline);

    res.json({ products: productData });
  } catch (error) {
    return next(error);
  }
};


module.exports = {
  renderHome,
  renderProducts,
  productDetails,
  renderMens,
  renderWomens,
  sortProducts
};
