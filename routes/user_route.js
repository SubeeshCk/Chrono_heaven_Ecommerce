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
userRoute.get('/signUp',userAuth.is_logout,userVerificationController.renderSignUp);
userRoute.post('/signUp',userAuth.is_logout, userVerificationController.insertUser);
userRoute.get('/login',userAuth.is_logout,userVerificationController.renderLogin);
userRoute.post('/login',userAuth.is_logout, userVerificationController.verifyLogin);
userRoute.get('/otp',userAuth.is_logout,userVerificationController.renderOtp);
userRoute.post('/verifyOTP',userAuth.is_logout ,userVerificationController.verifyOtp);
userRoute.get('/resendOtp',userAuth.is_logout ,userVerificationController.resendOtp);
userRoute.get('/forgot-password',userAuth.is_logout,userVerificationController.renderForgotPassword);
userRoute.post('/findAccount',userAuth.is_logout,userVerificationController.findAccount);
userRoute.get("/reset-otp",userAuth.is_logout,userVerificationController.renderResetOtp);
userRoute.post('/verifyResetOtp',userAuth.is_logout,userVerificationController.verifyResetOtp);
userRoute.get('/reset-password',userAuth.is_logout,userVerificationController.renderResetPassword);
userRoute.post("/reset-password",userAuth.is_logout,userVerificationController.updatePassword);
userRoute.get('/resendResetOtp',userAuth.is_logout,userVerificationController.resendResetOtp);
userRoute.get('/logOut',userAuth.is_login,userVerificationController.logOut);


//************************* HOME,SHOP,PRODUCT_DETAILS,WOMEN,MEN******************************//
userRoute.get('/',setUserData ,setCartCount,setWishlistData, userController.renderHome);
userRoute.get('/products',setUserData ,setCartCount,setWishlistData, userController.renderProducts);
userRoute.get('/product-details/:id?',setUserData, setCartCount, setWishlistData, userController.productDetails);
userRoute.get('/products/womens',setUserData ,setCartCount,setWishlistData, userController.renderWomens);
userRoute.get('/products/mens',setUserData ,setCartCount,setWishlistData,  userController.renderMens);
userRoute.get('/sort-products',setUserData ,setCartCount, userController.sortProducts);
userRoute.get('/wishlist',userAuth.is_login,setUserData ,setCartCount,setWishlistData, userController.renderWishlist)
userRoute.get('/addToWishlist',userAuth.is_login,setUserData, userController.addToWishlist)
userRoute.get('/RemoveFromWishlist',userAuth.is_login,setUserData, userController.RemoveFromWishlist)



//********************************User profile management************************************//
userRoute.get('/user-profile',userAuth.is_login ,setUserData ,setCartCount ,setWishlistData, profileController.renderProfile);
userRoute.get('/user-profile/edit-profile',userAuth.is_login ,setUserData ,setCartCount,setWishlistData, profileController.renderEditProfile);
userRoute.post('/user-profile/edit-profile',userAuth.is_login, profileController.updateProfile);
userRoute.get('/user-profile/address',userAuth.is_login, setCartCount,setWishlistData, profileController.renderAddress);
userRoute.get('/user-profile/address/add-address',userAuth.is_login, setUserData,setCartCount,setWishlistData, profileController.renderAddNewAddress);
userRoute.post('/user-profile/address/add-address',userAuth.is_login, setUserData,profileController.insertNewAddress);
userRoute.get('/user-profile/address/edit-address',userAuth.is_login ,setCartCount,setWishlistData, profileController.renderEditAddress);
userRoute.post('/user-profile/address/update-address',userAuth.is_login, profileController.updateAddress);
userRoute.delete('/user-profile/address/delete-address/:id?',userAuth.is_login, profileController.deleteAddress);
userRoute.post('/user-profile/change-password',setUserData,userAuth.is_login, profileController.resetPassword);
userRoute.get('/user-profile/myorders',setUserData, userAuth.is_login, setCartCount,setWishlistData, profileController.renderMyOrder);
userRoute.get('/user-profile/myorders/orderDetails',setUserData, userAuth.is_login,setCartCount, setWishlistData, profileController.renderOrderDetails)
userRoute.post('/cancelOrder', userAuth.is_login,profileController.cancelOrder);
userRoute.post('/returnOrder',userAuth.is_login,profileController.returnOrderRequest);
userRoute.get('/refferal',userAuth.is_login, setUserData, setCartCount ,setWishlistData, profileController.renderRefferal);


userRoute.get('/Wallet',userAuth.is_login,setCartCount,setWishlistData, walletController.renderWallet);
userRoute.post('/add-money',userAuth.is_login,walletController.addMoneyToWallet);




//*************************************Cart management***************************************//
userRoute.get('/cart', userAuth.is_login, setUserData,setCartCount, setWishlistData, cartController.renderCart);
userRoute.get('/addToCart/:id',userAuth.is_login, setCartCount, setWishlistData, cartController.addToCart);
userRoute.post('/updateCartItem',userAuth.is_login,cartController.updateCartItem);
userRoute.get('/check-stock',userAuth.is_login, setCartCount, setWishlistData, cartController.checkStock);
userRoute.post('/removeCartItem',userAuth.is_login,cartController.removeCartItem);
userRoute.post('/applyCoupon',userAuth.is_login,setUserData, cartController.applyCoupon);
userRoute.post('/removeCoupon',userAuth.is_login,setUserData, cartController.removeCoupon);
userRoute.get('/cart/checkout',userAuth.is_login,setUserData, setCartCount, setWishlistData, cartController.loadCheckout);
userRoute.get('/cart/checkout/addNewAddress',userAuth.is_login, setCartCount, setWishlistData, cartController.addNewAddress);
userRoute.post('/cart/checkout/addCheckoutAddress',userAuth.is_login, cartController.insertCheckoutAddress);
userRoute.delete('/cart/checkout/deleteAddress/:id?', userAuth.is_login, cartController.removeAddress);
userRoute.post('/placeOrder',userAuth.is_login, cartController.placeOrder);
userRoute.post('/verifyRazorpayPayment',userAuth.is_login, cartController.verifyRazorpayPayment);

userRoute.get('/orderPlaced',userAuth.is_login,cartController.renderOrderPlaced);



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