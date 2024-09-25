const API_ROUTES = require("../../config/apiRoutes");
const Category = require("../../models/category");
const Products = require("../../models/product");
const { statusCode } = require("../../config/statusCode");


const fs = require('fs').promises;
const path = require('path');



const renderProduct = async (req, res) => {
  try {
    const products = await Products.find({});
    res.render("products", { products });
  } catch (error) {
    console.log(error.message);
    return res.status(statusCode.INTERNAL_SERVER_ERROR).send({ error: "Internal server error" });
  }
};

const renderAddProducts = async (req, res) => {
  try {
    const categoryData = await Category.find({ is_listed: true });
    return res.render("add-products", { categoryData });
  } catch (error) {
    console.log(error.message);
    return res.status(statusCode.INTERNAL_SERVER_ERROR).send({ error: "Internal server error" });
  }
};

const addProduct = async (req, res) => {
  try {
    const {
      name,
      brand_name,
      price,
      gender,
      movement,
      size,
      dial_shape,
      case_material,
      strap_bracelet,
      water_resistance_capacity,
      brand_warranty,
      quantity,
      description,
      category,
    } = req.body;

    if (!name || !description || quantity < 0 || price < 0) {
      req.flash(
        "error",
        "Invalid entry. Ensure no fields are empty or contain only spaces."
      );
      return res.redirect(API_ROUTES.PRODUCT.ADD);
    }

    const normalizedName = name.toLowerCase();

    const existingProduct = await Products.findOne({
      name: { $regex: new RegExp(`^${normalizedName}$`, "i") },
    });

    if (existingProduct) {
      req.flash("error", "Product already exists.");
      return res.redirect(API_ROUTES.PRODUCT.ADD);
    }

    const validExtensions = ["jpg", "jpeg", "png"];
    let uploadedImages = [];

    if (req.files && req.files.length > 0) {
      for (let file of req.files) {
        const extension = file.filename.split(".").pop().toLowerCase();
        if (!validExtensions.includes(extension)) {
          req.flash("error", "Only image files are allowed for images.");
          return res.redirect(API_ROUTES.PRODUCT.ADD);
        }
        uploadedImages.push(file.filename);
      }
    }

    const newProduct = new Products({
      product_name: normalizedName,
      category,
      brand_name,
      description,
      price,
      quantity,
      gender,
      movement,
      size,
      dial_shape,
      case_material,
      strap_bracelet,
      water_resistance_capacity,
      brand_warranty,
      images: uploadedImages,
    });

    await newProduct.save();
    req.flash("success", "Product added successfully!");
    res.redirect(API_ROUTES.PRODUCT.LIST);
  } catch (error) {
    console.log(error.message);
    req.flash("error", "An error occurred while adding the product.");
    res.redirect(API_ROUTES.PRODUCT.ADD);
  }
};

const renderUpdateProducts = async (req, res) => {
  try {
    const productId = req.params.id;
    const products = await Products.findById(productId).populate("category");

    if (products) {
      const categoryData = await Category.find({ is_listed: true });
      res.render("update-products", { products, categoryData });
    } else {
      req.flash("error", "Product not found");
      res.redirect(API_ROUTES.PRODUCT.LIST);
    }
  } catch (error) {
    console.log(error.message);
    req.flash("error", "An error occurred while fetching the product");
    res.redirect(API_ROUTES.PRODUCT.LIST);
  }
};


