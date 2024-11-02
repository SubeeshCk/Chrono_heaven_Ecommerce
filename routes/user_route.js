const express = require ("express");
const userRoute = express();
const passport = require('passport')
require('../middlewares/passport');

//controllers
const userVerificationController = require("../controllers/userControllers/userVerificationController");
const userController = require("../controllers/userControllers/userController");
const profileController = require("../controllers/userControllers/profileController");
const cartController = require("../controllers/userControllers/cartController");
const walletController = require("../controllers/userControllers/walletController");

//middlewares
const userAuth = require("../middlewares/userAuth");
const { setUserData } = require("../middlewares/setUserData");
const setCartCount = require("../middlewares/setCartCount");
const setWishlistData = require("../middlewares/setWishlistData");

userRoute.use(passport.initialize());
userRoute.use(passport.session());

//setting /userAssets as static
userRoute.use('/userAssets', express.static('public/userAssets'));

//view engine
userRoute.set('views','./views/user');



/******************************* USER SIGNUP,SIGN IN,LOGOUT ,OTP **********************************/
userRoute.get('/signUp',userAuth.isLogout,userVerificationController.renderSignUp);
userRoute.post('/signUp',userAuth.isLogout, userVerificationController.insertUser);
userRoute.get('/login',userAuth.isLogout,userVerificationController.renderLogin);
userRoute.post('/login',userAuth.isLogout, userVerificationController.verifyLogin);
userRoute.get('/otp',userAuth.isLogout,userVerificationController.renderOtp);
userRoute.post('/verifyOTP',userAuth.isLogout ,userVerificationController.verifyOtp);
userRoute.get('/resendOtp',userAuth.isLogout ,userVerificationController.resendOtp);
userRoute.get('/forgot-password',userAuth.isLogout,userVerificationController.renderForgotPassword);
userRoute.post('/findAccount',userAuth.isLogout,userVerificationController.findAccount);
userRoute.get("/reset-otp",userAuth.isLogout,userVerificationController.renderResetOtp);
userRoute.post('/verifyResetOtp',userAuth.isLogout,userVerificationController.verifyResetOtp);
userRoute.get('/reset-password',userAuth.isLogout,userVerificationController.renderResetPassword);
userRoute.post("/reset-password",userAuth.isLogout,userVerificationController.updatePassword);
userRoute.get('/resendResetOtp',userAuth.isLogout,userVerificationController.resendResetOtp);
userRoute.get('/logOut',userAuth.isLogin,userVerificationController.logOut);


//************************* HOME,SHOP,PRODUCT_DETAILS,WOMEN,MEN******************************//
userRoute.get('/',setUserData ,setCartCount,setWishlistData, userController.renderHome);
userRoute.get('/products',setUserData ,setCartCount,setWishlistData, userController.renderProducts);
userRoute.get('/product-details/:id?',setUserData, setCartCount, setWishlistData, userController.productDetails);
userRoute.get('/products/womens',setUserData ,setCartCount,setWishlistData, userController.renderWomens);
userRoute.get('/products/mens',setUserData ,setCartCount,setWishlistData,  userController.renderMens);
userRoute.get('/sort-products',setUserData ,setCartCount, userController.sortProducts);
userRoute.get('/wishlist',userAuth.isLogin,setUserData ,setCartCount,setWishlistData, userController.renderWishlist)
userRoute.get('/addToWishlist',userAuth.isLogin,setUserData, userController.addToWishlist)
userRoute.get('/RemoveFromWishlist',userAuth.isLogin,setUserData, userController.RemoveFromWishlist)



