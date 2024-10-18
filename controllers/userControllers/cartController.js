const User = require("../../models/userModel");
const Products = require("../../models/product");
const CartItem = require("../../models/cartModel");
const { StatusCode } = require("../../config/StatusCode");
const Address = require("../../models/userAddress");
const Order = require("../../models/orderModel");


const addToCart = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const productId = req.params.id;
    const quantity = parseInt(req.query.quantity) || 1;

    const product = await Products.findById(productId);

    if (!product) {
      return res.status(StatusCode.NOT_FOUND).send("Product not found");
    }

    if (product.quantity < quantity) {
      return res
        .status(StatusCode.BAD_REQUEST)
        .send("Not enough stock available");
    }

    const price = product.price;
    const discount = product.activeOffer.discountValue || 0;
    const discountPrice = Math.round(price * (discount / 100));
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
            price: price,
            quantity: quantity,
            offerDiscount: discountPrice * quantity,
            totalPrice: price * quantity,
            totalPriceWithOffer: discountedPrice * quantity,
          },
        ],
      });
    } else {
      const existingProductIndex = cartItem.product.findIndex(
        (item) => item.productId.toString() === productId
      );

      if (existingProductIndex !== -1) {
        const newQuantity =
          cartItem.product[existingProductIndex].quantity + quantity;

        if (newQuantity > product.quantity) {
          return res
            .status(StatusCode.BAD_REQUEST)
            .send("Not enough stock available");
        }
        if (newQuantity > 5) {
          return res
            .status(StatusCode.BAD_REQUEST)
            .send("You can purchase maximum 5 products in an order");
        }

        cartItem.product[existingProductIndex].quantity = newQuantity;
        cartItem.product[existingProductIndex].totalPriceWithOffer =
          newQuantity * discountedPrice;
        cartItem.product[existingProductIndex].price = price;
        cartItem.product[existingProductIndex].totalPrice = newQuantity * price;
        cartItem.product[existingProductIndex].offerDiscount =
          discountPrice * newQuantity;
      } else {
        cartItem.product.push({
          productId: productId,
          quantity: quantity,
          offerDiscount: discountPrice * quantity,
          totalPriceWithOffer: discountedPrice * quantity,
          totalPrice: price * quantity,
          price: price,
        });
      }
    }

    await cartItem.save();
    res.redirect("/cart");
  } catch (error) {
    return next(error);
  }
};


const renderCart = async (req, res, next) => {
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

    const totalPrice = updatedCartItems.reduce(
      (acc, item) =>
        acc +
        item.product.reduce((prodAcc, prod) => prodAcc + prod.totalPrice, 0),
      0
    );

    req.session.cartItems = updatedCartItems;
    return res.render("cart", {
      cartItems: updatedCartItems,
      userData: userData,
      totalPrice: totalPrice,
    });
  } catch (error) {
    return next(error);
  }
};


const updateCartItem = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const { productId, quantityChange } = req.body;

    const cartItems = await CartItem.find({ userId }).populate(
      "product.productId"
    );

    if (!cartItems || cartItems.length === 0) {
      return res
        .status(404)
        .json({ error: true, message: "No cart items found for the user" });
    }

    const cartItemToUpdate = cartItems.find(
      (item) => item.product[0].productId.toString() === productId
    );

    if (!cartItemToUpdate) {
      return res
        .status(404)
        .json({ error: true, message: "Cart item not found" });
    }

    const product = cartItemToUpdate.product[0];
    const newQuantity = product.quantity + parseInt(quantityChange);

    if (newQuantity < 1) {
      return res
        .status(400)
        .json({ error: true, message: "Quantity cannot be less than 1" });
    }

    if (newQuantity > 5) {
      return res.status(400).json({
        error: true,
        message: "You can purchase maximum 5 products in an order",
      });
    }

    const currentProduct = await Products.findById(product.productId);
    if (!currentProduct) {
      return res
        .status(404)
        .json({ error: true, message: "Product not found" });
    }

    if (currentProduct.quantity === 0) {
      return res
        .status(400)
        .json({ error: true, message: "This product is out of stock" });
    }

    if (newQuantity > currentProduct.quantity) {
      return res
        .status(400)
        .json({ error: true, message: `Only ${currentProduct.quantity} item(s) available in stock` });
    }

    const price = currentProduct.price;
    const discount = currentProduct.activeOffer.discountValue || 0;
    const discountPrice = Math.round(price * (discount / 100));
    const discountedPrice = Math.round(price - price * (discount / 100));

    const newTotalPrice = price * newQuantity;
    const newTotalPriceWithOffer = discountedPrice * newQuantity;
    const newOfferDiscount = discountPrice * newQuantity;

    await CartItem.findOneAndUpdate(
      { _id: cartItemToUpdate._id, "product.productId": product.productId },
      {
        $set: {
          "product.$.quantity": newQuantity,
          "product.$.totalPrice": newTotalPrice,
          "product.$.totalPriceWithOffer": newTotalPriceWithOffer,
          "product.$.offerDiscount": newOfferDiscount,
        },
      },
      { new: true }
    );

    const updatedCartItems = await CartItem.find({ userId }).populate(
      "product.productId"
    );

    res.status(200).json({
      message: "Cart items updated successfully",
      cartItems: updatedCartItems,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: true, message: "Internal server error" });
  }
};

