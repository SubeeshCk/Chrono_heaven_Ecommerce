const User = require("../models/userModel");

const is_login = (req, res, next) => {
  if (req.session.userId || (req.user && req.user._id)) {
    next();
  } else {
    res.redirect("/login");
  }
};
const is_logout = async (req, res, next) => {
  try {
    if (req.session.userId) {
      res.redirect("/");
    } else {
      next();
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).send({ message: "Internal server error" });
  }
};

module.exports = {
  is_login,
  is_logout,
};
