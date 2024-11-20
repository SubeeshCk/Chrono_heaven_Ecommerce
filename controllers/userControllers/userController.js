const User = require("../../models/userModel");
const Category = require("../../models/category");
const Products = require("../../models/product");
const WishlistItem = require("../../models/wishListModel");
const { applyOffers,calculateDiscountedPrice } = require("../../config/offerUtils");
const statusCode = require("../../config/statusCode");


const renderHome = async (req, res, next) => {
  try {
    const categories = await Category.find({ is_listed: true });
    const unblockedCategoryIds = categories.map((category) => category._id);
    const productData = await Products.find({
      is_listed: true,
      category: { $in: unblockedCategoryIds },
    })
    .sort({ createdAt: -1 })
    .limit(8);

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
    const userData = res.locals.userData;
    const renderData = {
      productData: productsWithRatings,
      categories,
      allActiveOffers,
      userData

    };

    res.render("home", { renderData });
  } catch (error) {
    return next(error);
  }
};

const renderProducts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 12;
    const skip = (page - 1) * limit;

    const categories = await Category.find({ is_listed: true });
    const unblockedCategoryIds = categories.map((category) => category._id);
    
    const totalProducts = await Products.countDocuments({
      is_listed: true,
      category: { $in: unblockedCategoryIds },
    });

    const productData = await Products.find({
      is_listed: true,
      category: { $in: unblockedCategoryIds },
    })
    .skip(skip)
    .limit(limit);

    if (!productData.length && page === 1) {
      req.flash("error", "No products available");
      return res.redirect("/products");
    }

    if (!productData.length && page > 1) {
      return res.redirect(`/products?page=${Math.ceil(totalProducts / limit)}`);
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

    const totalPages = Math.ceil(totalProducts / limit);
    const pagination = {
      currentPage: page,
      totalPages: totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      nextPage: page + 1,
      prevPage: page - 1,
      lastPage: totalPages,
      pages: Array.from({ length: totalPages }, (_, i) => i + 1)
    };

    const userData = res.locals.userData;
    res.render("products", { 
      productData: productsWithRatings, 
      pagination,
      userData,
      title: "Shop",
    });
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

    const relatedProducts = await Products.find({
      category: product.category,
      _id: { $ne: product._id }
    })
    .sort({ createdAt: -1 })
    .limit(4);

    const { productsWithOffers: relatedProductsWithOffers } = await applyOffers(relatedProducts, categories);

    res.render("product-details", { 
      product: productWithRating,
      relatedProducts: relatedProductsWithOffers,
      title : "Product-details",
    });
  } catch (error) {
    return next(error);
  }
};

const renderWomens = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 12; 
    const skip = (page - 1) * limit;

    const womenCategory = await Category.findOne({ name: "women" });

    if (!womenCategory) {
      return res.status(statusCode.NOT_FOUND).send("Women category not found");
    }

    const totalProducts = await Products.countDocuments({
      category: womenCategory._id,
      is_listed: true,
    });

    const productData = await Products.find({
      category: womenCategory._id,
      is_listed: true,
    })
    .populate("category")
    .skip(skip)
    .limit(limit);

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

    const totalPages = Math.ceil(totalProducts / limit);
    const pagination = {
      currentPage: page,
      totalPages: totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      nextPage: page + 1,
      prevPage: page - 1,
      lastPage: totalPages,
      pages: Array.from({ length: totalPages }, (_, i) => i + 1)
    };

    if (!productData.length && page === 1) {
      req.flash("error", "No women's products available");
      return res.redirect("/products");
    }

    if (!productData.length && page > 1) {
      return res.redirect(`/products/womens?page=${Math.ceil(totalProducts / limit)}`);
    }
    const userData = res.locals.userData;

    res.render("womens", {
      productData: productsWithRatings,
      categories,
      pageCategory: "women",
      allActiveOffers,
      pagination, 
      userData,
      title: "Shop - Womens",
    });
  } catch (error) {
    return next(error);
  }
};