const checkStock = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const cartItems = await CartItem.find({ userId }).populate(
      "product.productId"
    );

    const outOfStockItems = cartItems.filter(item => 
      item.product[0].quantity > item.product[0].productId.quantity
    );

    if (outOfStockItems.length > 0) {
      return res.json({ outOfStock: true, items: outOfStockItems });
    }

    res.json({ outOfStock: false });
  } catch (error) {
    return next(error);
  }
};



const removeCartItem = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const { productId } = req.body;

    const cartItem = await CartItem.findOne({
      userId,
      "product.productId": productId,
    }).populate("product.productId");
    
    const product = cartItem.product[0];
    await CartItem.deleteOne({
      userId: userId,
      "product.productId": productId,
    });

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const loadCheckout = async (req, res, next) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.redirect("/login");
    }

    const cartItems = await CartItem.find({ userId }).populate("product.productId");
    
    const userData = await User.findById(userId);
    const addressData = await Address.find({ userId });

    let subtotal = 0;
    let totalProductCount = 0;

    cartItems.forEach((cartItem) => {
      totalProductCount += cartItem.product[0].quantity
    });

    subtotal = cartItems.reduce((acc, item)=> acc + (item.product[0].totalPrice),0);
    const totalAmount = cartItems.reduce((acc, item)=> acc + (item.product[0].totalPriceWithOffer),0);

    let deliveryCharge = 0;

      if (totalAmount < 10000) {
        deliveryCharge = 50;
      } else if (totalAmount < 20000) {
        deliveryCharge = 30;
      } else if (totalAmount < 30000) {
        deliveryCharge = 20;
      }

    const total = totalAmount + deliveryCharge ;

    res.render("checkout", {
      cartItems,
      subtotal,
      total,
      userData,
      addressData,
      deliveryCharge,
      totalProductCount,
    });


  } catch (error) {
    console.log(error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

const addNewAddress = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      res.redirect("/login");
    } else {
      const userData = await User.findById(userId);
      const addressData = await Address.find({ userId });
      res.render("addCheckoutAddress", { userData , addressData });
    }
  } catch (error) {
    return next(error);
  }
};


