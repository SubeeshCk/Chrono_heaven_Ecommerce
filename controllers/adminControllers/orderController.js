const API_ROUTES = require("../../config/apiRoutes");
const Order = require("../../models/orderModel");
const Products = require("../../models/product");
const Wallet = require("../../models/walletModel");


const renderOrder = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 8;
    const skip = (page - 1) * limit;

    const totalOrders = await Order.countDocuments();
    const totalPages = Math.ceil(totalOrders / limit);

    const orderData = await Order.find()
      .sort({ orderDate: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "orderedItem.productId",
        select: "product_name price",
      })
      .populate({
        path: "userId",
        select: "name email",
      });

    res.render("orders", { 
      orderData,
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      nextPage: page + 1,
      prevPage: page - 1,
      lastPage: totalPages
    });
  } catch (error) {
    next(error);
  }
};


const renderOrderDetails = async (req, res, next) => {
  try {
    const { orderId } = req.query;

    const order = await Order.findById(orderId)
      .populate("orderedItem.productId")
      .populate("userId")
      .populate("deliveryAddress");

    if (!order) {
      return res.status(404).send("Order not found");
    }

    res.render("order-details", { order });
  } catch (error) {
    next(error);
  }
};

const updateOrderStatus = async (req, res, next) => {
  const { orderId, orderStatus } = req.body;

  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    order.orderStatus = orderStatus;

    switch (orderStatus) {
      case "cancelled":
        for (const item of order.orderedItem) {
          if (item.status !== "returned" && item.status !== "Cancelled") {
            await Products.findByIdAndUpdate(item.productId, {
              $inc: { quantity: item.quantity },
            });
            item.status = "Cancelled";
          }
        }
        break;

      case "delivered":
        order.paymentStatus = true;
        order.deliveryDate = new Date();
        order.orderedItem.forEach((item) => {
          if (item.status !== "Cancelled" && item.status !== "returned") {
            item.status = "delivered";
          }
        });
        break;

      case "shipped":
        order.shippingDate = new Date();
        order.orderedItem.forEach((item) => {
          if (item.status !== "Cancelled" && item.status !== "returned") {
            item.status = "shipped";
          }
        });
        break;

      case "confirmed":
        if (
          order.paymentMethod === "razorpay" &&
          order.paymentStatus === false
        ) {
          return res.status(400).json({
            message: "Cannot confirm order: Razorpay payment is pending",
          });
        }

        order.orderedItem.forEach((item) => {
          if (item.status === "pending") {
            item.status = "confirmed";
          }
        });
        break;

      case "pending":
        order.orderedItem.forEach((item) => {
          if (
            item.status !== "Cancelled" &&
            item.status !== "returned" &&
            item.status !== "delivered"
          ) {
            item.status = "pending";
          }
        });
        break;
    }

    await order.save();
    res.status(200).json({
      message: "Order status updated successfully",
      orderStatus: order.orderStatus,
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    return next(error);
  }
};

function isValidStatusTransition(currentStatus, newStatus) {
  const statusFlow = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["shipped", "cancelled"],
    shipped: ["delivered", "cancelled"],
    delivered: [],
    cancelled: [],
  };

  return statusFlow[currentStatus]?.includes(newStatus) ?? false;
}

const updateProductStatus = async (req, res, next) => {
  const { orderId, productId, productStatus } = req.body;
  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const product = order.orderedItem.find(
      (item) => item.productId.toString() === productId
    );
    if (!product) {
      return res
        .status(404)
        .json({ message: "Product not found in this order" });
    }
    product.status = productStatus;

    if (productStatus === "Cancelled") {
      const orderedQuantity = product.quantity;

      await Products.findByIdAndUpdate(productId, {
        $inc: { quantity: orderedQuantity },
      });
    }

    if (productStatus === "delivered") {
      order.paymentStatus = "true";
      order.deliveryDate = new Date();
    }
    await order.save();

    res.status(200).json({ message: "Product status updated successfully" });
  } catch (error) {
    return next(error);
  }
};

// Controller modifications
const renderReturnRequest = async (req, res, next) => {
  try {
    // Fetch orders with either order-level return requests or product-level return requests
    const returnRequests = await Order.find({
      $or: [
        { orderStatus: "returnrequested" },
        { "orderedItem.status": "returnrequested" },
      ],
    })
      .populate("userId")
      .populate("orderedItem.productId");

    // Separate orders into complete returns and partial returns
    const completeReturns = returnRequests.filter(
      (order) =>
        order.orderStatus === "returnrequested" &&
        order.orderedItem.every(
          (item) =>
            item.status !== "cancelled" &&
            item.status !== "returnRequestCancelled"
        )
    );

    const partialReturns = returnRequests.filter(
      (order) =>
        order.orderStatus !== "returnrequested" &&
        order.orderedItem.some((item) => item.status === "returnrequested")
    );

    res.render("return", { completeReturns, partialReturns });
  } catch (error) {
    return next(error);
  }
};

