const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  cartId: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'Cart_Items',
    required: true
  },
  orderedItem: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Products',
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    priceAtPurchase: {
      type: Number,
      required: true
    },
    totalProductAmount: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      default: 'pending'
    },
    cancelReason: {
      type: String
    },
    returnReason: {
      type: String
    },
    discountedPrice: {
      type: Number,
      default: 0
    },
  }],
  orderAmount: {
    type: Number,
    required: true
  },
  orderDate: {
    type: Date
  },
  deliveryAddress: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Address",
    required: true
  },
  deliveryCharge: {
    type: Number,
    default: 0
  },
  deliveryDate: {
    type: Date
  },
  shippingDate: {
    type: Date
  },
  paymentMethod: {
    type: String,
    required: true
  },
  coupon: {
    type: String
  },
  couponDiscount: {
    type: Number,
    default: 0
  },
  discount: {
    type: Number,
    default: 0
  },
  orderStatus: {
    type: String,
    default: 'pending'
  },
  paymentStatus: {
    type: Boolean,
    default: false
  },
  cancelReason: {
    type: String
  },
  returnReason: {
    type: String
  },
  razorpayPaymentId: String,
  razorpayOrderId: String
}, {
  timestamps: true
});

module.exports = mongoose.model('Order', orderSchema);
