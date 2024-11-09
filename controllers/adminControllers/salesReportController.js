const moment = require('moment');
const Order = require('../../models/orderModel');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const ExcelJS = require('exceljs');

const ORDER_STATUS_GROUPS = {
  completed: ['delivered', 'returnRequestCancelled','returnRequested'],
  pending: ['pending'],
  processing: ['confirmed', 'shipped'],
  cancelled: ['Cancelled'],
  returned: ['Returned']
};

const getQueryByFilters = (dateRange, startDate, endDate, statusGroup) => {
  let query = {};

  if (dateRange === "custom" && startDate && endDate) {
    query.orderDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
  } else if (dateRange === "daily") {
    const now = moment();
    query.orderDate = {
      $gte: now.startOf("day").toDate(),
      $lte: now.endOf("day").toDate(),
    };
  } else if (dateRange === "weekly") {
    const now = moment();
    query.orderDate = {
      $gte: now.startOf("week").toDate(),
      $lte: now.endOf("week").toDate(),
    };
  } else if (dateRange === "monthly") {
    const now = moment();
    query.orderDate = {
      $gte: now.startOf("month").toDate(),
      $lte: now.endOf("month").toDate(),
    };
  } else if (dateRange === "yearly") {
    const now = moment();
    query.orderDate = {
      $gte: now.startOf("year").toDate(),
      $lte: now.endOf("year").toDate(),
    };
  }

  if (statusGroup && ORDER_STATUS_GROUPS[statusGroup]) {
    query.orderStatus = { $in: ORDER_STATUS_GROUPS[statusGroup] };
  }

  return query;
};

const calculateOrderStats = (order) => {
  const stats = {
    itemCount: 0,
    subtotal: 0,
    discount: order.discount || 0,
    couponDiscount: order.couponDiscount || 0,
    totalDiscount: 0,
    finalAmount: order.orderAmount || 0
  };

  if (order.orderedItem && Array.isArray(order.orderedItem)) {
    const filteredItems = order.orderedItem.filter(item => {
      return item.status !== 'Cancelled' && item.status !== 'Returned' && item.status !== 'pending';
    });

    stats.itemCount = filteredItems.length;
    stats.subtotal = filteredItems.reduce((sum, item) => {
      return sum + (item.totalProductAmount || 0);
    }, 0);
  }

  stats.totalDiscount = stats.discount + stats.couponDiscount;

  return stats;
};

const getOrdersData = (orders) => {
  const overallStats = {
    totalOrders: 0,
    totalAmount: 0,
    totalDiscount: 0,
    totalCouponDiscount: 0,
  };

  const ordersData = orders.map((order) => {
    const stats = calculateOrderStats(order);
    
    overallStats.totalOrders++;
    overallStats.totalAmount += stats.subtotal;
    overallStats.totalDiscount += stats.totalDiscount;
    overallStats.totalCouponDiscount += (order.couponDiscount || 0);

    return {
      orderId: order._id.toString(),
      customerName: order.userId?.name || "Unknown",
      itemCount: stats.itemCount,
      productNames: order.orderedItem
        .map(item => item.productId?.product_name)
        .join(', ').substring(0, 50) + 
        (order.orderedItem.length > 2 ? '...' : ''),
      subtotal: stats.subtotal,
      discount: stats.discount,
      couponDiscount: stats.couponDiscount,
      totalDiscount: stats.totalDiscount,
      finalAmount: stats.finalAmount,
      orderStatus: order.orderStatus,
      orderDate: order.orderDate,
      paymentMethod: order.paymentMethod,
      deliveryAddress: order.deliveryAddress?.address || "Unknown"
    };
  });

  return { ordersData, overallStats };
};

