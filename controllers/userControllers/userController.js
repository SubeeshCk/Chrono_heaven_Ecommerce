const User = require("../../models/userModel");
const Category = require("../../models/category");
const Products = require("../../models/product");
const WishlistItem = require("../../models/wishListModel");
const { StatusCode } = require("../../config/StatusCode");
const { applyOffers,calculateDiscountedPrice } = require("../../config/offerUtils");


const renderHome = async (req, res, next) => {
  try {
    const categories = await Category.find({ is_listed: true });
    const unblockedCategoryIds = categories.map((category) => category._id);
    const productData = await Products.find({
      is_listed: true,
      category: { $in: unblockedCategoryIds },
    });

    const { productsWithOffers, allActiveOffers } = await applyOffers(
      productData,
      categories
    );

    const productsWithRatings = productsWithOffers.map(product => {
      const productReviews = product.reviews || [];
      const totalReviews = productReviews.length;
      
      const averageRating = totalReviews > 0
        ? (
            productReviews.reduce(
              (acc, review) => acc + review.starRating,
              0
            ) / totalReviews
          ).toFixed(1)
        : '0.0';

      return {
        ...product,
        totalReviews,
        averageRating: parseFloat(averageRating)
      };
    });

    const renderData = {
      productData: productsWithRatings,
      categories,
      allActiveOffers
    };

    res.render("home", { renderData });
  } catch (error) {
    return next(error);
  }
};

const renderProducts = async (req, res, next) => {
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

    const { productsWithOffers } = await applyOffers(productData, categories);

    const productsWithRatings = productsWithOffers.map(product => {
      const productReviews = product.reviews || [];
      const totalReviews = productReviews.length;
      
      const averageRating = totalReviews > 0
        ? (
            productReviews.reduce(
              (acc, review) => acc + review.starRating,
              0
            ) / totalReviews
          ).toFixed(1)
        : '0.0';

      return {
        ...product,
        totalReviews,
        averageRating: parseFloat(averageRating)
      };
    });

    res.render("products", { productData: productsWithRatings , title : "Shop"});
  } catch (error) {
    return next(error);
  }
};


const productDetails = async (req, res, next) => {
  try {
    const id = req.params.id;
    const product = await Products.findById(id);

    if (!product) {
      req.flash("error", "Something went wrong");
      return res.redirect("/products");
    }

    const categories = await Category.find({ is_listed: true });
    const { productsWithOffers } = await applyOffers([product], categories);

    const productWithRating = productsWithOffers.map(product => {
      const productReviews = product.reviews || [];
      const totalReviews = productReviews.length;
      
      const averageRating = totalReviews > 0
        ? (
            productReviews.reduce(
              (acc, review) => acc + review.starRating,
              0
            ) / totalReviews
          ).toFixed(1)
        : '0.0';

      return {
        ...product,
        totalReviews,
        averageRating: parseFloat(averageRating)
      };
    })[0];

    res.render("product-details", { 
      product: productWithRating,
      title : "Product-details"
    });
  } catch (error) {
    return next(error);
  }
};

const renderWomens = async (req, res, next) => {
  try {
    const womenCategory = await Category.findOne({ name: "women" });

    if (!womenCategory) {
      return res.status(StatusCode.NOT_FOUND).send("Women category not found");
    }

    const productData = await Products.find({
      category: womenCategory._id,
      is_listed: true,
    }).populate("category");

    const categories = await Category.find({ is_listed: true });

    const { productsWithOffers, allActiveOffers } = await applyOffers(
      productData,
      categories
    );

    const productsWithRatings = productsWithOffers.map(product => {
      const productReviews = product.reviews || [];
      const totalReviews = productReviews.length;
      
      const averageRating = totalReviews > 0
        ? (
            productReviews.reduce(
              (acc, review) => acc + review.starRating,
              0
            ) / totalReviews
          ).toFixed(1)
        : '0.0';

      return {
        ...product,
        totalReviews,
        averageRating: parseFloat(averageRating)
      };
    });

    res.render("womens", {
      productData: productsWithRatings,
      categories,
      pageCategory: "women",
      allActiveOffers,
      title : "Shop - Womens"
    });
  } catch (error) {
    return next(error);
  }
};

