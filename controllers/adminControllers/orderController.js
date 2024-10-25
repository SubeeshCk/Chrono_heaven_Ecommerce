const API_ROUTES = require ("../../config/apiRoutes");
const Order = require("../../models/orderModel");
const Products = require("../../models/product");
const Wallet = require ("../../models/walletModel");



const renderOrder = async (req, res, next) => {
    try {
        const orderData = await Order.find()
            .sort({ orderDate: -1 })
            .populate({
                path: "orderedItem.productId",
                select: "product_name price" 
            })
            .populate({
                path: 'userId',
                select: 'name email' 
            });

        res.render("orders", { orderData });
    } catch (error) {
        next(error);
    }
};


const renderOrderDetails = async (req, res, next) => {
  try {
      const { orderId } = req.query;

      // Find the order and populate all necessary fields
      const order = await Order.findById(orderId)
          .populate('orderedItem.productId')
          .populate('userId')
          .populate('deliveryAddress');

      if (!order) {
          return res.status(404).send("Order not found");
      }

      res.render('order-details', { order });
  } catch (error) {
      next(error);
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
      order.deliveryDate = new Date();
      }
      await order.save();
  
      res.status(200).json({ message: 'Product status updated successfully' });
    } catch (error) {
      return next(error);
    }
  };

  const renderReturnRequest = async(req,res,next)=>{
    try{
     
    const returnRequests= await Order.find({ 'orderedItem.status': 'returnrequested' })
  .populate('userId') 
  .populate('orderedItem.productId'); 
  
  
  res.render('return', { returnRequests});
    }catch(error){
      return next(error);
    }
  }
  
  const acceptReturn = async (req, res ,next) => {

    const { orderId, productId } = req.body;
  
    try {

      const order = await Order.findById(orderId);
      const orderlength = order.orderedItem.length;

  
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
  
      const orderedItem = order.orderedItem.find(item => item.productId.toString() === productId);
  
      if (!orderedItem) {
        return res.status(404).json({ error: 'Product not found in order' });
      }
  
      if (orderedItem.status !== 'returnrequested') {
        return res.status(400).json({ error: 'Order item is not in return requested status' });
      }
  
      orderedItem.status = 'Returned';
  
      await order.save();

      let refundAmount = 0;
      const baseRefundAmount = orderedItem.discountedPrice ? orderedItem.discountedPrice * orderedItem.quantity: orderedItem.totalProductAmount* orderedItem.quantity;
      
      if( orderlength > 1 ){
        refundAmount = baseRefundAmount;
      }else{
        refundAmount = order.deliveryCharge ? baseRefundAmount + order.deliveryCharge : baseRefundAmount;
      }

      const userId = order.userId;
      const userWallet = await Wallet.findOne({ userId });
  
      if (!userWallet) {
        return res.status(404).json({ error: "Wallet not found" });
      }
  
      userWallet.balance += refundAmount;
      userWallet.transactions.push({
        amount: refundAmount,
        transactionMethod: "Refund",
        date: new Date(),
      });
  
      await userWallet.save();
  
      const product = await Products.findById(productId);
  
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
  
      product.quantity += orderedItem.quantity;
      await product.save();
  
      res.status(200).json({ success: 'Return accepted successfully', refundAmount });
  
    } catch (error) {
      console.error('Error accepting return:', error.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  const cancelReturnRequest = async (req, res,next) => {
    const { orderId, productId } = req.body;
  
    try {
      const order = await Order.findById(orderId);
  
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
  
      const orderedItem = order.orderedItem.find(item => item.productId.toString() === productId);
  
      if (!orderedItem) {
        return res.status(404).json({ error: 'Product not found in order' });
      }
  
      if (orderedItem.status !== 'returnrequested') {
        return res.status(400).json({ error: 'Order item is not in return requested status' });
      }

      orderedItem.status = 'returnRequestCancelled';
  
      await order.save();
  
      res.status(200).json({ success: 'Return request declined successfully' });
  
    } catch (error) {
      console.error('Error declining return request:', error.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  };


module.exports = {
    renderOrder,
    renderOrderDetails,
    updateOrderStatus,
    renderReturnRequest,
    acceptReturn,
    cancelReturnRequest
}