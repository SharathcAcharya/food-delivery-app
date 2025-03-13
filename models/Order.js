const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
	user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
	items: [{
		food: { type: mongoose.Schema.Types.ObjectId, ref: 'Food', required: true },
		quantity: { type: Number, required: true, min: 1 },
		price: { type: Number, required: true }
	}],
	total: { type: Number, required: true },
	deliveryAddress: { 
		street: { type: String, required: true },
		city: { type: String, required: true },
		state: { type: String, required: true },
		pincode: { type: String, required: true },
		phone: { type: String, required: true },
		latitude: { type: Number },
		longitude: { type: Number }
	},
	currentLocation: {
		latitude: { type: Number },
		longitude: { type: Number },
		updatedAt: { type: Date }
	},
	status: { 
		type: String, 
		enum: ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'],
		default: 'pending'
	},
	paymentMethod: { 
		type: String,
		enum: ['cash_on_delivery', 'razorpay'],
		required: true
	},
	paymentStatus: { 
		type: String, 
		enum: ['pending', 'completed', 'failed', 'refunded'],
		default: 'pending'
	},
	paymentDetails: {
		razorpayOrderId: String,
		razorpayPaymentId: String,
		razorpaySignature: String
	},
	statusUpdates: [{
		status: String,
		timestamp: { type: Date, default: Date.now },
		note: String
	}],
	estimatedDeliveryTime: Date,
	specialInstructions: String
}, { timestamps: true });

// Add status update to tracking
orderSchema.methods.addStatusUpdate = function(status, note) {
	this.status = status;
	this.statusUpdates.push({ status, note });
	return this.save();
};

module.exports = mongoose.model('Order', orderSchema);