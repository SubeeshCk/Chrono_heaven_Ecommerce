const User = require("../../models/userModel");
const bcrypt = require("bcrypt");
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
    const allOrders = await Order.find()
      .populate({
        path: "orderedItem.productId",
        populate: {
          path: "category",
          model: "Category",
        },
      })
      .lean();

    const dashboardData = initializeDashboardData();
    allOrders.forEach(order => processOrder(order, dashboardData));

    const topProducts = await getTopProducts();
    const topCategories = getTopCategories(dashboardData.categoryPurchaseCount);

    // Get initial daily data for charts
    const now = new Date();
    const initialChartData = await generateFilteredData('yearly', now); // Changed to yearly for initial load

    res.render("dashboard", {
      deliveredOrders: dashboardData.deliveredOrders,
      totalOrders: allOrders.length,
      totalRevenue: Number(dashboardData.totalRevenue.toFixed(2)),
      totalReturns: dashboardData.returnedOrders.length,
      totalCancellations: dashboardData.cancelledOrders.length,
      monthlyEarning: Number(dashboardData.currentMonthEarnings.toFixed(2)),
      chartData: JSON.stringify(initialChartData),
      topProducts: topProducts,
      topCategories: topCategories,
    });
  } catch (error) {
    console.log("Error loading dashboard:", error);
    res.status(500).send("Error loading dashboard");
  }
};

const generateData = async (req, res) => {
  const reportType = req.query.reportType;
  try {
    const totalOrders = await Order.countDocuments();
    const now = new Date();
    const data = await generateFilteredData(reportType, now);
    res.json(data);
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    res.status(500).send("Error fetching dashboard data");
  }
};

function initializeDashboardData() {
  return {
    deliveredOrders: [],
    returnedOrders: [],
    cancelledOrders: [],
    totalRevenue: 0,
    currentMonthEarnings: 0,
    categoryPurchaseCount: {},
  };
}

function processOrder(order, dashboardData) {
  const orderDate = new Date(order.orderDate);
  let orderTotal = 0;
  const now = new Date();

  order.orderedItem.forEach((item) => {
    const categoryName = 
      (item.productId.category && item.productId.category.name) || 
      "Unknown";

    if (item.status === "delivered" || item.status === "returnRequested" || item.status === "returnRequestCancelled") {
      if (!dashboardData.deliveredOrders.includes(order)) {
        dashboardData.deliveredOrders.push(order);
      }
    } else if (item.status === "Returned") {
      if (!dashboardData.returnedOrders.includes(order)) {
        dashboardData.returnedOrders.push(order);
      }
    } else if (item.status === "Cancelled") {
      if (!dashboardData.cancelledOrders.includes(order)) {
        dashboardData.cancelledOrders.push(order);
      }
    }

    if (item.status !== "Cancelled" && item.status !== "Returned" && item.status !== "pending") {
      orderTotal += item.totalProductAmount;

      if (!dashboardData.categoryPurchaseCount[categoryName]) {
        dashboardData.categoryPurchaseCount[categoryName] = 0;
      }
      dashboardData.categoryPurchaseCount[categoryName] += item.quantity;
    }
  });

  const orderRevenue = orderTotal - (order.couponDiscount || 0);

  if (orderRevenue > 0) {
    dashboardData.totalRevenue += orderRevenue;
    if (
      orderDate.getMonth() === now.getMonth() &&
      orderDate.getFullYear() === now.getFullYear()
    ) {
      dashboardData.currentMonthEarnings += orderRevenue;
    }
  }
}

async function getTopProducts() {
  const topProducts = await Products.find()
    .sort({ sales_count: -1 })
    .limit(10)
    .select('product_name sales_count');

  return topProducts.map(product => ({
    name: product.product_name,
    count: product.sales_count
  }));
}

function getTopCategories(categoryPurchaseCount) {
  return Object.entries(categoryPurchaseCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));
}

async function generateFilteredData(reportType, now) {
  let labels = [];
  let salesData = [];
  let ordersData = [];
  
  const timeRanges = {
    daily: generateDailyTimeRanges(now),
    weekly: generateWeeklyTimeRanges(now),
    monthly: generateMonthlyTimeRanges(now),
    yearly: generateYearlyTimeRanges(now)
  };

  const { ranges, labels: timeLabels } = timeRanges[reportType] || timeRanges.daily;
  labels = timeLabels;

  for (const { start, end } of ranges) {
    // Use createdAt for finding orders within range
    const orders = await Order.find({
      orderDate: {
        $gte: start,
        $lte: end
      }
    }).lean();

    const periodOrders = orders.length;
    const periodRevenue = calculateRevenue(orders);

    ordersData.push(periodOrders);
    salesData.push(periodRevenue);
  }

  // Get total orders count
  const totalOrders = await Order.countDocuments();

  return {
    sales: { 
      labels, 
      data: salesData.map(value => Number(value.toFixed(2))) 
    },
    orders: { 
      labels, 
      data: ordersData 
    },
    totalOrders
  };
}

function calculateRevenue(orders) {
  return orders.reduce((sum, order) => {
    const orderTotal = order.orderedItem.reduce((itemSum, item) => {
      if (item.status !== "Cancelled" && 
          item.status !== "Returned" && 
          item.status !== "pending") {
        return itemSum + (item.totalProductAmount || 0);
      }
      return itemSum;
    }, 0);

    const orderRevenue = orderTotal - (order.couponDiscount || 0);
    return sum + (orderRevenue > 0 ? orderRevenue : 0);
  }, 0);
}

function generateDailyTimeRanges(now) {
  const ranges = [];
  const labels = Array.from({ length: 24 }, (_, i) => `${i}:00`);

  for (let i = 0; i < 24; i++) {
    const start = new Date(now);
    start.setHours(i, 0, 0, 0);
    const end = new Date(now);
    end.setHours(i + 1, 0, 0, 0);
    ranges.push({ start, end });
  }

  return { ranges, labels };
}

function generateWeeklyTimeRanges(now) {
  const ranges = [];
  const labels = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    labels.push(date.toLocaleDateString("en-US", { weekday: "short" }));

    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    ranges.push({ start, end });
  }

  return { ranges, labels };
}

function generateMonthlyTimeRanges(now) {
  const ranges = [];
  const labels = [];
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(now.getFullYear(), now.getMonth(), i);
    labels.push(i.toString());

    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    ranges.push({ start, end });
  }

  return { ranges, labels };
}

function generateYearlyTimeRanges(now) {
  const ranges = [];
  const labels = [];
  
  const startYear = new Date(now.getFullYear(), 0, 1);
  
  for (let i = 0; i < 12; i++) {
    const monthStart = new Date(startYear.getFullYear(), i, 1);
    const monthEnd = new Date(startYear.getFullYear(), i + 1, 0, 23, 59, 59, 999);
    
    labels.push(monthStart.toLocaleDateString("en-US", { month: "short" }));
    ranges.push({ 
      start: monthStart,
      end: monthEnd
    });
  }

  return { ranges, labels };
}


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
