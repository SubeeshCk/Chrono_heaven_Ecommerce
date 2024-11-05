const User = require("../../models/userModel");
const moment = require("moment");
const API_ROUTES = require("../../config/apiRoutes");
const { StatusCode } = require("../../config/StatusCode");
const Address = require("../../models/userAddress");



const renderCustomer = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    const totalUsers = await User.countDocuments({ is_admin: 0 });
    const totalPages = Math.ceil(totalUsers / limit);

    const userData = await User.find({ is_admin: 0 })
      .skip(skip)
      .limit(limit)
      .sort({ joinedAt: -1 }); 

    const formattedUserData = userData.map((user) => {
      const joinedAtFormatted = moment(user.joinedAt).format("DD/MM/YYYY");
      return { ...user.toObject(), joinedAtFormatted };
    });

    const paginationLinks = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }


    for (let i = startPage; i <= endPage; i++) {
      paginationLinks.push({
        page: i,
        active: i === page,
        isSeparator: false
      });
    }


    if (startPage > 1) {
      paginationLinks.unshift(
        { page: 1, active: false, isSeparator: false },
        { page: '...', active: false, isSeparator: true }
      );
    }

    if (endPage < totalPages) {
      paginationLinks.push(
        { page: '...', active: false, isSeparator: true },
        { page: totalPages, active: false, isSeparator: false }
      );
    }

    return res.render("customers", {
      userData: formattedUserData,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        nextPage: page + 1,
        prevPage: page - 1,
        links: paginationLinks
      }
    });

  } catch (error) {
    return next(error);
  }
};


const blockUser = async (req, res, next) => {
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

const unblockUser = async (req, res, next) => {
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

const renderCustomerProfile = async (req, res, next) => {
  try {
    customerId = req.params.id;
    const customer = await User.findById(customerId);
    const addresses = await Address.find({ userId:customerId });
    
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
