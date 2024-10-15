const User = require("../../models/userModel");
const Products = require("../../models/product");
const { StatusCode } = require("../../config/StatusCode");
const Address = require("../../models/userAddress");
const bcrypt = require("bcrypt");
const Order = require("../../models/orderModel");

//For bcrypting the password
const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (error) {
    next(error);
  }
};

const renderProfile = (req, res) => {
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

const renderEditProfile = async (req, res) => {
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

const updateProfile = async (req, res) => {
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

const renderAddress = async (req, res) => {
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

const renderAddNewAddress = async (req, res) => {
  try {
    res.render("add-address");
  } catch (error) {
    return next(error);
  }
};

const insertNewAddress = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { name,pincode, locality, address, city, state, addresstype } = req.body;

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

const renderEditAddress = async (req, res) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.redirect("/login");
    }
    const addressId = req.query.id;

    const address = await Address.findById(addressId);
    console.log(address);

    if (!address || address.userId !== userId) {
      return res.status(StatusCode.NOT_FOUND).send("Address not found");
    }

    res.render("edit-address", { userData: [address] });
  } catch (error) {
    return next(error);
  }
};

const updateAddress = async (req, res) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      req.flash("error", "You must be logged in to perform this action");
      return res.redirect("/login");
    }

    const addressId = req.body.addressId;
    const { name, pincode, locality, address, city, state, addresstype } = req.body;

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
      return res.status(StatusCode.INTERNAL_SERVER_ERROR).send("Failed to update address");
    }
  } catch (error) {
    console.log(error.message);
    req.flash("error", "Internal server error");
    return res.redirect("/user-profile/address/edit-address");
  }
};

const deleteAddress = async (req, res) => {
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

const resetPassword = async ( req,res ) => {
  try {    
    const { current_password, new_password, confirm_password } = req.body;
    const userData = res.locals.userData;
    console.log(userData);
    
    if(!userData){
      return res.redirect("/login");
    }
      
    const passwordMatch = await bcrypt.compare(current_password, userData.password);
      
    if(!passwordMatch){
         req.flash("error","You entered a wrong password");
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

      if(updateResult){
        req.flash("success","Your password updated successfully");
        return res.redirect("/user-profile");
      }

  } catch (error) {
    return next(error);
  }
}

const renderMyOrder = async (req, res) => {
  try {
    if (req.session.userId) {
      const userId = req.session.userId;
      const orderData = await Order.find({ userId })
        .sort({createdAt:-1})
        .populate('orderedItem.productId')
        .populate('deliveryAddress');

      res.render('myorders', { orderData });
    } else {
      res.redirect('/login');
    }
  } catch (error) {
    return next(error);
  }
};


const renderOrderDetails = async (req, res) => {
  try {
      const userId = req.session.userId;
      const { productId, orderItemId } = req.query;

      const orderData = await Order.findOne({
          userId: userId,
          'orderedItem.productId': productId,
          'orderedItem._id': orderItemId
      })
      .populate('orderedItem.productId')
      .populate('userId')
      .populate('deliveryAddress');


      if (!orderData) {
          return res.render("orderdetails", { message: "Order details not found." });
      }
      const specificProduct = orderData.orderedItem.find(item => item._id.toString() === orderItemId);

      res.render("orderdetails", { orderData, specificProduct });
  } catch (error) {
    return next(error);
  }
};

const cancelOrder = async (req, res) => {
  try {
      const userId = req.session.userId;
      const { orderItemId, cancelReason } = req.body;

      if (!userId) {
          console.log("Unauthorized: No user ID found in session");
          return res.status(401).json({ error: "Unauthorized" });
      }

      const order = await Order.findOne({ 'orderedItem._id': orderItemId, userId }).populate("orderedItem.productId");

      if (!order) {
          console.log("Order not found or does not belong to the user");
          return res.status(404).json({ error: "Order not found or does not belong to the user" });
      }

      const orderedItem = order.orderedItem.find(item => item._id.toString() === orderItemId);

      if (!orderedItem) {
          console.log("Ordered item not found");
          return res.status(404).json({ error: "Ordered item not found" });
      }

      if (orderedItem.status === "Cancelled") {
          console.log("Product is already cancelled");
          return res.status(400).json({ error: "Product is already cancelled" });
      }

      
      const baseRefundAmount = orderedItem.discountedPrice ? orderedItem.discountedPrice * orderedItem.quantity: orderedItem.totalProductAmount* orderedItem.quantity;
      const refundAmount = order.deliveryCharge ? baseRefundAmount + order.deliveryCharge : baseRefundAmount;


      orderedItem.status = "Cancelled";
      orderedItem.reason = cancelReason;
      await order.save();

      const product = await Products.findById(orderedItem.productId._id);
      if (!product) {
          console.log("Product not found");
          return res.status(404).json({ error: "Product not found" });
      }

      product.quantity += orderedItem.quantity;
      await product.save();

      res.status(200).json({ success: "Order cancelled successfully"});

  } catch (error) {
    return next(error);
  }
};

const renderRefferal = async(req,res)=>{
  try{
      res.render('refferal')
  }catch(error){
      return next(error);
  }
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
  cancelOrder,
  renderRefferal
};
