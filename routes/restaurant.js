const express = require('express');
const router = express.Router();
const Restaurant = require('../models/Restaurant');
const auth = require('../middleware/auth');
const { isAdmin, isRestaurantOwner } = require('../middleware/auth');
const imageUpload = require('../middleware/imageUpload');
const { cacheUtils } = require('../config/redis');

// Get all restaurants (public)
router.get('/', async (req, res) => {
    try {
        // Try to get from cache first
        const cachedRestaurants = await cacheUtils.get('all_restaurants');
        if (cachedRestaurants) {
            return res.json(cachedRestaurants);
        }

        // If not in cache, get from database
        const restaurants = await Restaurant.find({ isActive: true })
            .select('-metrics -businessHours -contactInfo.email');
        
        // Cache the results
        await cacheUtils.set('all_restaurants', restaurants, 300); // Cache for 5 minutes
        res.json(restaurants);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get restaurant details (public)
router.get('/:id', async (req, res) => {
    try {
        // Try to get from cache first
        const cachedRestaurant = await cacheUtils.get(`restaurant:${req.params.id}`);
        if (cachedRestaurant) {
            return res.json(cachedRestaurant);
        }

        // If not in cache, get from database
        const restaurant = await Restaurant.findById(req.params.id)
            .select('-metrics -businessHours -contactInfo.email');
        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }

        // Cache the results
        await cacheUtils.set(`restaurant:${req.params.id}`, restaurant, 300); // Cache for 5 minutes
        res.json(restaurant);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create new restaurant (admin only)
router.post('/', [auth, isAdmin, imageUpload.array('images', 5)], async (req, res) => {
    try {
        const restaurantData = {
            ...req.body,
            images: req.files ? req.files.map(file => file.path) : []
        };
        const restaurant = new Restaurant(restaurantData);
        await restaurant.save();
        // Clear the all_restaurants cache when a new restaurant is added
        await cacheUtils.del('all_restaurants');
        res.status(201).json(restaurant);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update restaurant (admin or owner)
router.put('/:id', [auth, imageUpload.array('images', 5)], async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.params.id);
        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }

        // Check if user is admin or restaurant owner
        if (!req.user.isAdmin && restaurant.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const updateData = { ...req.body };
        if (req.files && req.files.length > 0) {
            updateData.images = req.files.map(file => file.path);
        }

        const updatedRestaurant = await Restaurant.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        // Clear both the specific restaurant cache and all_restaurants cache
        await Promise.all([
            cacheUtils.del(`restaurant:${req.params.id}`),
            cacheUtils.del('all_restaurants')
        ]);
        res.json(updatedRestaurant);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Get restaurant analytics (owner or admin)
router.get('/:id/analytics', [auth], async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.params.id)
            .populate('metrics.popularItems.foodId', 'name price');

        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }

        // Check if user is admin or restaurant owner
        if (!req.user.isAdmin && restaurant.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Return analytics data
        res.json({
            metrics: restaurant.metrics,
            rating: restaurant.rating,
            totalRatings: restaurant.totalRatings
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get restaurant orders (owner or admin)
router.get('/:id/orders', [auth], async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.params.id);
        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }

        // Check if user is admin or restaurant owner
        if (!req.user.isAdmin && restaurant.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const { status, startDate, endDate } = req.query;
        const query = { restaurant: req.params.id };

        if (status) query.status = status;
        if (startDate && endDate) {
            query.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const orders = await Order.find(query)
            .populate('user', 'name phone')
            .populate('items.food', 'name price')
            .sort('-createdAt');

        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;