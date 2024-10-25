const mongoose = require('mongoose');
const cron = require('node-cron');
const ProductOffer = require("../models/productOffer");
const CategoryOffer = require("../models/categoryOffer");
const Product = require("../models/product"); 

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

  // Group category offers by categoryId and find the one with highest discount
  for (const offer of currentCategoryOffers) {
    const offerTime = getOfferTime(offer.startDate, offer.endDate);
    if (offerTime.status === "active") {
      const categoryId = offer.categoryId.toString();
      const category = categories.find(cat => cat._id.toString() === categoryId);
      
      if (!categoryOffers[categoryId] || offer.discountValue > categoryOffers[categoryId].discountValue) {
        categoryOffers[categoryId] = { 
          type: 'category', 
          discountValue: offer.discountValue, 
          endDate: offerTime.endDate, 
          name: category?.name,
          link: `/products/${category?.name}s`, 
          offerTime 
        };
      }
    }
  }

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

  const productsWithOffers = await Promise.all(products.map(async (product) => {
    const categoryId = product.category._id.toString();
    const productId = product._id.toString();
    let bestOffer = null;
    let discountedPrice = product.price;

    if (categoryOffers[categoryId]) {
      bestOffer = categoryOffers[categoryId];
    }

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

      await Product.findByIdAndUpdate(productId, {
        $set: {
          activeOffer: {
            type: bestOffer.type,
            discountValue: bestOffer.discountValue,
            endDate: bestOffer.endDate
          }
        }
      });
    } else {
      await Product.findByIdAndUpdate(productId, { $unset: { activeOffer: "" } });
    }

    return {
      ...product.toObject(),
      discountedPrice,
      originalPrice: product.price,
      hasDiscount: !!bestOffer
    };
  }));
  
  return { productsWithOffers, allActiveOffers: Array.from(allActiveOffers) };
};

const removeExpiredOffers = async () => {
  const currentDate = new Date();
  
  await Product.updateMany(
    { 'activeOffer.endDate': { $lt: currentDate } },
    { $unset: { activeOffer: "" } }
  );
};

cron.schedule('0 0 * * *', removeExpiredOffers);

module.exports = { applyOffers, calculateDiscountedPrice, removeExpiredOffers };