const User = require("../models/userModel");

const setUserData = async (req, res, next) => {
  try {
    const userId = req.session.userId || (req.user && req.user._id);

    if (userId) {
      const user = await User.findById(userId);
      res.locals.userData = user || null;
    } else {
      res.locals.userData = null;
    }
  } catch (error) {
    console.log(error.message);
    res.locals.userData = null;
  }
  next();
};

module.exports = { setUserData };
