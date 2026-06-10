import Cart from "../models/Cart.js";
import Product from "../models/Product.js";

const populateCart = (query) =>
  query.populate({
    path: "items.product",
    select:
      "name brandName price discountedPrice discountedPercent productImages stock subcategory",
  });

export const getCart = async (req, res) => {
  try {
    let cart = await populateCart(Cart.findOne({ user: req.user._id }));

    if (!cart) {
      return res.status(200).json({
        success: true,
        data: {
          user: req.user._id,
          email: req.user.email,
          items: [],
        },
      });
    }

    res.status(200).json({ success: true, data: cart });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addToCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    if (quantity === undefined || quantity === null || quantity === "") {
      return res.status(400).json({
        success: false,
        message: "Quantity is required",
      });
    }

    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty < 1) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be at least 1",
      });
    }

    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    let cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      cart = await Cart.create({
        user: req.user._id,
        email: req.user.email,
        items: [{ product: productId, quantity: qty }],
      });
    } else {
      cart.email = req.user.email;
      const existingIndex = cart.items.findIndex(
        (item) => item.product.toString() === productId
      );

      if (existingIndex >= 0) {
        cart.items[existingIndex].quantity += qty;
      } else {
        cart.items.push({ product: productId, quantity: qty });
      }

      await cart.save();
    }

    cart = await populateCart(Cart.findById(cart._id));

    res.status(200).json({
      success: true,
      message: "Product added to cart",
      data: cart,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params;

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    cart.items = cart.items.filter(
      (item) => item.product.toString() !== productId
    );
    await cart.save();

    const updated = await populateCart(Cart.findById(cart._id));

    res.status(200).json({
      success: true,
      message: "Product removed from cart",
      data: updated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateCartItem = async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    const qty = Number(quantity);
    if (!Number.isFinite(qty)) {
      return res.status(400).json({
        success: false,
        message: "Valid quantity is required",
      });
    }

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId
    );

    if (itemIndex < 0) {
      return res.status(404).json({
        success: false,
        message: "Product not in cart",
      });
    }

    if (qty < 1) {
      cart.items.splice(itemIndex, 1);
    } else {
      cart.items[itemIndex].quantity = qty;
    }

    await cart.save();

    const updated = await populateCart(Cart.findById(cart._id));

    res.status(200).json({
      success: true,
      message: "Cart updated",
      data: updated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
