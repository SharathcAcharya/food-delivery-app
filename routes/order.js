const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const User = require('../models/User');
const { verifyToken, verifyAdmin } = require('./auth');
const Razorpay = require('razorpay');

// Initialize Razorpay with error handling
let razorpay;
try {
	razorpay = new Razorpay({
		key_id: process.env.RAZORPAY_KEY_ID,
		key_secret: process.env.RAZORPAY_KEY_SECRET
	});
	console.log('Razorpay initialized successfully in order routes');
} catch (error) {
	console.error('Razorpay initialization failed:', error);
}

// Get order analytics (admin only)
router.get('/analytics', verifyToken, verifyAdmin, async (req, res) => {
	try {
		const { startDate, endDate } = req.query;
		const query = {};
		
		if (startDate && endDate) {
			query.createdAt = {
				$gte: new Date(startDate),
				$lte: new Date(endDate)
			};
		}

		const orders = await Order.find(query).lean();
		const users = await User.find().lean();
		
		const analytics = {
			totalOrders: orders.length,
			totalRevenue: orders.reduce((sum, order) => sum + order.total, 0),
			activeUsers: users.length,
			paymentMethods: {
				razorpay: orders.filter(o => o.paymentMethod === 'razorpay').length,
				cash_on_delivery: orders.filter(o => o.paymentMethod === 'cash_on_delivery').length
			},
			orderStatus: {
				pending: orders.filter(o => o.status === 'pending').length,
				confirmed: orders.filter(o => o.status === 'confirmed').length,
				preparing: orders.filter(o => o.status === 'preparing').length,
				out_for_delivery: orders.filter(o => o.status === 'out_for_delivery').length,
				delivered: orders.filter(o => o.status === 'delivered').length,
				cancelled: orders.filter(o => o.status === 'cancelled').length
			}
		};

		res.json(analytics);
	} catch (error) {
		console.error('Analytics error:', error);
		res.status(500).json({ message: error.message });
	}
});

// Create new order
router.post('/', verifyToken, async (req, res) => {
	try {
		const { items, deliveryAddress, paymentMethod } = req.body;
		const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

		// Create order in database
		const order = new Order({
			user: req.user._id,
			items,
			total,
			deliveryAddress,
			paymentMethod,
			status: paymentMethod === 'razorpay' ? 'pending' : 'confirmed'
		});

		// If online payment, create Razorpay order
		if (paymentMethod === 'razorpay') {
			if (!razorpay) {
				throw new Error('Razorpay not initialized');
			}

			try {
				const razorpayOrder = await razorpay.orders.create({
					amount: Math.round(total * 100), // Convert to paise
					currency: 'INR',
					receipt: order._id.toString(),
					payment_capture: 1
				});
				order.paymentDetails = {
					razorpayOrderId: razorpayOrder.id
				};
			} catch (error) {
				console.error('Razorpay order creation failed:', error);
				throw new Error('Failed to create payment order');
			}
		}

		const savedOrder = await order.save();

		// Update user's order stats
		const user = await User.findById(req.user._id);
		if (user && typeof user.updateOrderStats === 'function') {
			await user.updateOrderStats(total);
		} else {
			console.warn('User or updateOrderStats method not found');
		}
		
		// Send notification through WebSocket
		global.broadcastNotification(
			req.user._id,
			`Your order #${savedOrder._id} has been placed successfully.`,
			'order'
		);

		res.status(201).json({
			order: savedOrder,
			razorpayDetails: paymentMethod === 'razorpay' ? {
				key: process.env.RAZORPAY_KEY_ID,
				orderId: order.paymentDetails.razorpayOrderId,
				amount: Math.round(total * 100),
				currency: 'INR',
				name: "Food Delivery",
				description: "Food Order Payment",
				prefill: {
					name: user.name,
					email: user.email,
					contact: user.phone
				}
			} : null
		});
	} catch (error) {
		res.status(400).json({ message: error.message });
	}
});

