const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');

// Get user's rewards information
router.get('/info', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .select('rewardPoints membershipTier pointHistory')
            .lean();

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            rewardPoints: user.rewardPoints,
            membershipTier: user.membershipTier,
            pointHistory: user.pointHistory
        });
    } catch (error) {
        console.error('Error fetching rewards info:', error);
        res.status(500).json({ message: error.message });
    }
});

// Redeem points for an order
router.post('/redeem', verifyToken, async (req, res) => {
    try {
        const { points, orderId } = req.body;

        if (!points || !orderId) {
            return res.status(400).json({ message: 'Points and orderId are required' });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        await user.redeemPoints(points, orderId);

        // Send notification
        await user.addNotification(
            `Successfully redeemed ${points} points for order ${orderId}`,
            'system'
        );

        res.json({
            message: 'Points redeemed successfully',
            remainingPoints: user.rewardPoints
        });
    } catch (error) {
        console.error('Error redeeming points:', error);
        res.status(400).json({ message: error.message });
    }
});

// Get membership tier benefits
router.get('/benefits', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .select('membershipTier')
            .lean();

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const benefits = {
            Bronze: {
                pointsMultiplier: 1,
                benefits: ['Basic reward points earning']
            },
            Silver: {
                pointsMultiplier: 1.2,
                benefits: [
                    '20% extra reward points',
                    'Priority customer support'
                ]
            },
            Gold: {
                pointsMultiplier: 1.5,
                benefits: [
                    '50% extra reward points',
                    'Priority customer support',
                    'Free delivery on orders above ₹500'
                ]
            },
            Platinum: {
                pointsMultiplier: 2,
                benefits: [
                    'Double reward points',
                    'Priority customer support',
                    'Free delivery on all orders',
                    'Exclusive early access to promotions'
                ]
            }
        };

        res.json({
            currentTier: user.membershipTier,
            benefits: benefits[user.membershipTier]
        });
    } catch (error) {
        console.error('Error fetching benefits:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;