const User = require("../../models/userModel");
const Products = require("../../models/product");
const { StatusCode } = require("../../config/StatusCode");
const Address = require("../../models/userAddress");
const bcrypt = require("bcrypt");
const Order = require("../../models/orderModel");
const Wallet = require("../../models/walletModel");
const PDFDocument = require("pdfkit");
const crypto = require('crypto');

const Razorpay = require("razorpay");

const { RAZOPAY_ID_KEY , RAZOPAY_SECRET_KEY } = process.env;

const razorpayInstance = new Razorpay({
  key_id: RAZOPAY_ID_KEY,
  key_secret: RAZOPAY_SECRET_KEY,
});

//For bcrypting the password
const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (error) {
    next(error);
  }
};

const renderProfile = (req, res, next) => {
  try {
    const userData = res.locals.userData;

    if (!userData) {
      return res.redirect("/login");
    }
    res.render("user-profile");
  } catch (error) {
    return next(error);
  }
};

const renderEditProfile = async (req, res, next) => {
  try {
    const userData = res.locals.userData;

    if (!userData) {
      console.log("User not found");
      return res.status(StatusCode.NOT_FOUND).send("User not found");
    }
    res.render("edit-profile");
  } catch (error) {
    return next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    let { name = "", mobile = "" } = req.body;

    name = name.trim();

    mobile = mobile.trim();

    if (name === "" || mobile === "") {
      req.flash("error", "All fields are required");
      return res.redirect("/user-profile/edit-profile");
    }

    const nameRegex = /^[a-zA-Z ]+$/;
    if (!nameRegex.test(name)) {
      req.flash("error", "Please enter a valid name ");
      return res.redirect("/user-profile/edit-profile");
    }

    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(mobile)) {
      req.flash("error", "Please enter a valid number");
      return res.redirect("/user-profile/edit-profile");
    }

    const updatedProfile = await User.findByIdAndUpdate(
      userId,
      { name, mobile },
      { new: true }
    );

    if (updatedProfile) {
      req.flash("success", "Profile updated successfully");
      res.redirect("/user-profile");
    } else {
      req.flash("error", "Failed to update profile");
    }
  } catch (error) {
    return next(error);
  }
};

const renderAddress = async (req, res, next) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.redirect("/login");
    }

    const user = await User.findById(userId);

    if (!user) {
      console.log("User not found");
      return res.status(StatusCode.NOT_FOUND).send("User not found");
    }

    const addresses = await Address.find({ userId });

    res.render("address", { userData: user, addresses });
  } catch (error) {
    return next(error);
  }
};

const renderAddNewAddress = async (req, res, next) => {
  try {
    res.render("add-address");
  } catch (error) {
    return next(error);
  }
};

const insertNewAddress = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const { name, pincode, locality, address, city, state, addresstype } =
      req.body;

    const trimmedName = name.trim();
    const trimmedPincode = pincode.trim();
    const trimmedLocality = locality.trim();
    const trimmedAddress = address.trim();
    const trimmedCity = city.trim();
    const trimmedState = state.trim();

    if (!userId) {
      req.flash("error", "You must be logged in to perform this action");
      return res.redirect("/login");
    }
    if (
      !trimmedName ||
      !trimmedPincode ||
      !trimmedLocality ||
      !trimmedAddress ||
      !trimmedCity ||
      !trimmedState
    ) {
      req.flash("error", "All fields are required");
      return res.redirect("/user-profile/address/add-address");
    }

    let numRegex = /^\d+$/;
    const pincodeRegex = /^\d{6}$/;
    if (!pincodeRegex.test(trimmedPincode)) {
      req.flash("error", "Enter a valid pincode");
      return res.redirect("/user-profile/address/add-address");
    }

    const allFieldsAreSpaces = Object.values(req.body).every(
      (value) => value.trim() === ""
    );
    if (allFieldsAreSpaces) {
      req.flash("error", "All fields cannot be empty or contain only spaces");
      return res.redirect("/user-profile/address/add-address");
    }
    if (
      numRegex.test(
        trimmedLocality || trimmedAddress || trimmedCity || trimmedCity
      )
    ) {
      req.flash("error", "Enter a valid address");
      return res.redirect("/user-profile/address/add-address");
    }

    const newAddress = new Address({
      name,
      userId,
      pincode,
      locality,
      address,
      city,
      state,
      addresstype,
    });

    const userAddress = await newAddress.save();

    if (userAddress) {
      req.session.useraddress = userAddress;
      req.flash("success", "Address added successfully");
      res.redirect("/user-profile/address");
    } else {
      req.flash("error", "Failed adding new address");
      res.redirect("/user-profile/address");
    }
  } catch (error) {
    return next(error);
  }
};