const renderMens = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 12; 
    const skip = (page - 1) * limit;

    const mensCategory = await Category.findOne({ name: "men" });
    if (!mensCategory) {
      return res.status(statusCode.NOT_FOUND).send("Men category not found");
    }

    const totalProducts = await Products.countDocuments({
      category: mensCategory._id,
      is_listed: true,
    });

    const productData = await Products.find({
      category: mensCategory._id,
      is_listed: true,
    })
      .populate("category")
      .skip(skip)
      .limit(limit);

    const categories = await Category.find({ is_listed: true });
    
    const { productsWithOffers, allActiveOffers } = await applyOffers(
      productData,
      categories
    );

    const productsWithRatings = productsWithOffers.map(product => {
      const productReviews = product.reviews || [];
      const totalReviews = productReviews.length;
      const averageRating = totalReviews > 0
        ? (productReviews.reduce((acc, review) => acc + review.starRating, 0) / totalReviews).toFixed(1)
        : '0.0';
      
      return {
        ...product,
        totalReviews,
        averageRating: parseFloat(averageRating)
      };
    });

    const totalPages = Math.ceil(totalProducts / limit);
    const pagination = {
      currentPage: page,
      totalPages: totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      nextPage: page + 1,
      prevPage: page - 1,
      lastPage: totalPages,
      pages: Array.from({ length: totalPages }, (_, i) => i + 1)
    };

    if (!productData.length && page === 1) {
      req.flash("error", "No men's products available");
      return res.redirect("/products");
    }

    if (!productData.length && page > 1) {
      return res.redirect(`/products/mens?page=${Math.ceil(totalProducts / limit)}`);
    }
    const userData = res.locals.userData;

    res.render("mens", {
      productData: productsWithRatings,
      categories,
      pageCategory: "men",
      allActiveOffers,
      pagination,
      userData, 
      title: "Shop - Mens"
    });
  } catch (error) {
    return next(error);
  }
};


const sortProducts = async (req, res, next) => {
  try {
    const { sortBy, category, search, page = 1 } = req.query;
    const limit = 12;
    const skip = (page - 1) * limit;
    
    let matchCondition = { is_listed: true };

    if (category && category !== "all") {
      const categoryDoc = await Category.findOne({
        name: category,
        is_listed: true,
      });
      if (!categoryDoc) {
        return res.status(statusCode.NOT_FOUND).json({ error: "Category not found" });
      }
      matchCondition.category = categoryDoc._id;
    } else {
      const listedCategories = await Category.find({ is_listed: true });
      const listedCategoryIds = listedCategories.map((cat) => cat._id);
      matchCondition.category = { $in: listedCategoryIds };
    }

    if (search) {
      matchCondition.product_name = { $regex: search, $options: 'i' };
    }

    const totalProducts = await Products.countDocuments(matchCondition);

    let products = await Products.find(matchCondition)
      .populate("category")
      .populate("activeOffer")
      .populate("reviews")
      .skip(skip)
      .limit(limit);

    let wishlistItems = [];
    if (req.session.userId) {
      wishlistItems = await WishlistItem.find({ 
        userId: req.session.userId 
      }).distinct('product.productId');
    }
    products = products.map((product) => {
      let effectivePrice = product.price;
      if (product.activeOffer && product.activeOffer.discountValue) {
        effectivePrice = product.price - (product.price * (product.activeOffer.discountValue / 100));
      }

      const productReviews = product.reviews || [];
      const totalReviews = productReviews.length;
      const averageRating = totalReviews > 0
        ? (productReviews.reduce((acc, review) => acc + review.starRating, 0) / totalReviews).toFixed(1)
        : '0.0';

      const isInWishlist = wishlistItems.some(id => id.equals(product._id));

      return {
        ...product.toObject(),
        effectivePrice,
        totalReviews,
        averageRating: parseFloat(averageRating),
        isInWishlist
      };
    });

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
        products.sort((a, b) => parseFloat(b.averageRating) - parseFloat(a.averageRating));
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

    const totalPages = Math.ceil(totalProducts / limit);
    const pagination = {
      currentPage: parseInt(page),
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      nextPage: parseInt(page) + 1,
      prevPage: parseInt(page) - 1,
      lastPage: totalPages
    };

    res.json({ 
      products,
      pagination,
      totalProducts 
    });

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
        .status(statusCode.INTERNAL_SERVER_ERROR)
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

      res.render("wishList", {
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
        res.status(statusCode.OK).json({ message: "Item removed from wishlist" });
      } else {
        res.redirect("/wishlist");
      }
    } else {
      if (req.xhr) {
        res.status(statusCode.UNAUTHORIZED).json({ message: "Unauthorized" });
      } else {
        res.redirect("/login");
      }
    }
  } catch (error) {
    if (req.xhr) {
      res.status(statusCode.INTERNAL_SERVER_ERROR).json({ message: "Internal Server Error" });
    } else {
      return next(error);
    }
  }
};

const renderAbout = async (req, res, next) => {
try {
  res.render("about",{title : "About"});
} catch (error) {
  return next(error);
}
}

const renderContact = async (req, res, next) => {
  try {
    res.render("contact",{title : "Contact"});
  } catch (error) {
    return next(error);
  }
  }

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
  renderAbout,
  renderContact,
};
