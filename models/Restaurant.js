const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
    name: { type: String, required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    description: { type: String },
    address: {
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        pincode: { type: String, required: true },
        coordinates: {
            latitude: { type: Number },
            longitude: { type: Number }
        }
    },
    contactInfo: {
        phone: { type: String, required: true },
        email: { type: String, required: true },
        website: String
    },
    businessHours: [{
        day: { type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] },
        open: String,
        close: String,
        isClosed: { type: Boolean, default: false }
    }],
    cuisine: [{ type: String }],
    rating: { type: Number, default: 0 },
    totalRatings: { type: Number, default: 0 },
    metrics: {
        totalOrders: { type: Number, default: 0 },
        totalRevenue: { type: Number, default: 0 },
        averageOrderValue: { type: Number, default: 0 },
        popularItems: [{
            foodId: { type: mongoose.Schema.Types.ObjectId, ref: 'Food' },
            orderCount: { type: Number, default: 0 },
            revenue: { type: Number, default: 0 }
        }],
        ordersByStatus: {
            pending: { type: Number, default: 0 },
            confirmed: { type: Number, default: 0 },
            preparing: { type: Number, default: 0 },
            out_for_delivery: { type: Number, default: 0 },
            delivered: { type: Number, default: 0 },
            cancelled: { type: Number, default: 0 }
        },
        peakHours: [{
            hour: Number,
            orderCount: { type: Number, default: 0 }
        }]
    },
    isActive: { type: Boolean, default: true },
    featured: { type: Boolean, default: false },
    images: [String],
    tags: [String]
}, { timestamps: true });

// Update restaurant metrics when an order is completed
restaurantSchema.methods.updateMetrics = async function(order) {
    const orderTotal = order.total;
    this.metrics.totalOrders++;
    this.metrics.totalRevenue += orderTotal;
    this.metrics.averageOrderValue = this.metrics.totalRevenue / this.metrics.totalOrders;

    // Update order status count
    this.metrics.ordersByStatus[order.status]++;

    // Update peak hours
    const orderHour = new Date(order.createdAt).getHours();
    const peakHourIndex = this.metrics.peakHours.findIndex(ph => ph.hour === orderHour);
    if (peakHourIndex >= 0) {
        this.metrics.peakHours[peakHourIndex].orderCount++;
    } else {
        this.metrics.peakHours.push({ hour: orderHour, orderCount: 1 });
    }

    // Update popular items
    for (const item of order.items) {
        const popularItemIndex = this.metrics.popularItems.findIndex(
            pi => pi.foodId.toString() === item.food.toString()
        );

        if (popularItemIndex >= 0) {
            this.metrics.popularItems[popularItemIndex].orderCount += item.quantity;
            this.metrics.popularItems[popularItemIndex].revenue += item.price * item.quantity;
        } else {
            this.metrics.popularItems.push({
                foodId: item.food,
                orderCount: item.quantity,
                revenue: item.price * item.quantity
            });
        }
    }

    return this.save();
};

module.exports = mongoose.model('Restaurant', restaurantSchema);