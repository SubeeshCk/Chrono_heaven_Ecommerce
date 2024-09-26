const User = require("../../models/userModel");
const Category = require("../../models/category");
const Products = require("../../models/product");
const { statusCode } = require("../../config/statusCode");

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
        req.flash("error", "Your account is blocked");
        userData = null;
      }
    }
    res.render("home", { productData });

  } catch (error) {
    console.log(error.message);
    res.status(statusCode.INTERNAL_SERVER_ERROR).send("An error occurred");
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
    console.log(error.message);
    res.status(statusCode.INTERNAL_SERVER_ERROR).send('An error occurred');
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
    console.log(error.message);
    res.status(statusCode.INTERNAL_SERVER_ERROR).send('An error occurred');  
  }
};

const renderWomens = async (req, res) => {
  try {
    const womenCategory = await Category.findOne({ name: "women" });

    if (!womenCategory) {
      return res.status(statusCode.NOT_FOUND).send("Women category not found");
    }

    const productData = await Products.find({
      category: womenCategory._id,
      is_listed: true,
    }).populate("category");

    const categories = [womenCategory];

    res.render("womens", { productData, categories });

  } catch (error) {
    console.log(error.message);
    res.status(statusCode.INTERNAL_SERVER_ERROR).send("Internal Server Error");
  }
};

const renderMens = async (req, res) => {
  try {
    const mensCategory = await Category.findOne({ name: "men" });

    if (!mensCategory) {
      return res.status(statusCode.NOT_FOUND).send("Men category not found");
    }

    const productData = await Products.find({
      category: mensCategory._id,
      is_listed: true,
    }).populate("category");

    const categories = [mensCategory];

    res.render("mens", { productData, categories });
  } catch (error) {
    console.log(error.message);
    res.status(statusCode.INTERNAL_SERVER_ERROR).send("Internal Server Error");
  }
};

module.exports = {
  renderHome,
  renderProducts,
  productDetails,
  renderMens,
  renderWomens,
};
