const User = require("../../models/userModel");
const bcrypt = require("bcrypt");
const { StatusCode } = require("../../config/StatusCode");

const renderLogin = async (req, res) => {
  try {
    return res.render("login");
  } catch (error) {
    return next(error);
  }
};

const loadLogout = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.log("Logout error:", err.message);
        err.message = "Failed to logout"
        return next(err);
      }
      res.redirect("/admin");
    });
  } catch (error) {
    return next(error);
  }
};

const loadLogin = async (req, res) => {
  try {
    if (req.session.isAdmin) {
      return res.redirect("/admin/dashboard");
    } else {
      return res.redirect("/admin");
    }
  } catch (error) {
    return next(error);
  }
};

const verifyLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const userData = await User.findOne({ email });

    if (!userData) {
      req.flash("error", "User not found");
      return res.redirect("/admin/login");
    }

    const passwordMatch = await bcrypt.compare(password, userData.password);
    if (passwordMatch) {
      if (!userData.is_admin) {
        req.flash("error", "You are not authorized to login");
        return res.redirect("/admin");
      } else {
        req.session.adminId = userData._id;
        req.session.isAdmin = true;
        return res.redirect("/admin/dashboard");
      }
    } else {
      req.flash("error", "Email or password is incorrect");
      return res.redirect("/admin");
    }
  } catch (error) {
    return next(error);
  }
};

const renderDashboard = async (req, res) => {
  try {
    res.render("dashboard");
  } catch (error) {
    error.message = "Failed to load dashboard";
    return next(error);
  }
};

const logOut = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.log("Logout error:", err.message);
        err.message = ("Failed to logout")
        return next(error);
      }
      res.clearCookie('connect.sid');
      res.redirect("/admin/login");
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  renderLogin,
  loadLogout,
  loadLogin,
  verifyLogin,
  renderDashboard,
  logOut,
};