const renderSalesReport = async (req, res) => {
  try {
    res.render('salesReport', { 
      moment,
      statusGroups: ORDER_STATUS_GROUPS 
    });
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
};

const sortReport = async (req, res) => {
  try {
    const { dateRange, startDate, endDate, statusGroup, page } = req.body;
    const query = getQueryByFilters(dateRange, startDate, endDate, statusGroup);

    const orders = await Order.find(query)
      .sort({ orderDate: -1 })
      .populate({
        path: 'orderedItem.productId',
        select: 'product_name price',
      })
      .populate('userId')
      .populate('deliveryAddress');

    const { ordersData, overallStats } = getOrdersData(orders);

    const pageNum = parseInt(page) || 1;
    const limit = 4;
    const skip = (pageNum - 1) * limit;
    const paginatedItems = ordersData.slice(skip, skip + limit);
    const totalPages = Math.ceil(ordersData.length / limit);

    res.json({
      salesData: paginatedItems,
      totalPages: totalPages,
      currentPage: pageNum,
      overallStats: overallStats
    });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};


const downloadSalesReport = async (req, res) => {
  try {
    const { format, dateRange, startDate, endDate, statusGroup } = req.query;
    const query = getQueryByFilters(dateRange, startDate, endDate, statusGroup);

    const orders = await Order.find(query)
      .sort({ orderDate: -1 })
      .populate({
        path: 'orderedItem.productId',
        select: 'product_name price',
      })
      .populate('userId');

    const { ordersData, overallStats } = getOrdersData(orders);

    if (format === 'excel') {
      await generateExcelReport(ordersData, overallStats, res);
    } else {
      await generatePDFReport(ordersData, overallStats, res);
    }
  } catch (error) {
    console.error("Error in downloadSalesReport:", error);
    res.status(500).send("Internal Server Error");
  }
};

const generateExcelReport = async (ordersData, overallStats, res) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Sales Report');

  worksheet.mergeCells('A1:H1');
  worksheet.getCell('A1').value = 'CHRONO HEAVEN - Sales Report';
  worksheet.getCell('A1').alignment = { horizontal: 'center' };
  worksheet.getCell('A1').font = { bold: true, size: 16 };

  worksheet.mergeCells('A3:B3');
  worksheet.getCell('A3').value = 'Report Generated:';
  worksheet.getCell('C3').value = moment().format('MMMM Do YYYY, h:mm:ss a');

  worksheet.mergeCells('A4:B4');
  worksheet.getCell('A4').value = 'Total Orders:';
  worksheet.getCell('C4').value = overallStats.totalOrders;

  worksheet.mergeCells('A5:B5');
  worksheet.getCell('A5').value = 'Total Revenue:';
  worksheet.getCell('C5').value = `₹${overallStats.totalAmount.toFixed(2)}`;

  const headers = [
    'Order ID',
    'Customer Name',
    'Items',
    'Subtotal',
    'Discount',
    'Final Amount',
    'Status',
    'Date'
  ];

  worksheet.addRow(headers);
  const headerRow = worksheet.getRow(7);
  headerRow.font = { bold: true };
  headerRow.alignment = { horizontal: 'center' };

  ordersData.forEach(order => {
    worksheet.addRow([
      order.orderId.slice(-6),
      order.customerName,
      `${order.itemCount} items`,
      `₹${order.subtotal.toFixed(2)}`,
      `₹${order.totalDiscount.toFixed(2)}`,
      `₹${order.finalAmount.toFixed(2)}`,
      order.orderStatus,
      moment(order.orderDate).format('DD/MM/YYYY')
    ]);
  });

  worksheet.columns.forEach(column => {
    column.width = 15;
    column.alignment = { horizontal: 'center' };
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=SalesReport_${moment().format('YYYYMMDD_HHmmss')}.xlsx`);

  await workbook.xlsx.write(res);
};

const generatePDFReport = async (ordersData, overallStats, res) => {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const reportsDir = path.join(__dirname, '../../public/reports');

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

  doc.fillColor("#444444")
     .fontSize(28)
     .text("CHRONO HEAVEN", 50, 50, { align: 'center' })
     .fontSize(20)
     .text("Sales Report", 50, 80, { align: 'center' })
     .fontSize(10)
     .text(`Generated on: ${moment().format('MMMM Do YYYY, h:mm:ss a')}`, 50, 100, { align: 'center' });

  generateHr(120);

  const reportDetailsTop = 140;
  doc.fontSize(10)
     .text("Total Orders:", 50, reportDetailsTop)
     .text(overallStats.totalOrders.toString(), 150, reportDetailsTop)
     .text("Total Revenue:", 50, reportDetailsTop + 20)
     .text(`₹${overallStats.totalAmount.toFixed(2)}`, 150, reportDetailsTop + 20);

  generateHr(reportDetailsTop + 40);

  let y = reportDetailsTop + 60;
  
  doc.font('Helvetica-Bold');
  doc.fontSize(9)
     .text('Order ID', 50, y)
     .text('Customer', 130, y)
     .text('Items', 200, y)
     .text('Amount', 265, y)
     .text('Status', 330, y)
     .text('Date', 480, y);

  generateHr(y + 20);
  y += 30;

  doc.font('Helvetica');
  ordersData.forEach(order => {
    if (y > 700) {
      doc.addPage();
      y = 50;
    }

    doc.fontSize(9)
       .text(order.orderId.slice(-6), 50, y)
       .text(order.customerName.substring(0, 15), 130, y)
       .text(`${order.itemCount} items`, 200, y)
       .text(`₹${order.finalAmount.toFixed(2)}`, 265, y)
       .text(order.orderStatus, 330, y)
       .text(moment(order.orderDate).format('DD/MM/YYYY'), 480, y);

    y += 20;
    generateHr(y);
    y += 10;
  });

  doc.fontSize(10)
     .text("© 2024 Chrono Heaven. All rights reserved.", 50, 730, { align: "center", width: 500 });

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
};


module.exports = {
  renderSalesReport,
  downloadSalesReport,
  sortReport,
};