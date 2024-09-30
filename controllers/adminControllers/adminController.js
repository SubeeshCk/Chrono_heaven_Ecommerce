const User = require("../../models/userModel");
const bcrypt = require("bcrypt");
const { StatusCode } = require("../../config/StatusCode");

const renderLogin = async (req, res) => {
  try {
    return res.render("login");
  } catch (error) {
    console.log(error.message);
    return res.status(StatusCode.INTERNAL_SERVER_ERROR).send({ error: "Internal server error" });
  }
};

const loadLogout = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.log("Logout error:", err.message);
        return res.status(StatusCode.INTERNAL_SERVER_ERROR).send({ error: "Failed to log out" });
      }
      res.redirect("/admin");
    });
  } catch (error) {
    console.log(error.message);
    return res.status(StatusCode.INTERNAL_SERVER_ERROR).send({ error: "Internal server error" });
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
    console.log(error.message);
    return res.status(StatusCode.INTERNAL_SERVER_ERROR).send({ error: "Internal server error" });
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
    console.log(error.message);
    return res.status(StatusCode.INTERNAL_SERVER_ERROR).send({ error: "Internal server error" });
  }
};

const renderDashboard = async (req, res) => {
  try {
    res.render("dashboard");
  } catch (error) {
    console.log(error.message);
    return res.status(StatusCode.INTERNAL_SERVER_ERROR).send({ error: "Failed to load dashboard" });
  }
};

const logOut = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.log("Logout error:", err.message);
        return res.status(StatusCode.INTERNAL_SERVER_ERROR).send({ error: "Failed to log out" });
      }
      res.clearCookie('connect.sid');
      res.redirect("/admin/login");
    });
  } catch (error) {
    console.log(error.message);
    return res.status(StatusCode.INTERNAL_SERVER_ERROR).send({ error: "Internal server error" });
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
