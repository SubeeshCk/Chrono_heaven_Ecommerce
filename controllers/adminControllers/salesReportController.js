const moment = require('moment');
const Order = require('../../models/orderModel');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');

const VALID_ORDER_STATUSES = ['delivered', 'returnRequestCancelled'];
const EXCLUDED_ITEM_STATUSES = ['returned', 'returnRequested', 'cancelled'];

const getQueryByDateRange = (dateRange, startDate, endDate) => {
  let query = {
    orderStatus: { $in: VALID_ORDER_STATUSES }
  };
  const now = moment();

  if (dateRange === "custom" && startDate && endDate) {
    query.orderDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
  } else if (dateRange === "daily") {
    query.orderDate = {
      $gte: now.startOf("day").toDate(),
      $lte: now.endOf("day").toDate(),
    };
  } else if (dateRange === "weekly") {
    query.orderDate = {
      $gte: now.startOf("week").toDate(),
      $lte: now.endOf("week").toDate(),
    };
  } else if (dateRange === "yearly") {
    query.orderDate = {
      $gte: now.startOf("year").toDate(),
      $lte: now.endOf("year").toDate(),
    };
  }
  return query;
};

const filterValidItems = (order) => {
  // Filter out items with excluded statuses
  const validItems = order.orderedItem.filter(
    item => !EXCLUDED_ITEM_STATUSES.includes(item.status)
  );

  // Calculate the total amount for excluded items
  const excludedAmount = order.orderedItem
    .filter(item => EXCLUDED_ITEM_STATUSES.includes(item.status))
    .reduce((sum, item) => sum + (item.totalProductAmount || 0), 0);

  // Adjust the order amount by subtracting excluded items
  const adjustedAmount = order.orderAmount - excludedAmount;

  return {
    validItems,
    adjustedAmount: Math.max(0, adjustedAmount) // Ensure we don't return negative amounts
  };
};

const getOrdersData = (orders) => {
  return orders.map((order) => {
    const { validItems, adjustedAmount } = filterValidItems(order);

    // Only include orders that have valid items
    if (validItems.length === 0) return null;

    return {
      orderId: order._id.toString().slice(0, 7),
      customerName: order.userId?.name || "Unknown",
      itemCount: validItems.length,
      productNames: validItems
        .map(item => item.productId?.product_name)
        .join(', ').substring(0, 50) + 
        (validItems.length > 2 ? '...' : ''),
      totalAmount: adjustedAmount,
      orderStatus: order.orderStatus,
      orderDate: order.orderDate,
      paymentMethod: order.paymentMethod,
      deliveryAddress: order.deliveryAddress?.address || "Unknown"
    };
  }).filter(order => order !== null); // Remove orders with no valid items
};

