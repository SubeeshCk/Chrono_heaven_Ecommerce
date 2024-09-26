const express = require ("express");
const userRoute = express();
const passport = require('passport')

userRoute.use(express.json());
userRoute.use(express.urlencoded({ extended: true }));

const userVerificationController = require("../controllers/userControllers/userVerificationController");
const userController = require("../controllers/userControllers/userController");
const profileController = require("../controllers/userControllers/profileController");
const userAuth = require("../middlewares/userAuth");
const { setUserData } = require("../middlewares/setUserData");

userRoute.use('/userAssets', express.static('public/userAssets'));


//view engine
userRoute.set('view engine','ejs');
userRoute.set('views','./views/user');



/******************************* USER SIGNUP,SIGN IN,LOGOUT ,OTP ************************************/
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


userRoute.get('/',setUserData ,userController.renderHome);
userRoute.get('/products',setUserData ,userController.renderProducts);
userRoute.get('/product-details/:id?',setUserData,userController.productDetails);
userRoute.get('/products/womens',setUserData ,userController.renderWomens);
userRoute.get('/products/mens',setUserData ,userController.renderMens);


//********************************User profile management************************************//
userRoute.get('/user-profile',setUserData,profileController.renderProfile);
userRoute.get('/user-profile/edit-profile',setUserData,profileController.renderEditProfile);
userRoute.post('/user-profile/edit-profile', profileController.updateProfile);
userRoute.get('/user-profile/address',profileController.renderAddress);
userRoute.get('/user-profile/address/add-address',setUserData,profileController.renderAddNewAddress);
userRoute.post('/user-profile/address/add-address',setUserData,profileController.insertNewAddress);
userRoute.get('/user-profile/address/edit-address',profileController.renderEditAddress);
userRoute.post('/user-profile/address/update-address',profileController.updateAddress);
userRoute.delete('/user-profile/address/delete-address/:id?',profileController.deleteAddress);


//************************** Google authentication ********************************//

userRoute.get('/auth', passport.authenticate('google', { scope: ['email', 'profile'] }));

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