const updateProducts = async (req, res) => {
  try {
    console.log("req.body:", req.body);
    const id = req.params.id;
    console.log(id);
    
    let {
      name,
      brand_name,
      price,
      gender,
      movement,
      size,
      dial_shape,
      case_material,
      strap_bracelet,
      water_resistance_capacity,
      brand_warranty,
      quantity,
      description,
      category,
      removedImages
    } = req.body;

    name = name.trim();
    description = description.trim();

    if (!name || !description || quantity < 0 || price < 0) {
      req.flash(
        "error",
        "Invalid entry"
      );
      return res.redirect(API_ROUTES.PRODUCT.LIST);
    }

    const existingProduct = await Products.findById(id);

    if (!existingProduct) {
      req.flash("error", "Product not found");
      return res.redirect(API_ROUTES.PRODUCT.LIST);
    }

    // Update product fields
    existingProduct.name = name;
    existingProduct.category = category;
    existingProduct.brand_name = brand_name;
    existingProduct.description = description;
    existingProduct.price = price;
    existingProduct.quantity = quantity;
    existingProduct.gender = gender;
    existingProduct.movement = movement;
    existingProduct.size = size;
    existingProduct.dial_shape = dial_shape;
    existingProduct.case_material = case_material;
    existingProduct.strap_bracelet = strap_bracelet;
    existingProduct.water_resistance_capacity = water_resistance_capacity;
    existingProduct.brand_warranty = brand_warranty;

    const validExtensions = ["jpg", "jpeg", "png"];
    let updatedImages = [...existingProduct.images];

    if (removedImages) {
      const removedIndexes = Array.isArray(removedImages) 
        ? removedImages.map(Number) 
        : [Number(removedImages)];

      for (let index of removedIndexes) {
        if (index >= 0 && index < updatedImages.length) {
          const imageToRemove = updatedImages[index];
          // Remove the file from the server
          const imagePath = path.join(__dirname, '..', 'public', 'adminAssets', 'uploads', 'product_images', imageToRemove);
          try {
            await fs.unlink(imagePath);
            console.log(`Successfully deleted ${imagePath}`);
          } catch (err) {
            console.error(`Error deleting file ${imagePath}:`, err);
          }
        }
      }

      // Filter out the removed images
      updatedImages = updatedImages.filter((_, index) => !removedIndexes.includes(index));
    }

    // Add new images
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => {
        const extension = file.filename.split(".").pop().toLowerCase();
        if (!validExtensions.includes(extension)) {
          throw new Error("Only image files are allowed for images.");
        }
        return file.filename;
      });

      // Ensure total images don't exceed 4
      if (updatedImages.length + newImages.length > 4) {
        req.flash("error", "Maximum of 4 images allowed.");
        return res.redirect(API_ROUTES.PRODUCT.LIST);
      }

      updatedImages = [...updatedImages, ...newImages];
    }

    existingProduct.images = updatedImages;

    await existingProduct.save();

    req.flash("success", "Product updated successfully");
    return res.redirect(API_ROUTES.PRODUCT.LIST);
  } catch (error) {
    console.log("Error in updating the product",error.message);
    req.flash("error", error.message || "An error occurred while updating the product");
    return res.redirect(API_ROUTES.PRODUCT.LIST);
  }
};

const unlistProduct = async (req, res) => {
  try {
    const id = req.params.id;

    if (!id) {
      req.flash("error", "invalid data");
      return res.redirect(API_ROUTES.PRODUCT.LIST);
    }
    const updatedProduct = await Products.findByIdAndUpdate(
      id,
      { is_listed: false },
      { new: true }
    );

    if (!updatedProduct) {
      req.flash("error", "Failed unlisting product");
      return res.redirect(API_ROUTES.PRODUCT.LIST);
    }

    req.flash("success", "Product unlisted successfully");
    res.redirect(API_ROUTES.PRODUCT.LIST);
  } catch (error) {
    console.log(error.message);
    return res.status(statusCode.INTERNAL_SERVER_ERROR).send({ error: "Internal server error" });
  }
};

const listProduct = async (req, res) => {
  try {
    const id = req.params.id;

    if (!id) {
      req.flash("error", "invalid data");
      return res.redirect(API_ROUTES.PRODUCT.LIST);
    }
    const updatedProduct = await Products.findByIdAndUpdate(
      id,
      { is_listed: true },
      { new: true }
    );

    if (!updatedProduct) {
      req.flash("error", "Failed listing product");
      return res.redirect(API_ROUTES.PRODUCT.LIST);
    }

    req.flash("success", "Product listed successfully");
    res.redirect(API_ROUTES.PRODUCT.LIST);
  } catch (error) {
    console.log(error.message);
    return res.status(statusCode.INTERNAL_SERVER_ERROR).send({ error: "Internal server error" });
  }
};

module.exports = {
  renderProduct,
  renderAddProducts,
  addProduct,
  renderUpdateProducts,
  updateProducts,
  unlistProduct,
  listProduct,
};