const renderSalesReport = async (req, res) => {
  try {
    res.render('salesReport', { moment });
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
};

const sortReport = async (req, res) => {
  try {
    const { dateRange, startDate, endDate, page } = req.body;
    const query = getQueryByDateRange(dateRange, startDate, endDate);

    const orders = await Order.find(query)
      .sort({ orderDate: -1 })
      .populate({
        path: 'orderedItem.productId',
        select: 'product_name price',
      })
      .populate('userId')
      .populate('deliveryAddress');

    const ordersData = getOrdersData(orders);

    const pageNum = parseInt(page) || 1;
    const limit = 4;
    const skip = (pageNum - 1) * limit;
    const paginatedItems = ordersData.slice(skip, skip + limit);

    const totalPages = Math.ceil(ordersData.length / limit);

    res.json({
      salesData: paginatedItems,
      totalPages: totalPages,
      currentPage: pageNum
    });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const downloadSalesReport = async (req, res) => {
  try {
    const orders = await Order.find({ orderStatus: { $in: VALID_ORDER_STATUSES } })
      .sort({ orderDate: -1 })
      .populate({
        path: 'orderedItem.productId',
        select: 'product_name price',
      })
      .populate('userId');

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const reportsDir = path.join(__dirname, '../public/reports');

    await fsPromises.mkdir(reportsDir, { recursive: true });

    const filePath = path.join(reportsDir, `salesReport_${moment().format('YYYYMMDD_HHmmss')}.pdf`);
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    const generateHr = (y) => {
      doc.strokeColor("#aaaaaa")
         .lineWidth(1)
         .moveTo(50, y)
         .lineTo(550, y)
         .stroke();
    };

    const formatCurrency = (amount) => {
      if (typeof amount !== 'number' || isNaN(amount)) {
        return 'Rs. 0.00';
      }
      return "Rs. " + amount.toFixed(2);
    };

    const formatDate = (date) => {
      return moment(date).format('DD/MM/YYYY');
    };

    let pageNumber = 1;
    doc.on('pageAdded', () => {
      pageNumber++;
      doc.text(`Page ${pageNumber}`, 50, 750, { align: 'center' });
    });

    // Header
    doc.fillColor("#444444")
       .fontSize(28)
       .text("CHRONO HEAVEN", 50, 50, { align: 'center' })
       .fontSize(20)
       .text("Sales Report", 50, 80, { align: 'center' })
       .fontSize(10)
       .text(`Generated on: ${moment().format('MMMM Do YYYY, h:mm:ss a')}`, 50, 100, { align: 'center' });

    generateHr(120);

    // Report Summary
    const reportDetailsTop = 140;
    const startDate = formatDate(orders[0]?.orderDate);
    const endDate = formatDate(orders[orders.length - 1]?.orderDate);
    
    // Calculate total amount considering only valid items
    const totalAmount = orders.reduce((sum, order) => {
      const { adjustedAmount } = filterValidItems(order);
      return sum + adjustedAmount;
    }, 0);

    doc.fontSize(10)
       .text("Report Period:", 50, reportDetailsTop)
       .text(`From: ${startDate}`, 150, reportDetailsTop)
       .text(`To: ${endDate}`, 300, reportDetailsTop)
       .text("Total Orders:", 50, reportDetailsTop + 20)
       .text(orders.length.toString(), 150, reportDetailsTop + 20)
       .text("Total Revenue:", 50, reportDetailsTop + 40)
       .text(formatCurrency(totalAmount), 150, reportDetailsTop + 40);

    generateHr(reportDetailsTop + 60);

    // Table
    const tableTop = 240;
    let y = tableTop;

    const generateTableRow = (y, orderId, customer, items, total, status, date) => {
      doc.fontSize(9)
         .text(orderId, 50, y, { width: 80 })
         .text(customer, 130, y, { width: 100 })
         .text(items, 230, y, { width: 100 })
         .text(total, 350, y, { width: 60})
         .text(status, 420, y, { width: 80 })
         .text(date, 480, y, { width: 70 });
    };

    // Table Header
    doc.font('Helvetica-Bold');
    generateTableRow(y, 'Order ID', 'Customer', 'Items', 'Total', 'Status', 'Date');
    generateHr(y + 20);
    y += 30;

    // Table Content
    doc.font('Helvetica');
    orders.forEach((order) => {
      const { validItems, adjustedAmount } = filterValidItems(order);
      
      // Skip orders with no valid items
      if (validItems.length === 0) return;

      const itemsText = `${validItems.length} items`;
      
      generateTableRow(
        y,
        order._id.toString().slice(-6),
        order.userId?.name?.slice(0, 15) || 'Unknown',
        itemsText,
        formatCurrency(adjustedAmount),
        order.orderStatus,
        formatDate(order.orderDate)
      );
      
      y += 20;
      generateHr(y);
      y += 10;

      if (y > 700) {
        doc.addPage();
        y = 50;
        generateHr(y - 10);
      }
    });

    // Footer
    doc.fontSize(10)
       .text(
        "© 2024 Chrono_heaven. All rights reserved.",
        50,
        730,
        { align: "center", width: 500 }
      );

    doc.end();

    writeStream.on('finish', () => {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${path.basename(filePath)}`);
      res.sendFile(filePath, (err) => {
        if (err) {
          console.error("Error sending file:", err);
          res.status(500).send("Error downloading PDF");
        }
        fs.unlinkSync(filePath);
      });
    });

    writeStream.on('error', (err) => {
      console.error("Error writing PDF:", err);
      res.status(500).send("Error generating PDF");
    });

  } catch (error) {
    console.error("Error in downloadSalesReport:", error);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = {
  renderSalesReport,
  downloadSalesReport,
  sortReport,
};