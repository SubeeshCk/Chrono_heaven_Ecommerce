const express = require ("express");
const adminRoute = express();
const multer  = require('multer')

//multer
const productsUpload = require("../config/productConfig");

adminRoute.use(express.json());
adminRoute.use(express.urlencoded({ extended: true }));

//controllers
const adminController = require("../controllers/adminControllers/adminController");
const categoriesController = require("../controllers/adminControllers/categoriesController");
const productController = require("../controllers/adminControllers/productController");
const orderController = require ("../controllers/adminControllers/orderController");
const customerController = require ("../controllers/adminControllers/customerController");

//authentication middleware
const adminAuth = require("../middlewares/adminAuth");

//view engine
adminRoute.set('view engine','ejs');
adminRoute.set('views','./views/admin');

//*****************************   Admin login,logout,render dashbord  *******************************//
adminRoute.get("/",adminAuth.is_logout,adminController.renderLogin);
adminRoute.get("/login",adminAuth.is_logout,adminController.loadLogin);
adminRoute.post("/login",adminController.verifyLogin);
adminRoute.get('/dashboard',adminAuth.is_login,adminController.renderDashboard);
adminRoute.get('/logOut',adminAuth.is_login,adminController.logOut);

//*****************************   Categories  ************************************//
adminRoute.get("/categories",adminAuth.is_login,categoriesController.renderCategories);
adminRoute.get("/categories/add-category",adminAuth.is_login,categoriesController.renderAddCategory);
adminRoute.post("/categories/add-category",adminAuth.is_login, categoriesController.insertCategory);
adminRoute.get("/categories/edit-category/:id?",adminAuth.is_login,categoriesController.renderUpdateCategory);
adminRoute.post("/categories/update-category/:id?",adminAuth.is_login, categoriesController.updateCategory);
adminRoute.get("/categories/unlist-category/:id?",adminAuth.is_login,categoriesController.unlistCategory);
adminRoute.get("/categories/list-category/:id?",adminAuth.is_login,categoriesController.listCategory);

//*****************************   Products  *************************************//
adminRoute.get("/products",adminAuth.is_login,productController.renderProduct);
adminRoute.get("/products/add-products",adminAuth.is_login,productController.renderAddProducts);
adminRoute.post("/products/add-products",adminAuth.is_login,productsUpload,productController.addProduct);
adminRoute.get("/products/update-products/:id?",adminAuth.is_login,productController.renderUpdateProducts);
adminRoute.post("/products/update-products/:id?",adminAuth.is_login, productsUpload,productController.updateProducts);
adminRoute.get("/products/unlist-Products/:id?",adminAuth.is_login,productController.unlistProduct);
adminRoute.get("/products/list-products/:id?",adminAuth.is_login,productController.listProduct);

//*****************************   Orders  **************************************//
adminRoute.get("/orders",adminAuth.is_login,orderController.renderOrder);
adminRoute.get("/orders/order-details",adminAuth.is_login,orderController.renderOrderDetails);


//*****************************   customer  ************************************//
adminRoute.get("/customers",adminAuth.is_login,customerController.renderCustomer);
adminRoute.post('/customers/block',adminAuth.is_login, customerController.blockUser);
adminRoute.post('/customers/unblock',adminAuth.is_login, customerController.unblockUser);
adminRoute.get("/customers/customer-profile/:id?",adminAuth.is_login,customerController.renderCustomerProfile);


module.exports = adminRoute;