const renderEditAddress = async (req, res, next) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.redirect("/login");
    }
    const addressId = req.query.id;

    const address = await Address.findById(addressId);

    if (!address || address.userId !== userId) {
      return res.status(StatusCode.NOT_FOUND).send("Address not found");
    }

    res.render("edit-address", { userData: [address] });
  } catch (error) {
    return next(error);
  }
};

const updateAddress = async (req, res, next) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      req.flash("error", "You must be logged in to perform this action");
      return res.redirect("/login");
    }

    const addressId = req.body.addressId;
    const { name, pincode, locality, address, city, state, addresstype } =
      req.body;

    const pincodeRegex = /^\d+$/;
    if (!pincodeRegex.test(pincode)) {
      req.flash("error", "Pincode must contain only numbers");
      return res.redirect("/user-profile/address/edit-address");
    }
    const existingAddress = await Address.findOne({ _id: addressId, userId });

    if (!existingAddress) {
      req.flash("error", "Address not found or does not belong to the user");
      return res
        .status(StatusCode.NOT_FOUND)
        .send("Address not found or does not belong to the user");
    }

    const updatedAddress = await Address.findByIdAndUpdate(
      addressId,
      { name, pincode, locality, address, city, state, addresstype },
      { new: true }
    );

    if (updatedAddress) {
      req.flash("success", "Address updated successfully");
      return res.redirect("/user-profile/address");
    } else {
      req.flash("error", "Failed to update address");
      return res
        .status(StatusCode.INTERNAL_SERVER_ERROR)
        .send("Failed to update address");
    }
  } catch (error) {
    console.log(error.message);
    req.flash("error", "Internal server error");
    return res.redirect("/user-profile/address/edit-address");
  }
};

const deleteAddress = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const addressId = req.params.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const address = await Address.findOne({ _id: addressId, userId });

    if (!address) {
      console.log("Address not found or does not belong to the user");
      return res
        .status(StatusCode.NOT_FOUND)
        .json({ error: "Address not found or does not belong to the user" });
    }

    await Address.findByIdAndDelete(addressId);

    res.status(200).json({ message: "Address deleted successfully" });
  } catch (error) {
    return next(error);
  }
};

const resetPassword = async (req, res) => {
  try {
    const { current_password, new_password, confirm_password } = req.body;
    const userData = res.locals.userData;
    console.log(userData);

    if (!userData) {
      return res.redirect("/login");
    }

    const passwordMatch = await bcrypt.compare(
      current_password,
      userData.password
    );

    if (!passwordMatch) {
      req.flash("error", "You entered a wrong password");
      return res.redirect("/user-profile");
    }

    if (new_password !== confirm_password) {
      req.flash("error", "Passwords do not match");
      return res.redirect("/user-profile");
    }

    const hashedPassword = await securePassword(new_password);

    const updateResult = await User.findOneAndUpdate(
      { email: userData.email },
      { $set: { password: hashedPassword } },
      { new: true }
    );

    if (updateResult) {
      req.flash("success", "Your password updated successfully");
      return res.redirect("/user-profile");
    }
  } catch (error) {
    return next(error);
  }
};

const renderMyOrder = async (req, res, next) => {
  try {
    if (req.session.userId) {
      const userId = req.session.userId;
      const orderData = await Order.find({ userId })
        .sort({ createdAt: -1 })
        .populate({
          path: "orderedItem.productId",
          select: "product_name price images",
        })
        .populate("deliveryAddress");

      res.render("myorders", { orderData });
    } else {
      res.redirect("/login");
    }
  } catch (error) {
    return next(error);
  }
};

