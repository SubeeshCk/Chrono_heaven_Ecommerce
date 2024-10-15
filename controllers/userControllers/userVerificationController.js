const User = require("../../models/userModel");
const nodeMailer = require("nodemailer");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { error } = require("console");
const Wallet = require("../../models/walletModel");

//for genarate an otp
function generateOTP() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

//For generating a refferal code
function generateReferralCode(length = 8) {
  return crypto
    .randomBytes(Math.ceil(length / 2))
    .toString("hex")
    .slice(0, length);
}

//For bcrypting the password
const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (error) {
    next(error);
  }
};

//send email for password reset
const sendPassResetMail = async (name, email, otp) => {
  try {
    const transporter = nodeMailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      requireTLS: true,
      auth: {
        user: process.env.NODE_USER,
        pass: process.env.NODE_PASSWORD,
      },
    });
    const mailOptions = {
      from: process.env.NODE_USER,
      to: email,
      subject: "Reset Password OTP",
      html: `
            <p>Dear ${name},</p>
            <p>We received a request to reset the password for CHRONO HEAVEN.</p>
            <p>To proceed with resetting your password, please use the following One-Time Password (OTP):</p>
            <h2>OTP: ${otp}</h2>
            <p>Please enter this code within 1 minute. If you didn't request this OTP, kindly disregard this email.</p>
            <p>Need help? Reach out to us at ChronoHeaven@gmail.com or call us at 100000234.</p>
            <p>Best regards,<br>CHRONO HEAVEN</p>
            `,
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
      } else {
        console.log(`Generated otp : ${otp}`);
      }
    });
  } catch (error) {
    return next(error);
  }
};

//For sending mail to the verification
const sendVerifyMail = async (name, email, otp) => {
  try {
    const transporter = nodeMailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      requireTLS: true,
      auth: {
        user: process.env.NODE_USER,
        pass: process.env.NODE_PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.NODE_USER,
      to: email,
      subject: "Your CHRONO HEAVEN Account Verification OTP",
      html: `
            <p>Dear ${name},</p>
            <p>Welcome to CHRONO HEAVEN, The heaven of luxury watches!</p>
            <p>To complete your registration and ensure the security of your account, please use the following One-Time Password (OTP):</p>
            <h2>OTP: ${otp}</h2>
            <p>Please enter this code within 1 minute. If you didn't request this OTP, kindly disregard this email.</p>
            <p>Need help? Reach out to us at ChronoHeaven@gmail.com or call us at 100000234.</p>
            <p>Best regards,<br>CHRONO HEAVEN</p>
            `,
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
      } else {
        console.log(`Generated otp : ${otp}`);
      }
    });
  } catch (error) {
    return next(error);
  }
};

const renderSignUp = async (req, res) => {
  try {
    res.render("signUp");
  } catch (error) {
    return next(error);
  }
};