const renderMens = async (req, res, next) => {
  try {
    const mensCategory = await Category.findOne({ name: "men" });

    if (!mensCategory) {
      return res.status(StatusCode.NOT_FOUND).send("Men category not found");
    }

    const productData = await Products.find({
      category: mensCategory._id,
      is_listed: true,
    }).populate("category");

    const categories = await Category.find({ is_listed: true });

    const { productsWithOffers, allActiveOffers } = await applyOffers(
      productData,
      categories
    );

    const productsWithRatings = productsWithOffers.map(product => {
      const productReviews = product.reviews || [];
      const totalReviews = productReviews.length;
      
      const averageRating = totalReviews > 0
        ? (
            productReviews.reduce(
              (acc, review) => acc + review.starRating,
              0
            ) / totalReviews
          ).toFixed(1)
        : '0.0';

      return {
        ...product,
        totalReviews,
        averageRating: parseFloat(averageRating)
      };
    });

    res.render("mens", {
      productData: productsWithRatings,
      categories,
      pageCategory: "men",
      allActiveOffers,
      title : "Shop - Mens"
    });
  } catch (error) {
    return next(error);
  }
};

const sortProducts = async (req, res, next) => {
  try {
    const { sortBy, category } = req.query;
    let matchCondition = { is_listed: true };

    if (category && category !== "all") {
      const categoryDoc = await Category.findOne({
        name: category,
        is_listed: true,
      });
      if (!categoryDoc) {
        return res
          .status(StatusCode.NOT_FOUND)
          .json({ error: "Category not found" });
      }
      matchCondition.category = categoryDoc._id;
    } else {
      const listedCategories = await Category.find({ is_listed: true });
      const listedCategoryIds = listedCategories.map((cat) => cat._id);
      matchCondition.category = { $in: listedCategoryIds };
    }

    let products = await Products.find(matchCondition).populate("activeOffer");

    products = products.map((product) => {
      let effectivePrice = product.price;
      if (product.activeOffer && product.activeOffer.discountValue) {
        effectivePrice =
          product.price -
          product.price * (product.activeOffer.discountValue / 100);
      }
      return { ...product.toObject(), effectivePrice };
    });

    // Sort products
    switch (sortBy) {
      case "popularity":
        products.sort((a, b) => b.sales_count - a.sales_count);
        break;
      case "price-low-to-high":
        products.sort((a, b) => a.effectivePrice - b.effectivePrice);
        break;
      case "price-high-to-low":
        products.sort((a, b) => b.effectivePrice - a.effectivePrice);
        break;
      case "average-rating":
        products.sort((a, b) => b.average_rating - a.average_rating);
        break;
      case "featured":
        products.sort((a, b) => b.is_featured - a.is_featured);
        break;
      case "new-arrivals":
        products.sort((a, b) => b.createdAt - a.createdAt);
        break;
      case "name-az":
        products.sort((a, b) => a.product_name.localeCompare(b.product_name));
        break;
      case "name-za":
        products.sort((a, b) => b.product_name.localeCompare(a.product_name));
        break;
      case "in-stock":
        products = products.filter((p) => p.quantity > 0);
        products.sort((a, b) => b.quantity - a.quantity);
        break;
      default:
        products.sort((a, b) => b.createdAt - a.createdAt);
    }

    res.json({ products });
  } catch (error) {
    return next(error);
  }
};

const addToWishlist = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const { productId } = req.query;
    const product = await Products.findById(productId);

    let wishlistItem = await WishlistItem.findOne({
      userId: userId,
      "product.productId": productId,
    });

    if (!wishlistItem) {
      wishlistItem = new WishlistItem({
        userId: userId,
        product: [
          {
            productId: productId,
          },
        ],
      });
    }

    await wishlistItem.save();

    if (req.xhr) {
      res.json({ success: true });
    } else {
      res.redirect("/wishlist");
    }
  } catch (error) {
    if (req.xhr) {
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    } else {
      return next(error);
    }
  }
};

const renderWishlist = async (req, res, next) => {
  try {
    if (req.session.userId) {
      const userData = res.locals.userData;
      let wishlistItems = await WishlistItem.find({
        userId: req.session.userId,
      }).populate("product.productId");

      res.render("wishlist", {
        wishlistItems: wishlistItems,
        userData: userData,
        title : "Wishlist",
      });
    } else {
      res.redirect("/login");
    }
  } catch (error) {
    return next(error);
  }
};

const RemoveFromWishlist = async (req, res, next) => {
  try {
    const { productId } = req.query;

    if (req.session.userId) {
      await WishlistItem.findOneAndDelete({
        userId: req.session.userId,
        "product.productId": productId,
      });

      if (req.xhr) {
        res.status(200).json({ message: "Item removed from wishlist" });
      } else {
        res.redirect("/wishlist");
      }
    } else {
      if (req.xhr) {
        res.status(401).json({ message: "Unauthorized" });
      } else {
        res.redirect("/login");
      }
    }
  } catch (error) {
    if (req.xhr) {
      res.status(500).json({ message: "Internal Server Error" });
    } else {
      return next(error);
    }
  }
};

module.exports = {
  renderHome,
  renderProducts,
  productDetails,
  renderMens,
  renderWomens,
  sortProducts,
  renderWishlist,
  addToWishlist,
  RemoveFromWishlist,
};
