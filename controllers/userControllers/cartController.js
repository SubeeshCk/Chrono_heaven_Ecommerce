const User = require("../../models/userModel");
const Products = require("../../models/product");
const CartItem = require("../../models/cartModel");
const { StatusCode } = require("../../config/StatusCode");
const Address = require("../../models/userAddress");
const Order = require("../../models/orderModel");
const Coupon = require("../../models/couponModel");
const Wallet = require("../../models/walletModel");
const crypto = require("crypto");

const Razorpay = require("razorpay");

const { RAZOPAY_ID_KEY, RAZOPAY_SECRET_KEY } = process.env;

const razorpayInstance = new Razorpay({
  key_id: RAZOPAY_ID_KEY,
  key_secret: RAZOPAY_SECRET_KEY,
});

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
      title: "Cart",
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
        .json({
          error: true,
          message: `Only ${currentProduct.quantity} item(s) available in stock`,
        });
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
    return next(error);
  }
};

const checkStock = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const cartItems = await CartItem.find({ userId }).populate(
      "product.productId"
    );

    const outOfStockItems = cartItems.filter(
      (item) => item.product[0].quantity > item.product[0].productId.quantity
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
    return next(error);
  }
};

const loadCheckout = async (req, res, next) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.redirect("/login");
    }

    const cartItems = await CartItem.find({ userId }).populate(
      "product.productId"
    );

    if (cartItems.length <= 0) {
      return res.status(400).json({
        success: false,
        message: "No cart items available.",
      });
    }

    const userData = await User.findById(userId);
    const addressData = await Address.find({ userId });

    let subtotal = 0;
    let totalProductCount = 0;

    cartItems.forEach((cartItem) => {
      totalProductCount += cartItem.product[0].quantity;
    });

    subtotal = cartItems.reduce(
      (acc, item) => acc + item.product[0].totalPrice,
      0
    );
    const totalAmount = cartItems.reduce(
      (acc, item) => acc + item.product[0].totalPriceWithOffer,
      0
    );

    const currentDate = new Date();
    const availableCoupons = await Coupon.find({
      minPurchaseAmount: { $lte: totalAmount },
      validity: { $gte: currentDate },
    });

    res.render("checkout", {
      cartItems,
      subtotal,
      total: totalAmount,
      userData,
      addressData,
      RAZOPAY_ID_KEY,
      totalProductCount,
      availableCoupons,
      title: "Checkout",
    });
  } catch (error) {
    return next(error);
  }
};

const addNewAddress = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      res.redirect("/login");
    } else {
      const userData = await User.findById(userId);
      const addressData = await Address.find({ userId });
      res.render("addCheckoutAddress", {
        userData,
        addressData,
        title: "Add-checkout-address",
      });
    }
  } catch (error) {
    return next(error);
  }
};

