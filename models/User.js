const mongoose = require('mongoose');
const validator = require('validator');

const addressSchema = new mongoose.Schema({
	street: { type: String, required: [true, 'Street address is required'] },
	city: { type: String, required: [true, 'City is required'] },
	state: { type: String, required: [true, 'State is required'] },
	pincode: { 
		type: String, 
		required: [true, 'Pincode is required'],
		validate: {
			validator: function(v) {
				return /^\d{6}$/.test(v);
			},
			message: 'Please enter a valid 6-digit pincode'
		}
	}
});

const userSchema = new mongoose.Schema({
	name: { 
		type: String, 
		required: [true, 'Name is required'],
		trim: true,
		minlength: [3, 'Name must be at least 3 characters long']
	},
	rewardPoints: {
		type: Number,
		default: 0,
		min: [0, 'Reward points cannot be negative']
	},
	membershipTier: {
		type: String,
		enum: ['Bronze', 'Silver', 'Gold', 'Platinum'],
		default: 'Bronze'
	},
	pointHistory: [{
		points: Number,
		type: {
			type: String,
			enum: ['earned', 'redeemed'],
			required: true
		},
		orderId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Order'
		},
		description: String,
		createdAt: {
			type: Date,
			default: Date.now
		}
	}],
	username: { 
		type: String, 
		required: [true, 'Username is required'],
		unique: true,
		trim: true,
		minlength: [3, 'Username must be at least 3 characters long'],
		validate: {
			validator: function(v) {
				return /^[a-zA-Z0-9_]+$/.test(v);
			},
			message: 'Username can only contain letters, numbers, and underscores'
		}
	},
	email: { 
		type: String, 
		required: [true, 'Email is required'],
		unique: true,
		trim: true,
		lowercase: true,
		validate: [validator.isEmail, 'Please enter a valid email']
	},
	password: { 
		type: String, 
		required: [true, 'Password is required'],
		minlength: [6, 'Password must be at least 6 characters long']
	},
	phone: { 
		type: String, 
		required: [true, 'Phone number is required'],
		validate: {
			validator: function(v) {
				return /^\d{10}$/.test(v);
			},
			message: 'Please enter a valid 10-digit phone number'
		}
	},
	image: { 
		type: String, 
		default: 'https://via.placeholder.com/150'
	},
	addresses: [addressSchema],
	isAdmin: { 
		type: Boolean, 
		default: false 
	},
	orderCount: { 
		type: Number, 
		default: 0,
		min: [0, 'Order count cannot be negative']
	},
	totalSpent: { 
		type: Number, 
		default: 0,
		min: [0, 'Total spent cannot be negative']
	},
	favoriteItems: [{ 
		type: mongoose.Schema.Types.ObjectId, 
		ref: 'Food' 
	}],
	orders: [{ 
		type: mongoose.Schema.Types.ObjectId, 
		ref: 'Order' 
	}],
	notifications: [{
		message: String,
		type: { 
			type: String, 
			enum: ['order', 'promotion', 'system'],
			default: 'system'
		},
		read: { 
			type: Boolean, 
			default: false 
		},
		createdAt: { 
			type: Date, 
			default: Date.now 
		}
	}]
}, { 
	timestamps: true,
	toJSON: { virtuals: true },
	toObject: { virtuals: true }
});

// Virtual for getting user's active orders
userSchema.virtual('activeOrders', {
	ref: 'Order',
	localField: '_id',
	foreignField: 'user',
	match: { status: { $nin: ['delivered', 'cancelled'] } }
});

// Method to add notification
userSchema.methods.addNotification = function(message, type = 'system') {
	this.notifications.unshift({ message, type });
	return this.save();
};

// Update order statistics and reward points
userSchema.methods.updateOrderStats = function(orderTotal) {
	this.orderCount += 1;
	this.totalSpent += orderTotal;
	
	// Calculate reward points (1 point per 10 currency spent)
	const earnedPoints = Math.floor(orderTotal / 10);
	this.rewardPoints += earnedPoints;
	
	// Update membership tier based on total spent
	if (this.totalSpent >= 50000) {
		this.membershipTier = 'Platinum';
	} else if (this.totalSpent >= 25000) {
		this.membershipTier = 'Gold';
	} else if (this.totalSpent >= 10000) {
		this.membershipTier = 'Silver';
	}
	
	// Add to point history
	this.pointHistory.push({
		points: earnedPoints,
		type: 'earned',
		description: `Earned points for order total of ${orderTotal}`
	});
	
	return this.save();
};

// Method to redeem points
userSchema.methods.redeemPoints = function(points, orderId) {
	if (points > this.rewardPoints) {
		throw new Error('Insufficient reward points');
	}
	
	this.rewardPoints -= points;
	this.pointHistory.push({
		points: points,
		type: 'redeemed',
		orderId: orderId,
		description: `Redeemed points for order ${orderId}`
	});
	
	return this.save();
};

module.exports = mongoose.model('User', userSchema);