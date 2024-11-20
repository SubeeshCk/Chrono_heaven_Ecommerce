const statusCode = require("../../config/statusCode");
const Order = require("../../models/orderModel");
const Products = require("../../models/product");
const Wallet = require("../../models/walletModel");


const renderOrder = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 6;
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
      return res.status(statusCode.NOT_FOUND).send("Order not found");
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
      return res.status(statusCode.NOT_FOUND).json({ message: "Order not found" });
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
          return res.status(statusCode.BAD_REQUEST).json({
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
    res.status(statusCode.OK).json({
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
      return res.status(statusCode.NOT_FOUND).json({ message: "Order not found" });
    }

    const product = order.orderedItem.find(
      (item) => item.productId.toString() === productId
    );
    if (!product) {
      return res
        .status(statusCode.NOT_FOUND)
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

    res.status(statusCode.OK).json({ message: "Product status updated successfully" });
  } catch (error) {
    return next(error);
  }
};


const renderReturnRequest = async (req, res, next) => {
  try {

    const returnRequests = await Order.find({
      $or: [
        { orderStatus: "returnRequested" },
        { "orderedItem.status": "returnRequested" },
      ],
    })
      .populate("userId")
      .populate("orderedItem.productId");

    const completeReturns = returnRequests.filter(
      (order) =>
        order.orderStatus === "returnRequested" &&
        order.orderedItem.every(
          (item) =>
            item.status !== "cancelled" &&
            item.status !== "returnRequestCancelled"
        )
    );

    const partialReturns = returnRequests.filter(
      (order) =>
        order.orderStatus !== "returnRequested" &&
        order.orderedItem.some((item) => item.status === "returnRequested")
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
          console.log('Order not found:', orderId);
          return res.status(statusCode.NOT_FOUND).json({ error: "Order not found" });
      }

      if (order.orderStatus.toLowerCase() !== "returnrequested") {
          console.log('Invalid order status:', order.orderStatus);
          return res.status(statusCode.BAD_REQUEST).json({ error: "Order is not in return requested status" });
      }

      order.orderStatus = "Returned";
      
      let refundAmount = 0;
      let totalRefundAmount = 0;
      const productUpdates = [];

        for (const item of order.orderedItem) {
            if (item.status.toLowerCase() === "returnrequested") {
                item.status = "Returned";

                if (item.productId) {
                    productUpdates.push(
                        Products.findByIdAndUpdate(
                            item.productId,
                            { $inc: { quantity: item.quantity } },
                            { new: true }
                        )
                    );
                }

                let itemRefundAmount = 0;
                
                if (order.orderedItem.filter(i => i.status.toLowerCase() === "returnrequested").length === order.orderedItem.length) {

                    itemRefundAmount = order.orderAmount;
                } else {
                    let itemCouponDiscount = 0;
                    if (order.couponDiscount > 0) {
                        const itemProportion = item.totalProductAmount / (order.orderAmount + order.couponDiscount);
                        itemCouponDiscount = order.couponDiscount * itemProportion;
                    }
                    itemRefundAmount = item.totalProductAmount - itemCouponDiscount;
                }

                totalRefundAmount += itemRefundAmount;
            }
        }


      let userWallet = await Wallet.findOne({ userId: order.userId });
      
      if (!userWallet) {
          console.log('Creating new wallet for user:', order.userId);
          userWallet = new Wallet({
              userId: order.userId,
              balance: 0,
              transactions: []
          });
      }

      userWallet.balance += totalRefundAmount;
      userWallet.transactions.push({
          amount: totalRefundAmount,
          transactionMethod: "Refund",
          date: new Date(),
      });

      await Promise.all([
          order.save(),
          userWallet.save(),
          ...productUpdates
      ]);

      res.status(statusCode.OK).json({
          success: "Complete order return accepted successfully",
          refundAmount: totalRefundAmount,
      });
  } catch (error) {
      console.error("Error accepting complete return:", error);
      res.status(statusCode.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
  }
};

const acceptPartialReturn = async (req, res, next) => {
  const { orderId, productId } = req.body;

  try {
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(statusCode.NOT_FOUND).json({ error: "Order not found" });
    }

    const orderedItem = order.orderedItem.find(
      (item) => item.productId.toString() === productId
    );

    if (!orderedItem) {
      return res.status(statusCode.NOT_FOUND).json({ error: "Product not found in order" });
    }

    if (orderedItem.status !== "returnRequested") {
      return res
        .status(statusCode.BAD_REQUEST)
        .json({ error: "Product is not in return requested status" });
    }

    const otherItems = order.orderedItem.filter(item => 
      item.productId.toString() !== productId
  );
  
  if (order.orderedItem.length === 1 || otherItems.every(item => 
      item.status === "Cancelled" || item.status === "Returned"
  )) {
      order.orderStatus = "Returned";
      console.log('Updating order status to Returned for order:', orderId);
  }

    orderedItem.status = "Returned";

    let refundAmount = 0;
    
    if (order.orderedItem.length === 1) {
      refundAmount = order.orderAmount;
    } else {
        let itemCouponDiscount = 0;
        if (order.orderAmount > 0 && order.couponDiscount) {
          const itemProportion = orderedItem.totalProductAmount / (order.orderAmount + order.couponDiscount);
          itemCouponDiscount = order.couponDiscount * itemProportion;
        }
        refundAmount = orderedItem.totalProductAmount - itemCouponDiscount;
    }

    const product = await Products.findById(productId);
    if (product) {
      product.quantity += orderedItem.quantity;
      await product.save();
    }

    const userWallet = await Wallet.findOne({ userId: order.userId });
    if (!userWallet) {
      return res.status(statusCode.NOT_FOUND).json({ error: "Wallet not found" });
    }

    userWallet.balance += refundAmount;
    userWallet.transactions.push({
      amount: refundAmount,
      transactionMethod: "Refund",
      date: new Date(),
    });

    await Promise.all([order.save(), userWallet.save()]);

    res.status(statusCode.OK).json({
      success: "Partial return accepted successfully",
      refundAmount,
    });
  } catch (error) {
    console.error("Error accepting partial return:", error);
    res.status(statusCode.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
  }
};


const declineReturn = async (req, res, next) => {
  const { orderId, productId } = req.body;

  try {
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(statusCode.NOT_FOUND).json({ error: "Order not found" });
    }

    if (productId) {
      const orderedItem = order.orderedItem.find(
        (item) => item.productId.toString() === productId
      );

      if (!orderedItem) {
        return res.status(statusCode.NOT_FOUND).json({ error: "Product not found in order" });
      }

      if (orderedItem.status !== "returnRequested") {
        return res
          .status(statusCode.BAD_REQUEST)
          .json({ error: "Product is not in return requested status" });
      }

      orderedItem.status = "returnRequestCancelled";
    } else {
      if (order.orderStatus !== "returnRequested") {
        return res
          .status(statusCode.BAD_REQUEST)
          .json({ error: "Order is not in return requested status" });
      }

      order.orderStatus = "returnRequestCancelled";
      order.orderedItem.forEach((item) => {
        if (item.status === "returnRequested") {
          item.status = "returnRequestCancelled";
        }
      });
    }

    await order.save();

    res.status(statusCode.OK).json({
      success: `Return request ${
        productId ? "partially" : "completely"
      } declined successfully`,
    });
  } catch (error) {
    console.error("Error declining return:", error);
    res.status(statusCode.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
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