const insertCheckoutAddress = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const { name,pincode, locality, address, city, state, addresstype } = req.body;

    if (!userId) {
      req.flash("error", "You must be logged in to perform this action");
      return res.redirect("/login");
    }

    const trimmedName = name.trim();
    const trimmedPincode = pincode.trim();
    const trimmedLocality = locality.trim();
    const trimmedAddress = address.trim();
    const trimmedCity = city.trim();
    const trimmedState = state.trim();
    const trimmedAddresstype = addresstype.trim();

    if (!trimmedName || !trimmedPincode || !trimmedLocality || !trimmedAddress || !trimmedCity || !trimmedState || !trimmedAddresstype) {
      req.flash("error", "All fields are required");
      return res.redirect("/cart/checkout/addNewAddress");
    }
   

    let numRegex = /^\d+$/
    const pincodeRegex = /^\d{6}$/;  
    if (!pincodeRegex.test(trimmedPincode)) {
      req.flash("error", "Pincode must contain exactly 6 digits");
      return res.redirect("/cart/checkout/addNewAddress");
    }

    const allFieldsAreSpaces = Object.values(req.body).every(
      (value) => value.trim() === ""
    );
    if (allFieldsAreSpaces) {
      req.flash("error", "All fields cannot be empty or contain only spaces");
      return res.redirect("/cart/checkout/addNewAddress");
    }
    if(numRegex.test(trimmedLocality||trimmedAddress||trimmedCity||trimmedCity)){
      req.flash("error", "Enter a valid address");
      return res.redirect("/cart/checkout/addNewAddress");
    }

    const newAddress = new Address({
      userId,
      name,
      pincode: trimmedPincode,
      locality: trimmedLocality,
      address: trimmedAddress,
      city: trimmedCity,
      state: trimmedState,
      addresstype: trimmedAddresstype,
    });

    const userAddress = await newAddress.save();

    req.session.useraddress = userAddress;
    req.flash("success", "Address added successfully");
    res.redirect("/cart/checkout");
  } catch (error) {
    console.error(error); 
    req.flash("error", "Internal server error");
    res.redirect("/cart/checkout/addNewAddress");
  }
};

const removeAddress = async (req, res, next) => {
  try {
    const addressId = req.params.id;
    await Address.findByIdAndDelete(addressId);
    res.json({ success: true, message: "Address removed successfully" });
  } catch (error) {
    return next(error);
  }
};

const placeOrder = async (req, res, next) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Please login to place an order.",
      });
    }

    const { selectedAddress, paymentMethod, subtotal, deliveryCharge, totalAmount, discount } = req.body;
    
    if (!selectedAddress) {
      return res.status(400).json({
        success: false,
        message: "Please select a delivery address.",
      });
    } else if (!paymentMethod) {
      return res.status(400).json({
        success: false,
        message: "Please select a payment method.",
      });
    }

    const cartItems = await CartItem.find({ userId }).populate("product.productId");
    const cartId = cartItems.map((item) => item._id);

    if (cartItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Your cart is empty.",
      });
    }
    const orderedItems = [];

    for (const cartItem of cartItems) {
      for (const productItem of cartItem.product) {
        const product = await Products.findById(productItem.productId).populate('category');
        if (!product) {
          return res.status(404).json({
            success: false,
            message: `Product not found with ID: ${productItem.productId}`,
          });
        }
        if (product.quantity < productItem.quantity) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for product: ${product.name}`,
          });
        }

        if(paymentMethod ==="wallet"){
          return res.status(400).json({
            success: false,
            message: 'wallet payment not available now'
          })
        }

        const discountOnProduct = product.price - (product.price * (product.activeOffer.discountValue/100));
        
    orderedItems.push({
      productId: productItem.productId,
      quantity: productItem.quantity,
      priceAtPurchase: product.price,
      discountedPrice: discountOnProduct,
      totalProductAmount: totalAmount,
      status: "confirmed"
    })
    
    product.quantity -= productItem.quantity;
    product.sales_count += productItem.quantity;
    await product.save();
      }
    }

    const orderData = new Order({
      userId,
      cartId,
      orderedItem: orderedItems,
      orderAmount: totalAmount,
      orderDate: new Date(),
      deliveryAddress: selectedAddress,
      deliveryCharge,
      paymentMethod,
      discount, 
      paymentStatus: false,
    });

    await orderData.save();

    await CartItem.deleteMany({ _id: { $in: cartId } });


    return res.status(200).json({
      success: true,
      message: "Order placed successfully!",
    });

  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while placing the order.",
    });
  }
};


const renderOrderPlaced = async (req, res, next) => {
  try {
    res.render("orderplaced");
  } catch (error) {
    return next(error);
  }
};



module.exports = {
  renderCart,
  addToCart,
  updateCartItem,
  checkStock,
  removeCartItem,
  loadCheckout,
  addNewAddress,
  insertCheckoutAddress,
  removeAddress,
  placeOrder,
  renderOrderPlaced,

};