const renderOrderDetails = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const { orderId } = req.query;

    const orderData = await Order.findOne({
      userId: userId,
      _id: orderId,
    })
      .populate({
        path: "orderedItem.productId",
        select: "product_name images price",
      })
      .populate("userId")
      .populate("deliveryAddress");

    if (!orderData) {
      return res.render("orderdetails", { message: "Order not found." });
    }

    res.render("orderdetails", { orderData });
  } catch (error) {
    console.log(error);
    return next(error);
  }
};

const cancelOrder = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const { orderId, cancelReason } = req.body;

    if (!userId) {
      console.log("Unauthorized: No user ID found in session");
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Find the order and populate product details
    const order = await Order.findOne({
      _id: orderId,
      userId,
    }).populate("orderedItem.productId");

    if (!order) {
      console.log("Order not found or does not belong to the user");
      return res
        .status(404)
        .json({ error: "Order not found or does not belong to the user" });
    }

    // Check if order is already cancelled or in a state that can't be cancelled
    if (order.orderStatus.toLowerCase() === "cancelled") {
      console.log("Order is already cancelled");
      return res.status(400).json({ error: "Order is already cancelled" });
    }

    if (
      ["delivered", "returned", "returnrequested"].includes(
        order.orderStatus.toLowerCase()
      )
    ) {
      console.log("Order cannot be cancelled in current state");
      return res
        .status(400)
        .json({ error: "Order cannot be cancelled in current state" });
    }

    let totalRefundAmount = 0;
    for (const item of order.orderedItem) {

      if (
        ["cancelled", "delivered", "returned"].includes(
          item.status.toLowerCase()
        )
      ) {
        continue;
      }

      let refundAmount = item.discountedPrice
        ? item.discountedPrice * item.quantity
        : item.totalProductAmount * item.quantity;
        
        totalRefundAmount += refundAmount;

      item.status = "Cancelled";
      item.cancelReason = cancelReason;

      if (
        !(order.paymentMethod === "razorpay" && order.paymentStatus === false)
      ) {
        const product = await Products.findById(item.productId._id);
        if (product) {
          product.quantity += item.quantity;
          await product.save();
        }
      }
    }

    order.orderStatus = "Cancelled";
    await order.save();

    if (order.paymentStatus === true) {
      const userWallet = await Wallet.findOne({ userId });
      if (!userWallet) {
        console.log("Wallet not found for user");
        return res.status(404).json({ error: "Wallet not found" });
      }

      userWallet.balance += totalRefundAmount;
      userWallet.transactions.push({
        amount: totalRefundAmount,
        transactionMethod: "Refund",
        date: new Date(),
      });
      await userWallet.save();
    }

    res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
      refundAmount: totalRefundAmount,
    });
  } catch (error) {
    console.error("Error in cancelEntireOrder:", error);
    return next(error);
  }
};

