const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [{
        food: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Food',
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        }
    }],
    lastUpdated: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Update lastUpdated timestamp on save
cartSchema.pre('save', function(next) {
    this.lastUpdated = new Date();
    next();
});

// Add method to calculate total
cartSchema.methods.calculateTotal = function() {
    return this.items.reduce((total, item) => {
        return total + (item.food.price * item.quantity);
    }, 0);
};

module.exports = mongoose.model('Cart', cartSchema); 