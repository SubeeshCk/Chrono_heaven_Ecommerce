const ProductOffer = require("../models/productOffer");
const CategoryOffer = require("../models/categoryOffer");

const getOfferTime = (startDate, endDate) => {
  const now = new Date();
  const end = new Date(endDate);
  if (now > end) {
    return { status: "ended", timeLeft: null, endDate };
  } else {
    const timeDifference = end - now;
    const days = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeDifference % (1000 * 60)) / 1000);
    return { 
      status: "active", 
      timeLeft: { days, hours, minutes, seconds }, 
      endDate,
    };
  }
};

const calculateDiscountedPrice = (productPrice, discountPercent) => {
  let discountedPrice = productPrice - (productPrice * discountPercent) / 100;
  return Math.round(discountedPrice);
};

const applyOffers = async (products, categories) => {
  const currentProductOffers = await ProductOffer.find();
  const currentCategoryOffers = await CategoryOffer.find();

  const categoryOffers = {};
  const productOffers = {};

  // Process category offers
  for (const offer of currentCategoryOffers) {
    const offerTime = getOfferTime(offer.startDate, offer.endDate);
    if (offerTime.status === "active") {
      categoryOffers[offer.categoryId.toString()] = { 
        type: 'category', 
        discountValue: offer.discountValue, 
        endDate: offerTime.endDate, 
        name: categories.find(cat => cat._id.toString() === offer.categoryId.toString())?.name,
        link: `/products/${offer.categoryId}`, 
        offerTime 
      };
    }
  }

  // Process product offers
  currentProductOffers.forEach(offer => {
    const offerTime = getOfferTime(offer.startDate, offer.endDate);
    if (offerTime.status === "active") {
      productOffers[offer.productId.toString()] = { 
        type: 'product', 
        discountValue: offer.discountValue, 
        endDate: offerTime.endDate, 
        offerTime 
      };
    }
  });

  const allActiveOffers = new Set();

  const productsWithOffers = products.map(product => {
    const categoryId = product.category._id.toString(); // Access _id from populated category
    const productId = product._id.toString();
    let bestOffer = null;
    let discountedPrice = product.price;

    // Check for category offer
    if (categoryOffers[categoryId]) {
      bestOffer = categoryOffers[categoryId];
    }

    // Check for product offer
    if (productOffers[productId]) {
      if (!bestOffer || productOffers[productId].discountValue > bestOffer.discountValue) {
        bestOffer = { 
          ...productOffers[productId], 
          name: product.product_name, 
          link: `/product-details/${productId}` 
        };
      }
    }

    if (bestOffer) {
      discountedPrice = calculateDiscountedPrice(product.price, bestOffer.discountValue);
      bestOffer.imageSource = `/adminAssets/uploads/product_images/${product.images[0]}`;
      allActiveOffers.add(bestOffer);
    }

    return {
      ...product.toObject(),
      discountedPrice,
      originalPrice: product.price,
      hasDiscount: !!bestOffer
    };
  });
  
  return { productsWithOffers, allActiveOffers: Array.from(allActiveOffers) };
};

module.exports = { applyOffers, calculateDiscountedPrice };