const cancelProduct = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const { orderItemId, cancelReason } = req.body;

    if (!userId) {
      console.log("Unauthorized: No user ID found in session");
      return res.status(401).json({ error: "Unauthorized" });
    }

    const order = await Order.findOne({
      "orderedItem._id": orderItemId,
      userId,
    }).populate("orderedItem.productId");
    const orderlength = order.orderedItem.length;

    if (!order) {
      console.log("Order not found or does not belong to the user");
      return res
        .status(404)
        .json({ error: "Order not found or does not belong to the user" });
    }

    const orderedItem = order.orderedItem.find(
      (item) => item._id.toString() === orderItemId
    );

    if (!orderedItem) {
      console.log("Ordered item not found");
      return res.status(404).json({ error: "Ordered item not found" });
    }

    if (orderedItem.status === "Cancelled") {
      console.log("Product is already cancelled");
      return res.status(400).json({ error: "Product is already cancelled" });
    }

    const refundAmount = orderedItem.discountedPrice
      ? orderedItem.discountedPrice * orderedItem.quantity
      : orderedItem.totalProductAmount * orderedItem.quantity;

    let cancelCount = order.orderedItem.filter(
      (item) => item.status !== "Cancelled"
    ).length;

    if (order.orderedItem.length < 1 || cancelCount <= 1) {
      order.orderStatus = "Cancelled";
    }
    orderedItem.status = "Cancelled";
    orderedItem.cancelReason = cancelReason;
    await order.save();

    const product = await Products.findById(orderedItem.productId._id);
    if (!product) {
      console.log("Product not found");
      return res.status(404).json({ error: "Product not found" });
    }

    if (order.paymentMethod === "razorpay" && order.paymentStatus === false) {
    } else {
      product.quantity += orderedItem.quantity;
    }

    await product.save();

    if (order.paymentMethod !== "cashOnDelivery") {
      const userWallet = await Wallet.findOne({ userId });
      if (!userWallet) {
        console.log("Wallet not found for user");
        return res.status(404).json({ error: "Wallet not found" });
      }

      userWallet.balance += refundAmount;
      userWallet.transactions.push({
        amount: refundAmount,
        transactionMethod: "Refund",
        date: new Date(),
      });
      await userWallet.save();
    }

    res.status(200).json({ success: "Order cancelled successfully" });
  } catch (error) {
    return next(error);
  }
};