//********************************User profile management************************************//
userRoute.get('/user-profile',userAuth.isLogin ,setUserData ,setCartCount ,setWishlistData, profileController.renderProfile);
userRoute.get('/user-profile/edit-profile',userAuth.isLogin ,setUserData ,setCartCount,setWishlistData, profileController.renderEditProfile);
userRoute.post('/user-profile/edit-profile',userAuth.isLogin, profileController.updateProfile);
userRoute.get('/user-profile/address',userAuth.isLogin, setCartCount,setWishlistData, profileController.renderAddress);
userRoute.get('/user-profile/address/add-address',userAuth.isLogin, setUserData,setCartCount,setWishlistData, profileController.renderAddNewAddress);
userRoute.post('/user-profile/address/add-address',userAuth.isLogin, setUserData,profileController.insertNewAddress);
userRoute.get('/user-profile/address/edit-address',userAuth.isLogin ,setCartCount,setWishlistData, profileController.renderEditAddress);
userRoute.post('/user-profile/address/update-address',userAuth.isLogin, profileController.updateAddress);
userRoute.delete('/user-profile/address/delete-address/:id?',userAuth.isLogin, profileController.deleteAddress);
userRoute.post('/user-profile/change-password',setUserData,userAuth.isLogin, profileController.resetPassword);
userRoute.get('/user-profile/myorders',setUserData, userAuth.isLogin, setCartCount,setWishlistData, profileController.renderMyOrder);
userRoute.get('/user-profile/myorders/orderDetails',setUserData, userAuth.isLogin,setCartCount, setWishlistData, profileController.renderOrderDetails)
userRoute.post('/orders/cancelProduct', userAuth.isLogin,profileController.cancelProduct);
userRoute.post('/orders/cancelOrder', userAuth.isLogin,profileController.cancelOrder);
userRoute.post('/orders/returnProduct',userAuth.isLogin,profileController.returnProduct);
userRoute.post('/orders/returnOrder',userAuth.isLogin,profileController.returnOrder);
userRoute.get('/refferal',userAuth.isLogin, setUserData, setCartCount ,setWishlistData, profileController.renderRefferal);
userRoute.get('/invoice/:orderId', userAuth.isLogin,profileController.generateInvoice);

userRoute.get('/Wallet',userAuth.isLogin,setUserData,setCartCount,setWishlistData, walletController.renderWallet);
userRoute.post('/add-money',userAuth.isLogin,walletController.addMoneyToWallet);




//*************************************Cart management***************************************//
userRoute.get('/cart', userAuth.isLogin, setUserData,setCartCount, setWishlistData, cartController.renderCart);
userRoute.get('/addToCart/:id',userAuth.isLogin, setCartCount, setWishlistData, cartController.addToCart);
userRoute.post('/updateCartItem',userAuth.isLogin,cartController.updateCartItem);
userRoute.get('/check-stock',userAuth.isLogin, setCartCount, setWishlistData, cartController.checkStock);
userRoute.post('/removeCartItem',userAuth.isLogin,cartController.removeCartItem);
userRoute.post('/applyCoupon',userAuth.isLogin,setUserData, cartController.applyCoupon);
userRoute.post('/removeCoupon',userAuth.isLogin,setUserData, cartController.removeCoupon);
userRoute.get('/cart/checkout',userAuth.isLogin,setUserData, setCartCount, setWishlistData, cartController.loadCheckout);
userRoute.get('/cart/checkout/addNewAddress',userAuth.isLogin, setCartCount, setWishlistData, cartController.addNewAddress);
userRoute.post('/cart/checkout/addCheckoutAddress',userAuth.isLogin, cartController.insertCheckoutAddress);
userRoute.delete('/cart/checkout/deleteAddress/:id?', userAuth.isLogin, cartController.removeAddress);
userRoute.post('/placeOrder',userAuth.isLogin, cartController.placeOrder);
userRoute.post('/verifyRazorpayPayment',userAuth.isLogin, cartController.verifyRazorpayPayment);

userRoute.post('/initiatePayment',userAuth.isLogin,profileController.initiatePayment)
userRoute.post('/verifyPayment', userAuth.isLogin,profileController.verifyPayment)

userRoute.get('/orderPlaced',userAuth.isLogin,cartController.renderOrderPlaced);

userRoute.post('/addReview',userAuth.isLogin,profileController.addReview)


//************************** Google authentication ********************************//

userRoute.get('/auth', passport.authenticate('google', { scope: ['email', 'profile'] }));

userRoute.get('/auth/callback', passport.authenticate('google', {
    successRedirect: '/auth/callback/success',
    failureRedirect: '/auth/callback/failure'
}));

userRoute.get('/auth/callback/success', (req, res) => {
    if (req.user) {
        if (req.user.block) {
            console.log('User is blocked');
            req.flash("error","your account is blocked");
            return res.redirect('/login');
        }
        req.session.userId = req.user._id;
        console.log('Login success');
        res.redirect('/');
    } else {
        res.redirect('/login');
    }
});

userRoute.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login', failureFlash: true }), 
  (req, res) => {
      if (req.flash('error').length > 0) {
          return res.redirect('/login');
      }
      req.session.userId = req.user._id;
      res.redirect('/');
  }
);

userRoute.get('/auth/callback/failure', (req, res) => {
   req.flash('error', 'You are not authenticated to log in');
   res.redirect('/login');
});


module.exports = userRoute;