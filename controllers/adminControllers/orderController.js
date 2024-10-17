const API_ROUTES = require ("../../config/apiRoutes");
const Order = require("../../models/orderModel");
const Products = require("../../models/product");



const renderOrder = async (req, res, next) => {
    try {
        const orderData = await Order.find()
        .sort({createdAt:-1})
        .populate("orderedItem.productId")
        .populate('userId');      

        res.render("orders",{orderData});
    } catch (error) {
      return next(error);  
    }
};


const renderOrderDetails = async (req, res, next) => {
    try {
        const { productId, userId ,orderId} = req.query;

        const order = await Order.findOne({ _id: orderId, userId: userId })
            .populate('orderedItem.productId')
            .populate('userId')
            .populate('deliveryAddress')
            .populate('deliveryCharge')           

        if (!order) {
            return res.status(404).send("Order not found");
        }

        const product = order.orderedItem.find(item => item.productId._id.toString() === productId);
        if (!product) {
            return res.status(404).send("Product not found in this order");
        }

        res.render('order-details', { order, product });
    } catch (error) {
      return next(error);
    }
};

const updateOrderStatus = async (req, res, next) => {
    const { orderId, productId, productStatus } = req.body;
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
  
      const product = order.orderedItem.find(item => item.productId.toString() === productId);
      if (!product) {
        return res.status(404).json({ message: 'Product not found in this order' });
      }
      product.status = productStatus;

      if (productStatus === 'Cancelled') {
        const orderedQuantity = product.quantity; 

        await Products.findByIdAndUpdate(productId, {
          $inc: { quantity: orderedQuantity } 
        });
      }

      if(productStatus === 'delivered'){
      order.paymentStatus = 'true';
      }
      await order.save();
  
      res.status(200).json({ message: 'Product status updated successfully' });
    } catch (error) {
      return next(error);
    }
  };


module.exports = {
    renderOrder,
    renderOrderDetails,
    updateOrderStatus
}