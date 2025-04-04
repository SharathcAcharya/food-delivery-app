const express = require('express');
const router = express.Router();
const { verifyToken } = require('./auth');
const Cart = require('../models/Cart');
const Food = require('../models/Food');

// Get user's cart
router.get('/', verifyToken, async (req, res) => {
    try {
        let cart = await Cart.findOne({ user: req.user._id })
            .populate('items.food');

        if (!cart) {
            cart = new Cart({ user: req.user._id, items: [] });
            await cart.save();
        }

        res.json(cart);
    } catch (error) {
        console.error('Error fetching cart:', error);
        res.status(500).json({ message: 'Error fetching cart' });
    }
});

// Sync cart with database
router.post('/sync', verifyToken, async (req, res) => {
    try {
        const { items } = req.body;

        // Validate items
        if (!Array.isArray(items)) {
            return res.status(400).json({ message: 'Invalid items format' });
        }

        // Verify all food items exist
        const foodIds = items.map(item => item.food);
        const existingFood = await Food.find({ _id: { $in: foodIds } });
        
        if (existingFood.length !== foodIds.length) {
            return res.status(400).json({ message: 'Some food items do not exist' });
        }

        // Update or create cart
        let cart = await Cart.findOne({ user: req.user._id });
        
        if (!cart) {
            cart = new Cart({ user: req.user._id });
        }

        cart.items = items;
        await cart.save();

        // Return updated cart with populated food items
        cart = await Cart.findById(cart._id).populate('items.food');
        
        res.json(cart);
    } catch (error) {
        console.error('Error syncing cart:', error);
        res.status(500).json({ message: 'Error syncing cart' });
    }
});

// Clear cart
router.delete('/', verifyToken, async (req, res) => {
    try {
        await Cart.findOneAndUpdate(
            { user: req.user._id },
            { $set: { items: [] } },
            { new: true }
        );
        res.json({ message: 'Cart cleared successfully' });
    } catch (error) {
        console.error('Error clearing cart:', error);
        res.status(500).json({ message: 'Error clearing cart' });
    }
});

module.exports = router; 