const insertCheckoutAddress = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const { name, pincode, locality, address, city, state, addresstype } =
      req.body;

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

    if (
      !trimmedName ||
      !trimmedPincode ||
      !trimmedLocality ||
      !trimmedAddress ||
      !trimmedCity ||
      !trimmedState ||
      !trimmedAddresstype
    ) {
      req.flash("error", "All fields are required");
      return res.redirect("/cart/checkout/addNewAddress");
    }

    let numRegex = /^\d+$/;
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
    if (
      numRegex.test(
        trimmedLocality || trimmedAddress || trimmedCity || trimmedCity
      )
    ) {
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

    const {
      selectedAddress,
      paymentMethod,
      subtotal,
      totalAmount,
      discount,
      couponDiscount,
    } = req.body;

    if (paymentMethod === "cashOnDelivery" && totalAmount > 2000) {
      return res.status(400).json({
        success: false,
        message: "Order above 2000 should not be allowed for COD",
      });
    }

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

    const cartItems = await CartItem.find({ userId }).populate(
      "product.productId"
    );
    const cartId = cartItems.map((item) => item._id);

    if (cartItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Your cart is empty.",
      });
    }

    let orderAmount = totalAmount;
    const orderedItems = [];

    for (const cartItem of cartItems) {
      for (const productItem of cartItem.product) {
        const product = await Products.findById(productItem.productId).populate(
          "category"
        );
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

        let discountOnProduct = product.price;
        if (
          product.activeOffer &&
          typeof product.activeOffer.discountValue === "number"
        ) {
          discountOnProduct =
            product.price -
            product.price * (product.activeOffer.discountValue / 100);
        }
        discountOnProduct = Math.max(0, discountOnProduct);

        const totalProductAmount = discountOnProduct * productItem.quantity;

        orderedItems.push({
          productId: productItem.productId,
          quantity: productItem.quantity,
          priceAtPurchase: product.price,
          discountedPrice: discountOnProduct,
          totalProductAmount: totalProductAmount,
          status:
            paymentMethod === "wallet"
              ? "confirmed"
              : paymentMethod === "cashOnDelivery"
              ? "confirmed"
              : "pending",
        });
      }
    }

    const orderData = new Order({
      userId,
      cartId,
      orderedItem: orderedItems,
      orderAmount: orderAmount,
      orderDate: new Date(),
      deliveryAddress: selectedAddress,
      paymentMethod,
      discount,
      couponDiscount,
      orderStatus:
        paymentMethod === "wallet"
          ? "confirmed"
          : paymentMethod === "cashOnDelivery"
          ? "confirmed"
          : "pending",
      paymentStatus:
        paymentMethod === "wallet"
          ? true
          : paymentMethod === "cashOnDelivery"
          ? false
          : false,
    });

    await orderData.save();

    if (paymentMethod === "wallet") {
      const userWallet = await Wallet.findOne({ userId });

      if (!userWallet) {
        await Order.findByIdAndDelete(orderData._id);
        return res.status(400).json({
          success: false,
          message: "Wallet not found for user.",
        });
      }

      if (userWallet.balance < orderAmount) {
        await Order.findByIdAndDelete(orderData._id);
        return res.status(400).json({
          success: false,
          message: "Insufficient balance in wallet.",
        });
      }

      userWallet.balance -= orderAmount;
      userWallet.transactions.push({
        amount: -orderAmount,
        transactionMethod: "Payment",
        date: Date.now(),
      });
      await userWallet.save();

      for (const item of orderedItems) {
        const product = await Products.findById(item.productId);
        if (product) {
          product.quantity -= item.quantity;
          product.sales_count = (product.sales_count || 0) + item.quantity;
          await product.save();
        }
      }

      await CartItem.deleteMany({ _id: { $in: cartId } });

      return res.json({
        success: true,
        message: "Order placed successfully",
      });
    } else if (paymentMethod === "razorpay") {
      const options = {
        amount: orderAmount * 100,
        currency: "INR",
        receipt: `order_${orderData._id}`,
      };

      razorpayInstance.orders.create(options, async (err, razorpayOrder) => {
        if (err) {
          console.error(err);
          await Order.findByIdAndDelete(orderData._id);
          return res.status(500).json({
            success: false,
            message: "Failed to create Razorpay order.",
          });
        }

        return res.json({
          success: true,
          orderId: orderData._id,
          razorpayOrderId: razorpayOrder.id,
          amount: orderAmount * 100,
          currency: razorpayOrder.currency,
          key_id: RAZOPAY_ID_KEY,
        });
      });
      
    } else if (paymentMethod === "cashOnDelivery") {

      for (const item of orderedItems) {
        const product = await Products.findById(item.productId);
        if (product) {
          product.quantity -= item.quantity;
          product.sales_count = (product.sales_count || 0) + item.quantity;
          await product.save();
        }
      }

      await CartItem.deleteMany({ _id: { $in: cartId } });

      return res.json({
        success: true,
        orderId: orderData._id,
        message: "Order placed successfully with Cash on Delivery",
      });
    }
  } catch (error) {
    console.error(error);

    if (orderData && orderData._id) {
      await Order.findByIdAndDelete(orderData._id);
    }
    return res.status(500).json({
      success: false,
      message: "An error occurred while placing the order.",
    });
  }
};

const verifyRazorpayPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId,
    } = req.body;

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", RAZOPAY_SECRET_KEY)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature === expectedSign) {
      const order = await Order.findById(orderId);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found.",
        });
      }

      order.paymentStatus = true;
      order.orderStatus = "confirmed";
      order.orderedItem.forEach((item) => {
        item.status = "confirmed";
      });
      order.razorpayPaymentId = razorpay_payment_id;
      order.razorpayOrderId = razorpay_order_id;

      for (const item of order.orderedItem) {
        const product = await Products.findById(item.productId);
        if (product) {
          product.quantity -= item.quantity;
          product.sales_count += item.quantity;
          await product.save();
        }
      }

      await order.save();
      await CartItem.deleteMany({ userId: order.userId });

      res.json({
        success: true,
        message: "Payment verified successfully.",
        orderId: orderId,
      });
    } else {
      await Order.findByIdAndDelete(orderId);

      res.status(400).json({
        success: false,
        message: "Payment verification failed. Invalid signature.",
      });
    }
  } catch (error) {
    console.error("Error in verifyRazorpayPayment:", error);

    if (orderId) {
      try {
        await Order.findByIdAndDelete(orderId);
      } catch (deleteError) {
        console.error("Error deleting failed order:", deleteError);
      }
    }

    return res.status(500).json({
      success: false,
      message: "An error occurred while verifying payment.",
    });
  }
};

const renderOrderPlaced = async (req, res, next) => {
  try {
    res.render("orderplaced", { title: "Order-placed" });
  } catch (error) {
    return next(error);
  }
};

const applyCoupon = async (req, res) => {
  try {
    const { couponCode } = req.body;
    const userId = req.session.userId;
    const userData = res.locals.userData;

    if (!userData) return res.redirect("/login");

    const coupon = await Coupon.findOne({ code: couponCode });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    const isCouponUsed = userData.usedCoupons.includes(coupon._id.toString());

    if (isCouponUsed) {
      return res.status(400).json({
        success: false,
        message: "Coupon has already been used",
      });
    }

    const cartItems = await CartItem.find({ userId }).populate(
      "product.productId"
    );

    let orderAmount = 0;
    cartItems.forEach((item) => {
      item.product.forEach((product) => {
        orderAmount += product.totalPriceWithOffer;
      });
    });

    if (orderAmount <= coupon.minPurchaseAmount) {
      return res.status(400).json({
        success: false,
        message: `Order amount must be greater than ${coupon.minPurchaseAmount} to use this coupon`,
      });
    }

    let discount;
    if (coupon.discountType === "percentage") {
      discount = (coupon.discountValue / 100) * orderAmount;
    } else if (coupon.discountType === "fixed") {
      discount = coupon.discountValue;
    }

    const newTotal = orderAmount - discount;

    req.session.appliedCoupon = couponCode;

    userData.usedCoupons.push(coupon._id);
    await userData.save();

    return res.status(200).json({
      success: true,
      newTotal: newTotal,
      couponDiscount: discount,
      orderAmount: orderAmount,
    });
  } catch (error) {
    console.error("Error applying coupon:", error);
    return res.status(500).json({
      success: false,
      message:
        "An error occurred while applying the coupon. Please try again later.",
    });
  }
};

const removeCoupon = async (req, res) => {
  try {
    const userId = req.session.userId;
    const userData = res.locals.userData;
    const { couponCode, subtotal = 0 } = req.body;

    if (!userData) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    if (!couponCode) {
      return res.status(400).json({
        success: false,
        message: "No coupon code provided",
      });
    }

    const coupon = await Coupon.findOne({ code: couponCode });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    const couponIndex = userData.usedCoupons.indexOf(coupon._id);
    if (couponIndex > -1) {
      userData.usedCoupons.splice(couponIndex, 1);
      await userData.save();
    }

    const cartItems = await CartItem.find({ userId }).populate(
      "product.productId"
    );

    let orderAmount = 0;
    cartItems.forEach((item) => {
      item.product.forEach((product) => {
        orderAmount += product.totalPriceWithOffer;
      });
    });

    const newTotal = orderAmount;

    if (req.session.appliedCoupon === couponCode) {
      delete req.session.appliedCoupon;
    }

    return res.status(200).json({
      success: true,
      newTotal: newTotal,
      orderAmount: orderAmount,
      message: "Coupon removed successfully",
    });
  } catch (error) {
    console.error("Error removing coupon:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while removing the coupon",
    });
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
  verifyRazorpayPayment,
  renderOrderPlaced,
  applyCoupon,
  removeCoupon,
};
