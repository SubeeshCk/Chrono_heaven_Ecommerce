const User = require("../../models/userModel");
const bcrypt = require("bcrypt");
const { StatusCode } = require("../../config/StatusCode");
const Order = require ("../../models/orderModel");
const Products = require ("../../models/product");

const renderLogin = async (req, res, next) => {
  try {
    return res.render("login");
  } catch (error) {
    return next(error);
  }
};

const loadLogout = async (req, res, next) => {
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

const loadLogin = async (req, res, next) => {
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

const verifyLogin = async (req, res, next) => {
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

const loadDashboard = async (req, res) => {
  try {
    const allOrders = await Order.find();

    let deliveredOrders = [];
    let returnedOrders = [];
    let cancelledOrders = [];

    let totalRevenue = 0;
    let currentMonthEarnings = 0;
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    allOrders.forEach((order) => {
      const orderDate = new Date(order.orderDate);

      if (order.orderStatus === "delivered" || order.orderStatus === "returnRequestCancelled" || order.orderStatus === "returnRequested") {
        deliveredOrders.push(order);
        totalRevenue += order.orderAmount;
        if (orderDate.getMonth() === thisMonth && orderDate.getFullYear() === thisYear) {
          currentMonthEarnings += order.orderAmount;
        }
      } else if (order.orderStatus === "Returned") {
        returnedOrders.push(order);
      } else if (order.orderStatus === "Cancelled") {
        cancelledOrders.push(order);
      }
    });

    const totalOrders = allOrders.length;
    const totalReturns = returnedOrders.length;
    const totalCancellations = cancelledOrders.length;

    const chartData = {
      sales: { labels: ["Total Revenue"], data: [totalRevenue] },
      orders: { labels: ["Delivered", "Returned", "Cancelled"], data: [deliveredOrders.length, returnedOrders.length, cancelledOrders.length] },
      totalOrders,
    };

    res.render("dashboard", {
      totalOrders,
      totalRevenue,
      totalReturns,
      totalCancellations,
      monthlyEarning: currentMonthEarnings,
      chartData: JSON.stringify(chartData),
    });
  } catch (error) {
    console.log("Error loading dashboard:", error);
    res.status(500).send("Error loading dashboard");
  }
};


const generateData = async (req, res) => {
  const reportType = req.query.reportType;
  try {
    const now = new Date();
    let labels = [];
    let salesData = [];
    let ordersData = [];

    switch (reportType) {
      case "daily":
        labels = Array.from({ length: 24 }, (_, i) => `${i}:00`);
        for (let i = 0; i < 24; i++) {
          const startHour = new Date(now);
          startHour.setHours(i, 0, 0, 0);
          const endHour = new Date(now);
          endHour.setHours(i + 1, 0, 0, 0);

          const orders = await Order.find({
            createdAt: { $gte: startHour, $lt: endHour },
          });

          ordersData.push(orders.length);
          salesData.push(orders.reduce((sum, order) => sum + order.orderAmount, 0));
        }
        break;

      case "weekly":
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          labels.push(date.toLocaleDateString("en-US", { weekday: "short" }));

          const startDay = new Date(date);
          startDay.setHours(0, 0, 0, 0);
          const endDay = new Date(date);
          endDay.setHours(23, 59, 59, 999);

          const orders = await Order.find({
            createdAt: { $gte: startDay, $lte: endDay },
          });

          ordersData.push(orders.length);
          salesData.push(orders.reduce((sum, order) => sum + order.orderAmount, 0));
        }
        break;

      case "monthly":
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        for (let i = 1; i <= daysInMonth; i++) {
          const date = new Date(now.getFullYear(), now.getMonth(), i);
          labels.push(i.toString());

          const startDay = new Date(date);
          startDay.setHours(0, 0, 0, 0);
          const endDay = new Date(date);
          endDay.setHours(23, 59, 59, 999);

          const orders = await Order.find({
            createdAt: { $gte: startDay, $lte: endDay },
          });

          ordersData.push(orders.length);
          salesData.push(orders.reduce((sum, order) => sum + order.orderAmount, 0));
        }
        break;

      case "yearly":
        for (let i = 0; i < 12; i++) {
          const date = new Date(now.getFullYear(), i, 1);
          labels.push(date.toLocaleDateString("en-US", { month: "short" }));

          const startMonth = new Date(now.getFullYear(), i, 1);
          const endMonth = new Date(now.getFullYear(), i + 1, 0);

          const orders = await Order.find({
            createdAt: { $gte: startMonth, $lte: endMonth },
          });

          ordersData.push(orders.length);
          salesData.push(orders.reduce((sum, order) => sum + order.orderAmount, 0));
        }
        break;

      default:
        break;
    }

    const data = {
      sales: { labels, data: salesData },
      orders: { labels, data: ordersData },
    };

    res.json(data);
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    res.status(500).send("Error fetching dashboard data");
  }
};

const logOut = async (req, res, next) => {
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
  loadDashboard,
  generateData,
  logOut,
};
