const CartItems = require("../models/cartModel");

const setCartCount = async (req, res, next) => {
    try {
        if (req.session.userId) {
            const userId = req.session.userId;
            
            const cartCount = await CartItems.countDocuments({ userId });
            
            res.locals.cartCount = cartCount;
        } else {
            res.locals.cartCount = 0;
        }
        next(); 
    } catch (error) {
        console.log(error.message);
        next(error); 
    }
};

module.exports = setCartCount;
