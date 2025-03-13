const mongoose = require('mongoose');

const foodSchema = new mongoose.Schema({
	name: { 
		type: String, 
		required: true,
		unique: true,
		trim: true
	},
	description: { 
		type: String, 
		required: true 
	},
	price: { 
		type: Number, 
		required: true,
		min: 0
	},
	image: { 
		type: String, 
		required: true 
	},
	category: { 
		type: String, 
		required: true,
		enum: ['Starters', 'Main Course', 'Desserts', 'Beverages', 'Fast Food', 'Healthy Food']
	},
	isVeg: {
		type: Boolean,
		default: false
	},
	isAvailable: { 
		type: Boolean, 
		default: true 
	},
	ratings: [{
		user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
		rating: { type: Number, min: 1, max: 5 },
		review: String
	}],
	averageRating: {
		type: Number,
		default: 0
	}
}, { timestamps: true });

// Calculate average rating before saving
foodSchema.pre('save', function(next) {
	if (this.ratings.length > 0) {
		this.averageRating = this.ratings.reduce((acc, curr) => acc + curr.rating, 0) / this.ratings.length;
	}
	next();
});

module.exports = mongoose.model('Food', foodSchema);