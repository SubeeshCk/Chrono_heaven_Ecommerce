const User = require("../../models/userModel");
const moment = require("moment");
const API_ROUTES = require("../../config/apiRoutes");
const { StatusCode } = require("../../config/StatusCode");
const Address = require("../../models/userAddress");



const renderCustomer = async (req, res) => {
  try {
    const userData = await User.find({ is_admin: 0 });
    const formattedUserData = userData.map((user) => {
      const joinedAtFormatted = moment(user.joinedAt).format("DD/MM/YYYY");
      return { ...user.toObject(), joinedAtFormatted };
    });
    return res.render("customers", { userData: formattedUserData });
  } catch (error) {
    return next(error);
  }
};

const blockUser = async (req, res) => {
  try {
    const { userId } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { block: true } },
      { new: true }
    );
    
    delete req.session.userId;
    return res.status(200).send({
      message: "User blocked successfully",
      redirect: API_ROUTES.CUSTOMER.LIST,
    });
  } catch (error) {
    return next(error);
  }
};

const unblockUser = async (req, res) => {
  try {
    const { userId } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { block: false } },
      { new: true }
    );
    return res.status(200).send({
      message: "User unblocked successfully",
      redirect: API_ROUTES.CUSTOMER.LIST,
    });
  } catch (error) {
    return next(error);
  }
};

const renderCustomerProfile = async (req, res) => {
  try {
    customerId = req.params.id;
    const customer = await User.findById(customerId);
    const addresses = await Address.find({ userId:customerId });
    console.log(addresses);
    
    if (!customer) {
      req.flash("error", "Customer not found");
      res.redirect(API_ROUTES.CUSTOMER.LIST);
    }
    res.render("customer-profile", { customer,addresses });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  renderCustomer,
  blockUser,
  unblockUser,
  renderCustomerProfile,
};
