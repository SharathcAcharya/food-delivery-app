const express = require('express');
const router = express.Router();
const Food = require('../models/Food');
const { verifyToken } = require('../middleware/auth');

// Get all reviews for a food item
router.get('/:foodId/reviews', async (req, res) => {
    try {
        const food = await Food.findById(req.params.foodId);
        if (!food) {
            return res.status(404).json({ message: 'Food item not found' });
        }
        res.json(food.ratings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Add a new review (authenticated users only)
router.post('/:foodId/reviews', verifyToken, async (req, res) => {
    try {
        const { rating, review } = req.body;
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'Rating must be between 1 and 5' });
        }

        const food = await Food.findById(req.params.foodId);
        if (!food) {
            return res.status(404).json({ message: 'Food item not found' });
        }

        // Check if user has already reviewed this item
        const existingReview = food.ratings.find(r => r.user.toString() === req.user._id.toString());
        if (existingReview) {
            return res.status(400).json({ message: 'You have already reviewed this item' });
        }

        food.ratings.push({
            user: req.user._id,
            rating,
            review: review || ''
        });

        await food.save();
        res.status(201).json(food.ratings[food.ratings.length - 1]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update a review (authenticated users can only update their own reviews)
router.put('/:foodId/reviews/:reviewId', verifyToken, async (req, res) => {
    try {
        const { rating, review } = req.body;
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'Rating must be between 1 and 5' });
        }

        const food = await Food.findById(req.params.foodId);
        if (!food) {
            return res.status(404).json({ message: 'Food item not found' });
        }

        const reviewToUpdate = food.ratings.id(req.params.reviewId);
        if (!reviewToUpdate) {
            return res.status(404).json({ message: 'Review not found' });
        }

        if (reviewToUpdate.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'You can only update your own reviews' });
        }

        reviewToUpdate.rating = rating;
        reviewToUpdate.review = review || '';

        await food.save();
        res.json(reviewToUpdate);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete a review (authenticated users can only delete their own reviews)
router.delete('/:foodId/reviews/:reviewId', verifyToken, async (req, res) => {
    try {
        const food = await Food.findById(req.params.foodId);
        if (!food) {
            return res.status(404).json({ message: 'Food item not found' });
        }

        const reviewToDelete = food.ratings.id(req.params.reviewId);
        if (!reviewToDelete) {
            return res.status(404).json({ message: 'Review not found' });
        }

        if (reviewToDelete.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'You can only delete your own reviews' });
        }

        food.ratings.pull(req.params.reviewId);
        await food.save();
        res.json({ message: 'Review deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;