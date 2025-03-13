const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Food = require('../models/Food');
const { verifyToken, verifyAdmin } = require('./auth');

// Configure multer for image upload
const storage = multer.diskStorage({
	destination: './public/uploads/',
	filename: (req, file, cb) => {
		cb(null, `${Date.now()}-${file.originalname}`);
	}
});

const upload = multer({
	storage,
	limits: { fileSize: 5000000 }, // 5MB limit
	fileFilter: (req, file, cb) => {
		const filetypes = /jpeg|jpg|png|webp/;
		const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
		const mimetype = filetypes.test(file.mimetype);
		if (extname && mimetype) {
			return cb(null, true);
		}
		cb(new Error('Only image files are allowed!'));
	}
});

// Get all food items with search, filter and sort functionality
router.get('/', async (req, res) => {
	try {
		const { category, isVeg, search, minPrice, maxPrice, sort } = req.query;
		const query = { isAvailable: true };
		
		// Category and Veg/Non-veg filters
		if (category) query.category = category;
		if (isVeg !== undefined) query.isVeg = isVeg === 'true';
		
		// Search by name or description
		if (search) {
			query.$or = [
				{ name: { $regex: search, $options: 'i' } },
				{ description: { $regex: search, $options: 'i' } }
			];
		}
		
		// Price range filter
		if (minPrice !== undefined || maxPrice !== undefined) {
			query.price = {};
			if (minPrice !== undefined) query.price.$gte = Number(minPrice);
			if (maxPrice !== undefined) query.price.$lte = Number(maxPrice);
		}

		// Build sort object
		let sortObj = {};
		if (sort) {
			switch(sort) {
				case 'price_asc':
					sortObj = { price: 1 };
					break;
				case 'price_desc':
					sortObj = { price: -1 };
					break;
				case 'rating_desc':
					sortObj = { averageRating: -1 };
					break;
				case 'name_asc':
					sortObj = { name: 1 };
					break;
				default:
					sortObj = { createdAt: -1 };
			}
		}

		const foods = await Food.find(query).sort(sortObj);
		res.json(foods);
	} catch (error) {
		console.error('Food search error:', error);
		res.status(500).json({ message: error.message });
	}
});

// Get food categories
router.get('/categories', async (req, res) => {
	try {
		const categories = await Food.distinct('category');
		res.json(categories);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
});




// Add new food item with image upload (admin only)
router.post('/', verifyToken, verifyAdmin, upload.single('image'), async (req, res) => {
	try {
		const foodData = {
			...req.body,
			image: `/uploads/${req.file.filename}`,
			price: parseFloat(req.body.price)
		};
		
		const food = new Food(foodData);
		const savedFood = await food.save();
		res.status(201).json(savedFood);
	} catch (error) {
		res.status(400).json({ message: error.message });
	}
});

// Update food item with optional image update (admin only)
router.put('/:id', verifyToken, verifyAdmin, upload.single('image'), async (req, res) => {
	try {
		const updateData = { ...req.body };
		
		// Handle boolean conversion for isVeg
		if (updateData.isVeg) {
			updateData.isVeg = updateData.isVeg === 'true';
		}
		
		// Handle image update
		if (req.file) {
			updateData.image = `/uploads/${req.file.filename}`;
		}
		
		// Handle price conversion
		if (updateData.price) {
			updateData.price = parseFloat(updateData.price);
		}
		
		const updatedFood = await Food.findByIdAndUpdate(
			req.params.id,
			updateData,
			{ new: true, runValidators: true }
		);
		
		if (!updatedFood) {
			return res.status(404).json({ message: 'Food item not found' });
		}
		
		res.json(updatedFood);
	} catch (error) {
		console.error('Update food error:', error);
		res.status(400).json({ message: error.message });
	}
});

// Delete food item (admin only)
router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
	try {
		await Food.findByIdAndDelete(req.params.id);
		res.json({ message: 'Food item deleted' });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
});

module.exports = router;