const acceptCompleteReturn = async (req, res, next) => {
  const { orderId } = req.body;

  try {
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.orderStatus !== "returnrequested") {
      return res
        .status(400)
        .json({ error: "Order is not in return requested status" });
    }

    // Update order status
    order.orderStatus = "Returned";

    // Update all non-cancelled items to Returned
    let totalRefundAmount = 0;
    for (const item of order.orderedItem) {
      if (
        item.status !== "cancelled" &&
        item.status !== "returnRequestCancelled"
      ) {
        item.status = "Returned";

        const product = await Products.findById(item.productId);
        if (product) {
          product.quantity += item.quantity;
          await product.save();
        }
      }
    }

    totalRefundAmount = order.orderAmount;

    const userWallet = await Wallet.findOne({ userId: order.userId });
    if (!userWallet) {
      return res.status(404).json({ error: "Wallet not found" });
    }

    userWallet.balance += totalRefundAmount;
    userWallet.transactions.push({
      amount: totalRefundAmount,
      transactionMethod: "Refund",
      date: new Date(),
    });

    await Promise.all([order.save(), userWallet.save()]);

    res.status(200).json({
      success: "Complete order return accepted successfully",
      refundAmount: totalRefundAmount,
    });
  } catch (error) {
    console.error("Error accepting complete return:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const acceptPartialReturn = async (req, res, next) => {
  const { orderId, productId } = req.body;

  try {
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const orderedItem = order.orderedItem.find(
      (item) => item.productId.toString() === productId
    );

    if (!orderedItem) {
      return res.status(404).json({ error: "Product not found in order" });
    }

    if (orderedItem.status !== "returnrequested") {
      return res
        .status(400)
        .json({ error: "Product is not in return requested status" });
    }

    // Update item status
    orderedItem.status = "Returned";

    // Calculate refund amount
    const refundAmount = orderedItem.discountedPrice
      ? orderedItem.discountedPrice * orderedItem.quantity
      : orderedItem.priceAtPurchase * orderedItem.quantity;

    // Update product quantity
    const product = await Products.findById(productId);
    if (product) {
      product.quantity += orderedItem.quantity;
      await product.save();
    }

    // Process refund to wallet
    const userWallet = await Wallet.findOne({ userId: order.userId });
    if (!userWallet) {
      return res.status(404).json({ error: "Wallet not found" });
    }

    userWallet.balance += refundAmount;
    userWallet.transactions.push({
      amount: refundAmount,
      transactionMethod: "Refund",
      date: new Date(),
    });

    await Promise.all([order.save(), userWallet.save()]);

    res.status(200).json({
      success: "Partial return accepted successfully",
      refundAmount,
    });
  } catch (error) {
    console.error("Error accepting partial return:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const declineReturn = async (req, res, next) => {
  const { orderId, productId } = req.body;

  try {
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (productId) {
      // Partial return decline
      const orderedItem = order.orderedItem.find(
        (item) => item.productId.toString() === productId
      );

      if (!orderedItem) {
        return res.status(404).json({ error: "Product not found in order" });
      }

      if (orderedItem.status !== "returnrequested") {
        return res
          .status(400)
          .json({ error: "Product is not in return requested status" });
      }

      orderedItem.status = "returnRequestCancelled";
    } else {
      // Complete order return decline
      if (order.orderStatus !== "returnrequested") {
        return res
          .status(400)
          .json({ error: "Order is not in return requested status" });
      }

      order.orderStatus = "returnRequestCancelled";
      order.orderedItem.forEach((item) => {
        if (item.status === "returnrequested") {
          item.status = "returnRequestCancelled";
        }
      });
    }

    await order.save();

    res.status(200).json({
      success: `Return request ${
        productId ? "partially" : "completely"
      } declined successfully`,
    });
  } catch (error) {
    console.error("Error declining return:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  renderOrder,
  renderOrderDetails,
  updateOrderStatus,
  updateProductStatus,
  renderReturnRequest,
  acceptCompleteReturn,
  acceptPartialReturn,
  declineReturn,
};