const returnOrder = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { orderId, returnReason } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const order = await Order.findOne({
      _id: orderId,
      userId,
    }).populate("orderedItem.productId");

    if (!order) {
      return res
        .status(404)
        .json({ error: "Order not found or does not belong to the user" });
    }

    // Check if order status is delivered
    if (order.orderStatus !== "delivered") {
      return res
        .status(400)
        .json({ error: "Only delivered orders can be returned" });
    }

    const hasReturnedItems = order.orderedItem.some(
      (item) => item.status === "Returned" || item.status === "returnrequested" ||
    item.status === "returnRequestCancelled" );

    if (hasReturnedItems) {
      return res
        .status(400)
        .json({
          error:
            "Some items in this order are already returned or have pending return requests",
        });
    }

    // Update status for all non-cancelled products
    order.orderedItem.forEach((item) => {
      if (item.status !== "Cancelled") {
        item.status = "returnrequested";
        item.returnReason = returnReason;
      }
    });

    // Update main order status
    order.orderStatus = "returnrequested";
    order.returnReason = returnReason;

    await order.save();

    res.status(200).json({
      success: true,
      message: "Return request for complete order submitted successfully",
    });
  } catch (error) {
    console.error("Error returning complete order:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

const returnProduct = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { orderItemId, productId, returnReason } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const order = await Order.findOne({
      "orderedItem._id": orderItemId,
      userId,
    }).populate("orderedItem.productId");

    if (!order) {
      return res
        .status(404)
        .json({ error: "Order not found or does not belong to the user" });
    }

    const hasReturnedOrRequested = order.orderedItem.some(
      (item) => item.status === "Returned" || item.status === "returnrequested" ||
      item.status === "returnRequestCancelled");

    if (hasReturnedOrRequested) {
      return res
        .status(400)
        .json({
          error:
            "A product in this order has already been marked as Returned or returnrequested",
        });
    }

    const orderedItem = order.orderedItem.find(
      (item) =>
        item._id.toString() === orderItemId &&
        item.productId._id.toString() === productId
    );

    if (!orderedItem) {
      return res.status(404).json({ error: "Ordered item not found" });
    }

    if (orderedItem.status === "Returned") {
      return res.status(400).json({ error: "Product is already Returned" });
    }

    orderedItem.status = "returnrequested";
    orderedItem.returnReason = returnReason;

    await order.save();

    res.status(200).json({ success: "Return request submitted successfully" });
  } catch (error) {
    console.error("Error returning order:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

const renderRefferal = async (req, res) => {
  try {
    res.render("refferal");
  } catch (error) {
    return next(error);
  }
};

const initiatePayment = async (req, res) => {
  try {
    const { orderId } = req.body;


    const orderDetails = await Order.findById(orderId);

    if (!orderDetails) {
      return res.status(404).json({ message: "Order not found" });
    }


    if (orderDetails.paymentStatus) {
      return res.status(400).json({ message: "This order has already been paid" });
    }

    const orderAmount = orderDetails.orderAmount;


    if (orderAmount < 1) {
      return res.status(400).json({ message: "Order amount must be at least ₹1" });
    }


    const options = {
      amount: Math.round(orderAmount * 100), 
      currency: "INR",
      receipt: `order_${orderId}`,
    };

    razorpayInstance .orders.create(options, async (err, order) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Failed to create Razorpay order" });
      }

      
      orderDetails.razorpayOrderId = order.id;
      await orderDetails.save();

      res.json({
        success: true,
        razorpayKey: process.env.RAZOPAY_ID_KEY,
        amount: order.amount,
        orderId: order.id,
      });
    });

  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

const verifyPayment = async (req, res) => {
  try {

      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

      const sign = razorpay_order_id + "|" + razorpay_payment_id;
      
      const expectedSign = crypto.createHmac("sha256", RAZOPAY_SECRET_KEY)
          .update(sign.toString())
          .digest("hex");

      if (razorpay_signature === expectedSign) {

          const updatedOrder = await Order.findByIdAndUpdate(orderId, { paymentStatus: true }, { new: true });
          if (!updatedOrder) {
              return res.status(404).json({
                  success: false,
                  message: "Order not found."
              });
          }

      if (updatedOrder) {

        updatedOrder.paymentStatus = true;
        updatedOrder.orderStatus = "confirmed";
        updatedOrder.orderedItem.forEach(item => {
          item.status = "confirmed";
        });
        updatedOrder.razorpayPaymentId = razorpay_payment_id;
        updatedOrder.razorpayOrderId = razorpay_order_id;
        
        for (const item of updatedOrder.orderedItem) {
          const product = await Products.findById(item.productId);
          if (product) {
            product.quantity -= item.quantity;
            product.sales_count += item.quantity;
            await product.save();
          }
        }
        await updatedOrder.save();

        res.json({ success: true, message: "Payment verified and status updated" });
      } else {
        res.status(404).json({ success: false, message: "Order not found" });
      }
    } else {
      res.status(400).json({ success: false, message: "Invalid payment verification" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const addReview = async(req,res)=>{
  try{
      const { productId, userId, reviewText, starRating } = req.body;

     
      const product = await Products.findById(productId);
  
      if (!product) {
        return res.status(404).send('Product not found');
      }
  
    
      const newReview = {
        userId,
        reviewText,
        starRating
      };
  
    
      product.reviews.push(newReview);
      await product.save();
  
      res.status(200).send('Review submitted successfully!');

  }catch(error){
      console.log(error.message)
  }
}

const generateInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId)
      .populate("orderedItem.productId")
      .populate("deliveryAddress")
      .populate("coupon");

    if (!order) {
      return res.status(404).send("Order not found");
    }

    const doc = new PDFDocument({ margin: 50 });
    let filename = `Invoice-${order._id}.pdf`;
    filename = encodeURIComponent(filename);

    res.setHeader("Content-disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-type", "application/pdf");

    const generateHr = (y) => {
      doc
        .strokeColor("#aaaaaa")
        .lineWidth(1)
        .moveTo(50, y)
        .lineTo(550, y)
        .stroke();
    };

    const formatCurrency = (amount) => {
      return "Rs. " + (amount / 100).toFixed(2);
    };

    const formatDate = (date) => {
      return new Date(date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    };

    let pageNumber = 1;
    doc.on("pageAdded", () => {
      pageNumber++;
      doc.text(`Page ${pageNumber}`, 50, 750, { align: "center" });
    });

    doc
      .fillColor("#444444")
      .fontSize(28)
      .text("CHRONO HEAVEN", 50, 50, { align: "center" })
      .fontSize(14)
      .text("Invoice", 50, 80, { align: "center" })
      .moveDown();

    doc.fontSize(20).text("Invoice", 50, 160);

    generateHr(185);

    const customerInformationTop = 200;
    doc
      .fontSize(10)
      .text("Invoice Number:", 50, customerInformationTop)
      .font("Helvetica-Bold")
      .text(order._id, 150, customerInformationTop)
      .font("Helvetica")
      .text("Invoice Date:", 50, customerInformationTop + 15)
      .text(formatDate(order.createdAt), 150, customerInformationTop + 15)
      .font("Helvetica-Bold")
      .text("Shipping Address:", 300, customerInformationTop)
      .font("Helvetica")
      .text(order.deliveryAddress.address, 300, customerInformationTop + 15)
      .text(
        `${order.deliveryAddress.locality}, ${order.deliveryAddress.city}`,
        300,
        customerInformationTop + 30
      )
      .text(
        `${order.deliveryAddress.state} - ${order.deliveryAddress.pincode}`,
        300,
        customerInformationTop + 45
      );

    generateHr(customerInformationTop + 70);

    const invoiceTableTop = 330;

    doc.font("Helvetica-Bold");
    generateTableRow(
      doc,
      invoiceTableTop,
      "Item",
      "Quantity",
      "Unit Price",
      "Total"
    );
    generateHr(invoiceTableTop + 20);
    doc.font("Helvetica");

    let totalAmount = 0;
    let totalDiscount = 0;

    order.orderedItem.forEach((item, index) => {
      const position = invoiceTableTop + 30 + index * 20;
      generateTableRow(
        doc,
        position,
        item.productId.product_name,
        item.quantity,
        formatCurrency(item.discountedPrice * 100),
        formatCurrency(item.discountedPrice * item.quantity * 100)
      );

      totalAmount += item.discountedPrice * item.quantity * 100;
      totalDiscount +=
        (item.priceAtPurchase - item.discountedPrice) * item.quantity * 100;
    });

    generateHr(invoiceTableTop + 20 + order.orderedItem.length * 20);

    const subtotalPosition =
      invoiceTableTop + 30 + order.orderedItem.length * 20;
    generateTableRow(
      doc,
      subtotalPosition,
      "",
      "",
      "Subtotal",
      formatCurrency(totalAmount)
    );

    // Handle coupon discount
    const couponDiscount = order.couponDiscount
      ? order.couponDiscount * 100
      : 0;
    const discountPosition = subtotalPosition + 20;
    generateTableRow(
      doc,
      discountPosition,
      "",
      "",
      "Coupon Discount",
      formatCurrency(couponDiscount)
    );

    const totalPosition = discountPosition + 25;
    doc.font("Helvetica-Bold");
    generateTableRow(
      doc,
      totalPosition,
      "",
      "",
      "Total",
      formatCurrency(totalAmount - couponDiscount )
    );
    doc.font("Helvetica");

    doc
      .fontSize(10)
      .text(
        "Thank you for your business. For any queries, please contact support@yourcompany.com",
        50,
        700,
        { align: "center", width: 500 }
      );

    doc.pipe(res);
    doc.end();
  } catch (error) {
    console.error("Error generating invoice:", error);
    res.status(500).send("Internal Server Error");
  }
};

function generateTableRow(doc, y, item, quantity, unitCost, total) {
  doc
    .fontSize(10)
    .text(item, 50, y)
    .text(quantity, 280, y, { width: 90, align: "right" })
    .text(unitCost, 370, y, { width: 90, align: "right" })
    .text(total, 0, y, { align: "right" });
}

module.exports = {
  renderProfile,
  renderEditProfile,
  updateProfile,
  renderAddress,
  renderAddNewAddress,
  insertNewAddress,
  renderEditAddress,
  updateAddress,
  deleteAddress,
  resetPassword,
  renderMyOrder,
  renderOrderDetails,
  cancelProduct,
  cancelOrder,
  renderRefferal,
  returnProduct,
  returnOrder,
  generateInvoice,
  initiatePayment,
  verifyPayment,
  addReview
};
