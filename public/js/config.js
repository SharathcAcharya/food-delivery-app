// Global configuration
window.API_URL = 'https://food-delivery-app-tsa5.onrender.com';
window.orderSocket = window.orderSocket || null;
window.RAZORPAY_KEY = 'YOUR_RAZORPAY_KEY'; // Replace with your actual Razorpay key
window.DEFAULT_FOOD_IMAGE = window.API_URL + '/uploads/cheese-pizza.jpg';

// Global state
window.isLoggedIn = false;
window.currentUser = null;

// Initialize state from localStorage
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    
    if (token && user) {
        window.isLoggedIn = true;
        window.currentUser = user;
    }
});

// Export configuration
window.config = {
    API_URL: window.API_URL,
    orderSocket: window.orderSocket,
    DEFAULT_FOOD_IMAGE: window.DEFAULT_FOOD_IMAGE
};