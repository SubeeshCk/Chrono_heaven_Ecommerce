const User = require("../../models/userModel");
const Category = require("../../models/category");
const Products = require("../../models/product");
const WishlistItem = require("../../models/wishListModel"); // Assuming you have this model
const { StatusCode } = require("../../config/StatusCode");
const { applyOffers, calculateDiscountedPrice } = require("../../config/offerUtils");

const renderHome = async (req, res, next) => {
  try {
    const categories = await Category.find({ is_listed: true });
    const unblockedCategoryIds = categories.map((category) => category._id);
    const productData = await Products.find({ 
      is_listed: true, 
      category: { $in: unblockedCategoryIds },
    });

    const { productsWithOffers, allActiveOffers } = await applyOffers(productData, categories);

    const renderData = { 
      productData: productsWithOffers, 
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

    res.render("products", { productData: productsWithOffers });
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

    res.render("product-details", { product: productsWithOffers[0] });

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

    const { productsWithOffers, allActiveOffers } = await applyOffers(productData, categories);

    res.render("womens", { productData: productsWithOffers, categories, pageCategory: "women", allActiveOffers });

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

    const { productsWithOffers, allActiveOffers } = await applyOffers(productData, categories);

    res.render("mens", { productData: productsWithOffers, categories, pageCategory: "men", allActiveOffers });
  } catch (error) {
    return next(error);
  }
};

const sortProducts = async (req, res, next) => {
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

const addToWishlist = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const { productId } = req.query;
    const product = await Products.findById(productId);
    
    const categories = await Category.find({ is_listed: true });
    const { productsWithOffers } = await applyOffers([product], categories);
    const productWithOffer = productsWithOffers[0];

    let wishlistItem = await WishlistItem.findOne({
      userId: userId,
      "product.productId": productId,
    });
    
    if (!wishlistItem) {
      wishlistItem = new WishlistItem({
        userId: userId,
        product: [{
          productId: productId,
          discountedPrice: productWithOffer.discountedPrice,
          discountPercent: productWithOffer.hasDiscount ? 
            ((product.price - productWithOffer.discountedPrice) / product.price) * 100 : 0
        }],
      });
    } else {
      wishlistItem.product[0].discountedPrice = productWithOffer.discountedPrice;
      wishlistItem.product[0].discountPercent = productWithOffer.hasDiscount ? 
        ((product.price - productWithOffer.discountedPrice) / product.price) * 100 : 0;
    }
    
    await wishlistItem.save();
    res.redirect("/wishlist");
  } catch (error) {
    console.log(error.message)
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const renderWishlist = async (req, res, next) => {
  try {
    if (req.session.userId) {
      const userData = await User.findById(req.session.userId);
      let wishlistItems = await WishlistItem.find({
        userId: req.session.userId,
      }).populate("product.productId");

      const categories = await Category.find({ is_listed: true });
      const products = wishlistItems.map(item => item.product[0].productId);
      const { productsWithOffers } = await applyOffers(products, categories);

      // Update prices for each item
      wishlistItems = wishlistItems.map((item, index) => {
        const updatedProduct = productsWithOffers[index];
        item.product[0].discountedPrice = updatedProduct.discountedPrice;
        item.product[0].discountPercent = updatedProduct.hasDiscount ? 
          ((updatedProduct.originalPrice - updatedProduct.discountedPrice) / updatedProduct.originalPrice) * 100 : 0;
        return item;
      });

      await Promise.all(wishlistItems.map(item => item.save()));

      res.render("wishlist", {
        wishlistItems: wishlistItems,
        userData: userData,
      });
    } else {
      res.redirect("/login");
    }
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
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
      res.status(200).json({ message: "Item removed from wishlist" });
    } else {
      res.status(401).json({ message: "Unauthorized" });
    }
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
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