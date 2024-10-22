const WishlistItem = require("../models/wishListModel");

const setWishlistData = async (req, res, next) => {
    try {
        if (req.session.userId) {
            const userId = req.session.userId;

            const wishlistData = await WishlistItem.find({ userId });
            
            const wishListCount = wishlistData.length;

            const wishlistProductIds = new Set(wishlistData.flatMap(item => {
                return item.product.map(prod => {
                    return prod.productId ? prod.productId.toString() : null;
                }).filter(id => id !== null);
            }));

            res.locals.wishListCount = wishListCount;
            res.locals.wishlistProductIds = wishlistProductIds;
        } else {
            res.locals.wishListCount = 0;
            res.locals.wishlistProductIds = new Set();
        }
        next(); 
    } catch (error) {
        console.error('Error in setWishlistData middleware:', error.message);
        next(error); 
    }
};

module.exports = setWishlistData;