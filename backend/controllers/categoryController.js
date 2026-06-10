import Category from "../models/Category.js";

const normalizeSubcategories = (subcategories) => {
  if (!Array.isArray(subcategories)) return [];

  return subcategories
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
};

export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({
      categoryName: 1,
      createdAt: -1,
    });
    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({
      categoryName: 1,
      createdAt: -1,
    });
    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    res.status(200).json({ success: true, data: category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addCategory = async (req, res) => {
  try {
    const { categoryName, subcategories, categoryImage, isActive } = req.body;

    if (!categoryName?.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Category name is required" });
    }

    if (!categoryImage?.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Category image is required" });
    }

    const category = await Category.create({
      categoryName: categoryName.trim(),
      subcategories: normalizeSubcategories(subcategories),
      categoryImage: categoryImage.trim(),
      isActive: isActive ?? true,
    });

    res.status(201).json({ success: true, data: category });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Category name already exists",
      });
    }

    if (error.name === "ValidationError") {
      const message = Object.values(error.errors)
        .map((err) => err.message)
        .join(", ");
      return res.status(400).json({ success: false, message });
    }

    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { categoryName, subcategories, categoryImage, isActive } = req.body;

    const updates = {};

    if (categoryName !== undefined) {
      if (!categoryName?.trim()) {
        return res
          .status(400)
          .json({ success: false, message: "Category name cannot be empty" });
      }
      updates.categoryName = categoryName.trim();
    }

    if (subcategories !== undefined) {
      updates.subcategories = normalizeSubcategories(subcategories);
    }

    if (categoryImage !== undefined) {
      if (!categoryImage?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Category image cannot be empty",
        });
      }
      updates.categoryImage = categoryImage.trim();
    }

    if (isActive !== undefined) {
      updates.isActive = isActive;
    }

    const category = await Category.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    res.status(200).json({ success: true, data: category });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Category name already exists",
      });
    }

    if (error.name === "ValidationError") {
      const message = Object.values(error.errors)
        .map((err) => err.message)
        .join(", ");
      return res.status(400).json({ success: false, message });
    }

    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);

    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    res.status(200).json({ success: true, message: "Category deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