const insertUser = async (req, res) => {
  try {
    const { name, email, mobile, password, cpassword, referred_code } =
      req.body;

    const existingUserData = await User.findOne({
      $or: [{ email: email }, { mobile: mobile }],
    });
    if (existingUserData) {
      req.flash("error", "Email address or mobile number already exists");
      return res.redirect("/signUp");
    }

    if (!/^[a-zA-Z ]+$/.test(name)) {
      req.flash("error", "Please enter a valid name");
      return res.redirect("/signUp");
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    if (!emailRegex.test(email)) {
      req.flash(
        "error",
        "Please enter a valid email address ending with @gmail.com"
      );
      return res.redirect("/signUp");
    }

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      req.flash(
        "error",
        "Please enter a valid 10-digit mobile number starting with 6-9"
      );
      return res.redirect("/signUp");
    }

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      req.flash(
        "error",
        "Password must contain at least 8 characters, including at least one uppercase letter, one lowercase letter, one number, and one special character."
      );
      return res.redirect("/signUp");
    }

    if (password !== cpassword) {
      req.flash("error", "Passwords do not match");
      return res.redirect("/signUp");
    }

    const hashedPassword = await securePassword(password);
    const newReferralCode = generateReferralCode();

    let referredUser = null;
    if (referred_code) {
      referredUser = await User.findOne({ referral_code: referred_code });
      if (!referredUser) {
        req.flash("error", "Invalid referral code");
        return res.redirect("/signUp");
      }
      if (referredUser.referral_bonus_given) {
        req.flash("error", "Referral code has already been used");
        return res.redirect("/signUp");
      }
    }

    const tempUserData = {
      name,
      email,
      mobile,
      password: hashedPassword,
      is_verified: false,
      is_admin: 0,
      referral_code: newReferralCode,
      referred_code: referred_code || null,
      referral_bonus_given: false,
    };

    const otp = generateOTP();

    await sendVerifyMail(name, email, otp);

    req.session.tempUser = {
      userData: { ...tempUserData, password: hashedPassword },
      email: email,
      otp: otp,
      referredUserId: referredUser ? referredUser._id : null,
    };

    req.session.otpExpiration = Date.now() + 1 * 60 * 1000;
    req.flash("success", "Your verification mail send successfully");
    res.redirect("/otp");
  } catch (error) {
    console.error("Error in insertUser:", error.message);
    req.flash("error", "An unexpected error occurred. Please try again.");
    res.redirect("/signUp");
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;

    // Ensure tempUser is present in session
    const tempUser = req.session.tempUser;
    if (!tempUser || !tempUser.userData || !tempUser.otp) {
      req.flash("error", "Session expired. Please sign up again.");
      return res.redirect("/signUp");
    }

    const storedOtp = tempUser.otp;
    const otpExpiration = req.session.otpExpiration;

    // Check OTP expiration
    if (Date.now() > otpExpiration) {
      delete req.session.tempUser;
      delete req.session.otpExpiration;
      req.flash("error", "OTP has expired. Please sign up again.");
      return res.redirect("/signUp");
    }

    // Validate OTP
    if (otp !== storedOtp) {
      console.log(
        `Invalid OTP: Entered OTP ${otp} does not match stored OTP ${storedOtp}`
      );
      req.flash("error", "Invalid OTP");
      return res.redirect("/otp");
    }

    // Create and save user
    const user = new User({
      ...tempUser.userData,
      is_verified: true,
    });

    const userData = await user.save();

    const wallet = new Wallet({
      userId: userData._id,
      balance: 0,
      transactions: [],
    });
    await wallet.save();

    if (tempUser.referredUserId) {
      const referredUser = await User.findById(tempUser.referredUserId);
      if (referredUser) {
        let referredUserWallet = await Wallet.findOne({
          userId: referredUser._id,
        });
        if (!referredUserWallet) {
          referredUserWallet = new Wallet({
            userId: referredUser._id,
            balance: 0,
            transactions: [],
          });
        }
        referredUserWallet.balance += 100;
        referredUserWallet.transactions.push({
          amount: 100,
          transactionMethod: "Referral",
          date: new Date(),
          description: "Referral Bonus for referring " + userData.name,
        });
        await referredUserWallet.save();

        wallet.balance += 100;
        wallet.transactions.push({
          amount: 100,
          transactionMethod: "Referral",
          date: new Date(),
          description: "Referral Bonus for joining via " + referredUser.name,
        });
        await wallet.save();

        referredUser.referral_bonus_given = true;
        await referredUser.save();
      }
    }

    // Clear session and redirect
    delete req.session.tempUser;
    delete req.session.otpExpiration;

    req.flash(
      "success",
      "Email verified successfully! Login to enjoy shopping"
    );
    res.redirect("/login");
  } catch (error) {
    console.log(error.message);
    req.flash("error", "An unexpected error occurred. Please try again.");
    res.redirect("/signUp");
  }
};

const renderOtp = async (req, res) => {
  try {
    res.render("otp");
  } catch (error) {
    return next(error);
  }
};

const resendOtp = async (req, res) => {
  try {
    const tempUser = req.session.tempUser;

    if (!tempUser || !tempUser.userData || !tempUser.email) {
      req.flash("error", "Session expired. Please sign up again.");
      return res.redirect("/signUp");
    }

    const newOtp = generateOTP();

    await sendVerifyMail(tempUser.userData.name, tempUser.email, newOtp);

    req.session.tempUser.otp = newOtp;

    req.session.otpExpiration = Date.now() + 1 * 60 * 1000;

    const otpDoc = new Otp({
      email: tempUser.email,
      otp: newOtp,
    });
    await otpDoc.save();

    req.flash("success", "New OTP has been sent to your email");
    res.redirect("/otp");
  } catch (error) {
    console.log("Error in resendOtp:", error.message);
    req.flash("error", "Failed to resend OTP. Please try again.");
    res.redirect("/otp");
  }
};

const renderLogin = async (req, res) => {
  try {
    res.render("login");
  } catch (error) {
    return next(error);
  }
};

const verifyLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const userData = await User.findOne({ email: email });
    if (!userData) {
      req.flash("error", "Email or password is incorrect");
      return res.redirect("/login");
    }
    if (userData.block) {
      req.flash("error", "You are not authenticated to log in");
      return res.redirect("/login");
    }
    if (userData) {
      const passwordMatch = await bcrypt.compare(password, userData.password);
      if (passwordMatch) {
        if (!userData.is_verified) {
          const otp = generateOTP();

          await sendVerifyMail(userData.name, email, otp);

          storedOTP = otp;

          req.session.tempUser = {
            userId: userData._id,
            email: userData.email,
            name: userData.name,
            otp: otp,
          };

          const otpDoc = {
            userId: userData._id,
            email: userData.email,
            name: userData.name,
            otp: otp,
          };

          req.flash(
            "error",
            "Email is not verified. We have sent a new OTP to your email."
          );
          res.redirect("/otp");
        } else {
          req.session.userId = userData._id;
          res.redirect("/");
        }
      } else {
        req.flash("error", "Email or password is incorrect");
        res.redirect("/login");
      }
    } else {
      req.flash("error", "Email or password is incorrect");
      res.redirect("/login");
    }
  } catch (error) {
    return next(error);
  }
};

