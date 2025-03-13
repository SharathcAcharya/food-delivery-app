const mongoose = require('mongoose');
const Food = require('../models/Food');
require('dotenv').config();

const foodItems = [
	// Starters
	{
		name: "Paneer Tikka",
		description: "Marinated cottage cheese cubes grilled to perfection",
		price: 249,
		image: "/uploads/paneer-tikka.jpg",
		category: "Starters",
		isVeg: true
	},
	{
		name: "Chicken 65",
		description: "Spicy deep-fried chicken bites",
		price: 299,
		image: "/uploads/chicken-65.jpg",
		category: "Starters",
		isVeg: false
	},
	// Main Course - Indian
	{
		name: "Butter Chicken",
		description: "Tender chicken in rich tomato-based curry",
		price: 349,
		image: "/uploads/butter-chicken.jpg",
		category: "Main Course",
		isVeg: false
	},
	{
		name: "Paneer Butter Masala",
		description: "Cottage cheese in rich tomato gravy",
		price: 299,
		image: "/uploads/paneer-butter-masala.jpg",
		category: "Main Course",
		isVeg: true
	},
	// Fast Food
	{
		name: "Cheese Pizza",
		description: "Classic pizza with mozzarella cheese",
		price: 199,
		image: "/uploads/cheese-pizza.jpg",
		category: "Fast Food",
		isVeg: true
	},
	{
		name: "Chicken Burger",
		description: "Grilled chicken patty with fresh veggies",
		price: 179,
		image: "/uploads/chicken-burger.jpg",
		category: "Fast Food",
		isVeg: false
	},
	// Healthy Food
	{
		name: "Greek Salad",
		description: "Fresh vegetables with feta cheese",
		price: 199,
		image: "/uploads/greek-salad.jpg",
		category: "Healthy Food",
		isVeg: true
	},
	{
		name: "Grilled Chicken Salad",
		description: "Grilled chicken with mixed greens",
		price: 249,
		image: "/uploads/grilled-chicken-salad.jpg",
		category: "Healthy Food",
		isVeg: false
	},
	// Beverages
	{
		name: "Mango Lassi",
		description: "Sweet yogurt drink with mango",
		price: 99,
		image: "/uploads/mango-lassi.jpg",
		category: "Beverages",
		isVeg: true
	},
	{
		name: "Cold Coffee",
		description: "Creamy cold coffee with ice cream",
		price: 149,
		image: "/uploads/cold-coffee.jpg",
		category: "Beverages",
		isVeg: true
	},
	// Desserts
	{
		name: "Gulab Jamun",
		description: "Sweet milk-solid balls in sugar syrup",
		price: 99,
		image: "/uploads/gulab-jamun.jpg",
		category: "Desserts",
		isVeg: true
	},
	{
		name: "Chocolate Brownie",
		description: "Warm chocolate brownie with ice cream",
		price: 149,
		image: "/uploads/chocolate-brownie.jpg",
		category: "Desserts",
		isVeg: true
	}
];

async function populateFood() {
	try {
		await mongoose.connect(process.env.MONGODB_URI);
		console.log('Connected to MongoDB');

		// Clear existing food items
		await Food.deleteMany({});
		console.log('Cleared existing food items');

		// Insert new food items
		const result = await Food.insertMany(foodItems);
		console.log(`Successfully added ${result.length} food items`);

		console.log('Food items added successfully. Categories:');
		const categories = [...new Set(foodItems.map(item => item.category))];
		categories.forEach(category => {
			const count = foodItems.filter(item => item.category === category).length;
			console.log(`${category}: ${count} items`);
		});
	} catch (error) {
		console.error('Error:', error);
	} finally {
		mongoose.disconnect();
	}
}

populateFood();