const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { verifyToken } = require('../middleware/auth');

// Update order location
router.put('/:orderId/location', verifyToken, async (req, res) => {
    try {
        const { latitude, longitude } = req.body;
        
        if (!latitude || !longitude) {
            return res.status(400).json({ message: 'Latitude and longitude are required' });
        }

        const order = await Order.findById(req.params.orderId);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Update current location
        order.currentLocation = {
            latitude,
            longitude,
            updatedAt: new Date()
        };

        await order.save();

        // Broadcast location update to client
        global.broadcastOrderUpdate(
            order._id,
            'location_update',
            order.user.toString(),
            { location: order.currentLocation }
        );

        res.json({ message: 'Location updated successfully' });
    } catch (error) {
        console.error('Error updating location:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get order location
router.get('/:orderId/location', verifyToken, async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Check if user is authorized to view this order
        if (order.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to view this order' });
        }

        res.json({
            location: order.currentLocation,
            status: order.status,
            eta: order.estimatedDeliveryTime
        });
    } catch (error) {
        console.error('Error fetching location:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;