const User = require("../../models/userModel");
const Products = require("../../models/product");
const CartItem = require("../../models/cartModel");
const { StatusCode } = require("../../config/StatusCode");


const renderCart = async (req, res) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.redirect("/login");
    }

    const userData = await User.findById(userId);
    const cartItems = await CartItem.find({ userId: userId }).populate(
      "product.productId"
    );

    const updatedCartItems = cartItems.map((item) => {
      item.product = item.product.map((prod) => {
        prod.totalPrice = Math.round(prod.price * prod.quantity);
        return prod;
      });
      return item;
    });

    const totalPrice = updatedCartItems.reduce((acc, item) => 
      acc + item.product.reduce((prodAcc, prod) => prodAcc + prod.totalPrice, 0), 0
    );

    req.session.cartItems = updatedCartItems;
    return res.render("cart", {
      cartItems: updatedCartItems,
      userData: userData,
      totalPrice: totalPrice
    });
  } catch (error) {
    console.log(error.message);
    res.status(StatusCode.INTERNAL_SERVER_ERROR).send("Internal Server Error");
  }
};

const addToCart = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { productId } = req.params;

    const product = await Products.findById(productId);

    if (!product) {
      return res.status(StatusCode.NOT_FOUND).send("Product not found");
    }

    const price = product.price;
    const discount = product.discount || 0;
    const discountedPrice = Math.round(price - price * (discount / 100));
    
    let cartItem = await CartItem.findOne({
      userId: userId,
      "product.productId": productId,
    });

    if (!cartItem) {
      cartItem = new CartItem({
        userId: userId,
        product: [
          {
            productId: productId,
            quantity: 1,
            offerDiscount: discount,
            totalPrice: discountedPrice,
            price: discountedPrice,
          },
        ],
      });
    } else {
      const existingProductIndex = cartItem.product.findIndex(
        (item) => item.productId.toString() === productId
      );

      if (existingProductIndex !== -1) {
        
        cartItem.product[existingProductIndex].quantity += 1;
        cartItem.product[existingProductIndex].totalPrice = 
          cartItem.product[existingProductIndex].quantity * discountedPrice;
        cartItem.product[existingProductIndex].price = discountedPrice;
      } else {
        cartItem.product.push({
          productId: productId,
          quantity: 1,
          offerDiscount: discount,
          totalPrice: discountedPrice,
          price: discountedPrice,
        });
      }
    }

    await cartItem.save();
    res.redirect("/cart");
  } catch (error) {
    console.log(error.message);
    res.status(StatusCode.INTERNAL_SERVER_ERROR).send("Internal Server Error");
  }
};



module.exports = {
  renderCart,
  addToCart
};