// Verify Razorpay payment
router.post('/verify-payment', verifyToken, async (req, res) => {
	try {
		const { orderId, razorpayPaymentId, razorpaySignature } = req.body;
		const order = await Order.findOne({ 'paymentDetails.razorpayOrderId': orderId });
		
		if (!order) {
			return res.status(404).json({ message: 'Order not found' });
		}

		// Verify signature
		const text = orderId + "|" + razorpayPaymentId;
		const crypto = require('crypto');
		const generated_signature = crypto
			.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
			.update(text)
			.digest('hex');

		if (generated_signature === razorpaySignature) {
			order.paymentStatus = 'completed';
			order.paymentDetails.razorpayPaymentId = razorpayPaymentId;
			order.paymentDetails.razorpaySignature = razorpaySignature;
			await order.save();

			// Send notification through WebSocket
			global.broadcastNotification(
				order.user,
				`Payment for order #${order._id} has been confirmed.`,
				'payment'
			);

			res.json({ message: 'Payment verified successfully' });
		} else {
			res.status(400).json({ message: 'Invalid signature' });
		}
	} catch (error) {
		res.status(400).json({ message: error.message });
	}
});

// Get user's orders with filters
router.get('/my-orders', verifyToken, async (req, res) => {

	try {
		const { status, startDate, endDate } = req.query;
		const query = { user: req.user.id };
		
		if (status) query.status = status;
		if (startDate && endDate) {
			query.createdAt = {
				$gte: new Date(startDate),
				$lte: new Date(endDate)
			};
		}

		const orders = await Order.find(query)
			.populate('items.food')
			.sort({ createdAt: -1 });
		res.json(orders);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
});




// Get all orders with filters (admin only)
router.get('/', verifyToken, verifyAdmin, async (req, res) => {
	try {
		const { status, startDate, endDate, paymentStatus, userId } = req.query;
		const query = {};
		
		if (status) query.status = status;
		if (paymentStatus) query.paymentStatus = paymentStatus;
		if (userId) query.user = userId;
		if (startDate && endDate) {
			query.createdAt = {
				$gte: new Date(startDate),
				$lte: new Date(endDate)
			};
		}

		const orders = await Order.find(query)
			.populate('user', 'name email phone')
			.populate('items.food')
			.sort({ createdAt: -1 });
		res.json(orders);
	} catch (error) {
		console.error('Error fetching orders:', error);
		res.status(500).json({ message: error.message });
	}
});

// Get single order by ID
router.get('/:id', verifyToken, async (req, res) => {
	try {
		const order = await Order.findById(req.params.id)
			.populate('user', 'name email phone')
			.populate('items.food')
			.select('+statusUpdates')
			.lean();

		if (!order) {
			return res.status(404).json({ message: 'Order not found' });
		}

		// Verify user has access to this order
		if (order.user._id.toString() !== req.user.id && !req.user.isAdmin) {
			return res.status(403).json({ message: 'Access denied' });
		}

		// Add estimated delivery time if not delivered
		if (order.status !== 'delivered' && order.status !== 'cancelled') {
			const estimatedTime = new Date();
			estimatedTime.setMinutes(estimatedTime.getMinutes() + 45);
			order.estimatedDeliveryTime = estimatedTime;
		}

		res.json(order);
	} catch (error) {
		console.error('Error fetching order:', error);
		res.status(500).json({ message: error.message });
	}
});

// Update order status with notification (admin only)
router.put('/:id/status', verifyToken, verifyAdmin, async (req, res) => {
	try {
		const { status, note } = req.body;
		const order = await Order.findById(req.params.id);
		
		if (!order) {
			return res.status(404).json({ message: 'Order not found' });
		}

		await order.addStatusUpdate(status, note);
		
		// Send notification through WebSocket
		global.broadcastOrderUpdate(order._id, status, order.user);

		res.json(order);

	} catch (error) {
		res.status(400).json({ message: error.message });
	}
});




module.exports = router;