const User = require("../../models/userModel");
const product = require("../../models/product");
const { statusCode } = require("../../config/statusCode");
const Address = require("../../models/userAddress");

const renderProfile = (req, res) => {
  try {
    const userData = res.locals.userData;

    if (!userData) {
      return res.redirect("/login");
    }
    res.render("user-profile");
  } catch (error) {
    console.log(error.message);
    res.status(statusCode.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
  }
};

const renderEditProfile = async (req, res) => {
  try {
    const userData = res.locals.userData;

    if (!userData) {
      console.log("User not found");
      return res.status(statusCode.NOT_FOUND).send("User not found");
    }
    res.render("edit-profile");
  } catch (error) {
    console.log(error.message);
    res.status(statusCode.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.session.userId;
    let { name = "", mobile = "" } = req.body;

    name = name.trim();

    mobile = mobile.trim();

    if (name === "" || mobile === "") {
      req.flash("error", "All fields are required");
      return res.redirect("/user-profile/edit-profile");
    }

    const nameRegex = /^[a-zA-Z ]+$/;
    if (!nameRegex.test(name)) {
      req.flash("error", "Please enter a valid name ");
      return res.redirect("/user-profile/edit-profile");
    }

    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(mobile)) {
      req.flash("error", "Please enter a valid number");
      return res.redirect("/user-profile/edit-profile");
    }

    const updatedProfile = await User.findByIdAndUpdate(
      userId,
      { name, mobile },
      { new: true }
    );

    if (updatedProfile) {
      req.flash("success", "Profile updated successfully");
      res.redirect("/user-profile");
    } else {
      req.flash("error", "Failed to update profile");
    }
  } catch (error) {
    console.log(error.message);
    res.status(statusCode.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
  }
};

const renderAddress = async (req, res) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.redirect("/login");
    }

    const user = await User.findById(userId);

    if (!user) {
      console.log("User not found");
      return res.status(statusCode.NOT_FOUND).send("User not found");
    }

    const addresses = await Address.find({ userId });

    res.render("address", { userData: user, addresses });
  } catch (error) {
    console.log(error.message);
    res.status(statusCode.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
  }
};

const renderAddNewAddress = async (req, res) => {
  try {
    res.render("add-address");
  } catch (error) {
    console.log(error.message);
    res.status(statusCode.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
  }
};

const insertNewAddress = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { pincode, locality, address, city, state, addresstype } = req.body;
    const trimmedPincode = pincode.trim();
    const trimmedLocality = locality.trim();
    const trimmedAddress = address.trim();
    const trimmedCity = city.trim();
    const trimmedState = state.trim();

    if (!userId) {
      req.flash("error", "You must be logged in to perform this action");
      return res.redirect("/login");
    }
    if (
      !trimmedPincode ||
      !trimmedLocality ||
      !trimmedAddress ||
      !trimmedCity ||
      !trimmedState
    ) {
      req.flash("error", "All fields are required");
      return res.redirect("/user-profile/address/add-addres");
    }

    let numRegex = /^\d+$/;
    const pincodeRegex = /^\d{6}$/;
    if (!pincodeRegex.test(trimmedPincode)) {
      req.flash("error", "Enter a valid pincode");
      return res.redirect("/user-profile/address/add-addres");
    }

    const allFieldsAreSpaces = Object.values(req.body).every(
      (value) => value.trim() === ""
    );
    if (allFieldsAreSpaces) {
      req.flash("error", "All fields cannot be empty or contain only spaces");
      return res.redirect("/user-profile/address/add-addres");
    }
    if (
      numRegex.test(
        trimmedLocality || trimmedAddress || trimmedCity || trimmedCity
      )
    ) {
      req.flash("error", "Enter a valid address");
      return res.redirect("/user-profile/address/add-addres");
    }

    const newAddress = new Address({
      userId,
      pincode,
      locality,
      address,
      city,
      state,
      addresstype,
    });

    const userAddress = await newAddress.save();

    if (userAddress) {
      req.session.useraddress = userAddress;
      req.flash("success", "Address added successfully");
      res.redirect("/user-profile/address");
    } else {
      req.flash("error", "Failed adding new address");
      res.redirect("/user-profile/address");
    }
  } catch (error) {
    console.log(error.message);
    res.status(statusCode.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
  }
};

const renderEditAddress = async (req, res) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.redirect("/login");
    }
    const addressId = req.query.id;

    const address = await Address.findById(addressId);
    console.log(address);

    if (!address || address.userId !== userId) {
      return res.status(statusCode.NOT_FOUND).send("Address not found");
    }

    res.render("edit-address", { userData: [address] });
  } catch (error) {
    console.error("Error rendering edit address:", error);
    res.status(statusCode.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
  }
};

const updateAddress = async (req, res) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      req.flash("error", "You must be logged in to perform this action");
      return res.redirect("/login");
    }

    const addressId = req.body.addressId;
    const { pincode, locality, address, city, state, addresstype } = req.body;

    const pincodeRegex = /^\d+$/;
    if (!pincodeRegex.test(pincode)) {
      req.flash("error", "Pincode must contain only numbers");
      return res.redirect("/user-profile/address/edit-address");
    }
    const existingAddress = await Address.findOne({ _id: addressId, userId });

    if (!existingAddress) {
      req.flash("error", "Address not found or does not belong to the user");
      return res
        .status(statusCode.NOT_FOUND)
        .send("Address not found or does not belong to the user");
    }

    const updatedAddress = await Address.findByIdAndUpdate(
      addressId,
      { pincode, locality, address, city, state, addresstype },
      { new: true }
    );

    if (updatedAddress) {
      req.flash("success", "Address updated successfully");
      return res.redirect("/user-profile/address");
    } else {
      req.flash("error", "Failed to update address");
      return res.status(statusCode.INTERNAL_SERVER_ERROR).send("Failed to update address");
    }
  } catch (error) {
    console.log(error.message);
    req.flash("error", "Internal server error");
    return res.redirect("/user-profile/address/edit-address");
  }
};

const deleteAddress = async (req, res) => {
  try {
    const userId = req.session.userId;
    const addressId = req.params.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const address = await Address.findOne({ _id: addressId, userId });

    if (!address) {
      console.log("Address not found or does not belong to the user");
      return res
        .status(statusCode.NOT_FOUND)
        .json({ error: "Address not found or does not belong to the user" });
    }

    await Address.findByIdAndDelete(addressId);

    res.status(200).json({ message: "Address deleted successfully" });
  } catch (error) {
    console.log(error.message);
    res.status(statusCode.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
  }
};

module.exports = {
  renderProfile,
  renderEditProfile,
  updateProfile,
  renderAddress,
  renderAddNewAddress,
  insertNewAddress,
  renderEditAddress,
  updateAddress,
  deleteAddress,
};
