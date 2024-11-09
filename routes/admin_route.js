const express = require("express");
const adminRoute = express();
const multer = require('multer')

//multer
const productsUpload = require("../config/productConfig");

adminRoute.use(express.json());
adminRoute.use(express.urlencoded({ extended: true }));

//controllers
const adminController = require("../controllers/adminControllers/adminController");
const categoriesController = require("../controllers/adminControllers/categoriesController");
const productController = require("../controllers/adminControllers/productController");
const orderController = require("../controllers/adminControllers/orderController");
const customerController = require("../controllers/adminControllers/customerController");
const offerController = require("../controllers/adminControllers/offerControllers");
const salesReportController = require("../controllers/adminControllers/salesReportController");

//authentication middleware
const adminAuth = require("../middlewares/adminAuth");

//view engine
adminRoute.set('view engine', 'ejs');
adminRoute.set('views', './views/admin');

//*****************************   Admin login,logout,render dashbord  *******************************//
adminRoute.get("/", adminAuth.isLogout, adminController.renderLogin);
adminRoute.get("/login", adminAuth.isLogout, adminController.loadLogin);
adminRoute.post("/login", adminController.verifyLogin);
adminRoute.get('/dashboard', adminAuth.isLogin, adminController.loadDashboard);
adminRoute.get('/dashboard/data', adminAuth.isLogin, adminController.generateData);
adminRoute.get('/logOut', adminAuth.isLogin, adminController.logOut);

//*****************************   Categories  ************************************//
adminRoute.get("/categories", adminAuth.isLogin, categoriesController.renderCategories);
adminRoute.get("/categories/add-category", adminAuth.isLogin, categoriesController.renderAddCategory);
adminRoute.post("/categories/add-category", adminAuth.isLogin, categoriesController.insertCategory);
adminRoute.get("/categories/edit-category/:id?", adminAuth.isLogin, categoriesController.renderUpdateCategory);
adminRoute.post("/categories/update-category/:id?", adminAuth.isLogin, categoriesController.updateCategory);
adminRoute.get("/categories/unlist-category/:id?", adminAuth.isLogin, categoriesController.unlistCategory);
adminRoute.get("/categories/list-category/:id?", adminAuth.isLogin, categoriesController.listCategory);

//*****************************   Products  *************************************//
adminRoute.get("/products", adminAuth.isLogin, productController.renderProduct);
adminRoute.get("/products/add-products", adminAuth.isLogin, productController.renderAddProducts);
adminRoute.post("/products/add-products", adminAuth.isLogin, productsUpload, productController.addProduct);
adminRoute.get("/products/update-products/:id?", adminAuth.isLogin, productController.renderUpdateProducts);
adminRoute.post("/products/update-products/:id?", adminAuth.isLogin, productsUpload, productController.updateProducts);
adminRoute.get("/products/unlist-Products/:id?", adminAuth.isLogin, productController.unlistProduct);
adminRoute.get("/products/list-products/:id?", adminAuth.isLogin, productController.listProduct);

//*****************************   Orders  **************************************//
adminRoute.get("/orders", adminAuth.isLogin, orderController.renderOrder);
adminRoute.get("/orders/orderDetails", adminAuth.isLogin, orderController.renderOrderDetails);
adminRoute.post('/orders/orderDetails/updateOrderStatus', adminAuth.isLogin, orderController.updateOrderStatus);
adminRoute.post('/orders/orderDetails/updateProductStatus', adminAuth.isLogin, orderController.updateProductStatus);
adminRoute.get('/return', adminAuth.isLogin, orderController.renderReturnRequest)
adminRoute.post('/acceptCompleteReturn', adminAuth.isLogin, orderController.acceptCompleteReturn);
adminRoute.post('/acceptPartialReturn', adminAuth.isLogin, orderController.acceptPartialReturn);
adminRoute.post("/declineReturn", adminAuth.isLogin, orderController.declineReturn);


//*****************************   customer  ************************************//
adminRoute.get("/customers", adminAuth.isLogin, customerController.renderCustomer);
adminRoute.post('/customers/block', adminAuth.isLogin, customerController.blockUser);
adminRoute.post('/customers/unblock', adminAuth.isLogin, customerController.unblockUser);
adminRoute.get("/customers/customer-profile/:id?", adminAuth.isLogin, customerController.renderCustomerProfile);


//*****************************   Offer  ************************************//
adminRoute.get('/coupons', adminAuth.isLogin, offerController.renderCoupons);
adminRoute.post('/addCoupon', adminAuth.isLogin, offerController.addCoupons);
adminRoute.get('/getCoupon/:id', adminAuth.isLogin, offerController.getCoupon);
adminRoute.put('/updateCoupon/:id', adminAuth.isLogin, offerController.updateCoupon);
adminRoute.delete('/removeCoupon/:couponId', adminAuth.isLogin, offerController.removeCoupon);
adminRoute.get('/product-offers', adminAuth.isLogin, offerController.renderProductOffers);
adminRoute.get('/category-offers', adminAuth.isLogin, offerController.renderCategoryOffer);
adminRoute.get('/addProductOffer', adminAuth.isLogin, offerController.renderAddProductOffer);
adminRoute.get('/editProductOffer/:id', adminAuth.isLogin, offerController.renderEditOffer);
adminRoute.get('/addCategoryOffer', adminAuth.isLogin, offerController.renderAddCategoryOffer);
adminRoute.get('/editCategoryOffer/:id', adminAuth.isLogin, offerController.renderEditCategoryOffer);
adminRoute.post('/addCategoryOffer', adminAuth.isLogin, offerController.AddCategoryOffer);
adminRoute.post('/updateCategoryOffer/:id', adminAuth.isLogin, offerController.updateCategoryOffer);
adminRoute.delete('/removeCategoryOffer/:offerId', adminAuth.isLogin, offerController.removeCategoryOffer);
adminRoute.post('/addProductOffer', adminAuth.isLogin, offerController.addProductOffer);
adminRoute.post('/updateProductOffer/:id', adminAuth.isLogin, offerController.updateProductOffer);
adminRoute.delete('/removeProductOffer/:offerId', adminAuth.isLogin, offerController.removeProductOffer);


//*****************************   Sales report  ************************************//
adminRoute.get('/sales-report',adminAuth.isLogin,salesReportController.renderSalesReport)
adminRoute.post('/sortReport',adminAuth.isLogin,salesReportController.sortReport)
adminRoute.get('/downloadsalesreport',salesReportController.downloadSalesReport)


module.exports = adminRoute;