const renderForgotPassword = async (req, res) => {
  try {
    res.render("forgot-password");
  } catch (error) {
    return next(error);
  }
};

const findAccount = async (req, res) => {
  try {
    const { email } = req.body;
    const userData = await User.findOne({ email: email });

    if (!userData) {
      req.flash("error", "User not found");
      return res.redirect("/forgot-Password");
    }

    const otp = generateOTP();
    await sendPassResetMail(userData.name, email, otp);

    req.session.tempUser = {
      userData: userData,
      email: email,
      otp: otp,
    };

    req.session.otpExpiration = Date.now() + 1 * 60 * 1000; // 1 minute expiration
    res.redirect("/reset-otp");
  } catch (error) {
    console.log(error.message);
    req.flash("error", "An unexpected error occurred");
    res.redirect("/forgot-Password");
  }
};

const resendResetOtp = async (req, res) => {
  try {
    if (!req.session.tempUser) {
      req.flash("error", "Session expired. Please start over.");
      return res.redirect("/forgot-Password");
    }

    const { userData, email } = req.session.tempUser;
    const newOTP = generateOTP();
    await sendPassResetMail(userData.name, email, newOTP);

    req.session.tempUser.otp = newOTP;
    req.session.otpExpiration = Date.now() + 1 * 60 * 1000; // Reset expiration

    req.flash("success", "OTP has been resent successfully");
    res.redirect("/reset-otp");
  } catch (error) {
    console.log(error.message);
    req.flash("error", "Failed to resend OTP");
    res.redirect("/forgot-Password");
  }
};

const renderResetOtp = async (req, res) => {
  try {
    if (!req.session.tempUser) {
      req.flash("error", "Session expired. Please start over.");
      return res.redirect("/forgot-Password");
    }
    res.render("reset-otp");
  } catch (error) {
    console.log(error.message);
    res.redirect("/forgot-Password");
  }
};

const verifyResetOtp = async (req, res) => {
  try {
    const { otp } = req.body;

    if (!req.session.tempUser || !req.session.otpExpiration) {
      req.flash("error", "Session expired. Please request a new OTP.");
      return res.redirect("/forgot-password");
    }

    if (Date.now() > req.session.otpExpiration) {
      delete req.session.tempUser;
      delete req.session.otpExpiration;
      req.flash("error", "OTP has expired. Please request a new one.");
      return res.redirect("/forgot-password");
    }

    if (otp !== req.session.tempUser.otp) {
      req.flash("error", "Invalid OTP");
      return res.redirect("/reset-otp");
    }

    req.session.userForReset = req.session.tempUser.userData;
    delete req.session.tempUser;
    delete req.session.otpExpiration;

    res.redirect("/reset-password");
  } catch (error) {
    console.error("Error in verifyResetOtp:", error.message);
    req.flash("error", "An unexpected error occurred. Please try again.");
    res.redirect("/forgot-password");
  }
};

const renderResetPassword = async (req, res) => {
  try {
    if (!req.session.userForReset) {
      req.flash("error", "Session expired. Please request a new OTP.");
      return res.redirect("/forgot-password");
    }
    res.render("reset-password");
  } catch (error) {
    return next(error);
  }
};

const updatePassword = async (req, res) => {
  try {
    const { newPassword, confirmPassword } = req.body;
    const userForReset = req.session.userForReset;

    if (!userForReset) {
      req.flash("error", "Session expired. Please request a new OTP.");
      return res.redirect("/forgot-password");
    }

    if (newPassword !== confirmPassword) {
      req.flash("error", "Passwords do not match");
      return res.redirect("/reset-password");
    }

    const hashedPassword = await securePassword(newPassword);
    const updateResult = await User.findOneAndUpdate(
      { email: userForReset.email },
      { $set: { password: hashedPassword } },
      { new: true }
    );

    if (!updateResult) {
      req.flash("error", "An error occurred while changing the password");
      return res.redirect("/forgot-password");
    }

    delete req.session.userForReset;

    req.flash("success", "Password changed successfully. Login to continue.");
    return res.redirect("/login");
  } catch (error) {
    console.error("Error in updatePassword:", error.message);
    req.flash("error", "An unexpected error occurred. Please try again.");
    return res.redirect("/reset-password");
  }
};

const logOut = async (req, res) => {
  try {
    req.session.destroy();
    res.redirect("/");
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  renderSignUp,
  insertUser,
  renderLogin,
  renderOtp,
  verifyOtp,
  resendOtp,
  verifyLogin,
  renderForgotPassword,
  findAccount,
  renderResetOtp,
  verifyResetOtp,
  renderResetPassword,
  resendResetOtp,
  updatePassword,
  logOut,
};
