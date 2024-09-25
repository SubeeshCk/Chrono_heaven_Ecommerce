const User = require("../../models/userModel");
const moment = require("moment");
const API_ROUTES = require("../../config/apiRoutes");
const { statusCode } = require("../../config/statusCode");



const renderCustomer = async (req, res) => {
  try {
    const userData = await User.find({ is_admin: 0 });
    const formattedUserData = userData.map((user) => {
      const joinedAtFormatted = moment(user.joinedAt).format("DD/MM/YYYY");
      return { ...user.toObject(), joinedAtFormatted };
    });
    return res.render("customers", { userData: formattedUserData });
  } catch (error) {
    console.log(error.message);
    return res.status(statusCode.INTERNAL_SERVER_ERROR).send({ error: "Internal server error" });
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
    console.log(updatedUser);
    return res.status(200).send({
      message: "User blocked successfully",
      redirect: API_ROUTES.CUSTOMER.LIST,
    });
  } catch (error) {
    console.log(error.message);
    res.status(statusCode.INTERNAL_SERVER_ERROR).send({ message: "Internal server error" });
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
    console.log(error.message);
    res.status(statusCode.INTERNAL_SERVER_ERROR).send({ message: "Internal server error" });
  }
};

const renderCustomerProfile = async (req, res) => {
  try {
    customerId = req.params.id;
    const customer = await User.findById(customerId);
    if (!customer) {
      req.flash("error", "Customer not found");
      res.redirect(API_ROUTES.CUSTOMER.LIST);
    }
    res.render("customer-profile", { customer });
  } catch (error) {
    console.log(error.message);
    res.status(statusCode.INTERNAL_SERVER_ERROR).send({ message: "Internal server error" });
  }
};

module.exports = {
  renderCustomer,
  blockUser,
  unblockUser,
  renderCustomerProfile,
};
