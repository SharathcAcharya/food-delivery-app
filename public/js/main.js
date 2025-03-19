// Global state
let foodItems = [];
let selectedCategory = '';
let razorpay = null;
const DEFAULT_FOOD_IMAGE = '/uploads/cheese-pizza.jpg';

// WebSocket initialization
let orderSocket = null;

// Clear user data when window is closed
window.addEventListener('beforeunload', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('cart');
});

window.initializeOrderTracking = function() {
    const token = localStorage.getItem('token');
    if (!token) return;

    const wsUrl = window.config.API_URL.replace('http', 'ws');
    orderSocket = new WebSocket(wsUrl);

    orderSocket.onopen = function() {
        console.log('WebSocket connection established');
        // Register user once connection is established
        const user = JSON.parse(localStorage.getItem('user'));
        if (user) {
            sendWebSocketMessage({
                type: 'register',
                userId: user._id
            });
        }
    };

    orderSocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'notification') {
            showNotification(data.message, data.notificationType);
        } else if (data.type === 'orderUpdate') {
            updateOrderStatus(data.orderId, data.status);
        }
    };

    orderSocket.onerror = (error) => {
        console.error('WebSocket error:', error);
    };

    orderSocket.onclose = () => {
        console.log('WebSocket connection closed');
        setTimeout(initializeOrderTracking, 5000); // Attempt to reconnect
    };
};

// Helper function to safely send WebSocket messages
function sendWebSocketMessage(message) {
    if (!orderSocket) {
        console.warn('WebSocket is not initialized');
        return;
    }

    if (orderSocket.readyState === WebSocket.CONNECTING) {
        setTimeout(() => sendWebSocketMessage(message), 1000); // Retry after 1 second
        return;
    }

    if (orderSocket.readyState === WebSocket.OPEN) {
        orderSocket.send(JSON.stringify(message));
    } else {
        console.warn('WebSocket is not in OPEN state. Current state:', orderSocket.readyState);
    }
}

// Food item loading and filtering
function loadFoodItems(category = '') {
    const url = new URL(`${API_URL}/api/food`);
    if (category) url.searchParams.set('category', category);
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            foodItems = data;
            displayFoodItems(data);
            initializeCategoryPills(data);
        })
        .catch(error => {
            console.error('Error loading food items:', error);
            showNotification('Failed to load food items', 'error');
        });
}

function initializeCategoryPills(items) {
    const categories = [...new Set(items.map(item => item.category))];
    const pillsContainer = document.getElementById('categoryPills');
    
    pillsContainer.innerHTML = categories.map(category => `
        <button class="category-pill ${category === selectedCategory ? 'active' : ''}" 
                onclick="filterByCategory('${category}')">
            ${category}
        </button>
    `).join('');
}

function displayFoodItems(items) {
    const foodGrid = document.getElementById('foodGrid');
    if (!foodGrid) return;

    foodGrid.innerHTML = items.map(item => {
        const imagePath = item.image ? 
            (item.image.startsWith('/') ? item.image : `/${item.image}`) : 
            DEFAULT_FOOD_IMAGE;

        return `
            <div class="food-item">
                <img src="${imagePath}" alt="${item.name}" onerror="this.src='${DEFAULT_FOOD_IMAGE}'">
                <div class="food-info">
                    <h3>${item.name}</h3>
                    <p>${item.description}</p>
                    <span class="food-price">₹${item.price.toFixed(2)}</span>
                    <span class="food-category">${item.category}</span>
                    ${item.isVeg ? '<span class="veg-badge">VEG</span>' : ''}
                </div>
                <button onclick="addToCart('${encodeURIComponent(JSON.stringify(item))}')" class="add-to-cart-btn">Add to Cart</button>
            </div>
        `;
    }).join('');
}

// Add to cart functionality
function addToCart(itemData) {
    try {
        const item = JSON.parse(decodeURIComponent(itemData));
        let cart = JSON.parse(localStorage.getItem('cart') || '[]');
        const existingItem = cart.find(i => i._id === item._id);
        
        if (existingItem) {
            existingItem.quantity = (existingItem.quantity || 1) + 1;
        } else {
            cart.push({ ...item, quantity: 1 });
        }
        
        localStorage.setItem('cart', JSON.stringify(cart));
        showNotification('Item added to cart', 'success');
        updateCartCount();
    } catch (error) {
        console.error('Error adding item to cart:', error);
        showNotification('Failed to add item to cart', 'error');
    }
}

function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const cartCount = cart.reduce((total, item) => total + (item.quantity || 1), 0);
    const cartCountElement = document.getElementById('cartCount');
    if (cartCountElement) {
        cartCountElement.textContent = cartCount;
        cartCountElement.style.display = cartCount > 0 ? 'block' : 'none';
    }
}

// Make addToCart function available globally
window.addToCart = addToCart;
function filterByCategory(category) {
    selectedCategory = category;
    applyFilters();

    // Update active category pill
    document.querySelectorAll('.category-pill').forEach(pill => {
        pill.classList.toggle('active', pill.textContent.trim() === category);
    });
}

function applyFilters() {
    let filteredItems = [...foodItems];
    
    // Category filter
    if (selectedCategory) {
        filteredItems = filteredItems.filter(item => item.category === selectedCategory);
    }
    
    // Search text filter
    const searchText = document.getElementById('searchInput').value.toLowerCase();
    if (searchText) {
        filteredItems = filteredItems.filter(item =>
            item.name.toLowerCase().includes(searchText) ||
            item.description.toLowerCase().includes(searchText)
        );
    }
    
    // Price range filter
    const minPrice = parseFloat(document.getElementById('minPrice').value) || 0;
    const maxPrice = parseFloat(document.getElementById('maxPrice').value) || Infinity;
    filteredItems = filteredItems.filter(item =>
        item.price >= minPrice && item.price <= maxPrice
    );
    
    // Dietary preference filter
    const dietary = document.getElementById('dietaryFilter').value;
    if (dietary === 'veg') {
        filteredItems = filteredItems.filter(item => item.isVeg);
    } else if (dietary === 'non-veg') {
        filteredItems = filteredItems.filter(item => !item.isVeg);
    }
    
    displayFoodItems(filteredItems);
}

// Event listeners for filters
document.addEventListener('DOMContentLoaded', () => {
    loadFoodItems();
    initializeOrderTracking();

    // Initialize Razorpay if available
    if (typeof Razorpay !== 'undefined') {
        razorpay = window.Razorpay;
    }

    // Add event listeners for filters
    document.getElementById('searchInput')?.addEventListener('input', debounce(applyFilters, 300));
    document.getElementById('categoryFilter')?.addEventListener('change', () => {
        filterByCategory(document.getElementById('categoryFilter').value);
    });
    document.getElementById('minPrice')?.addEventListener('input', debounce(applyFilters, 300));
    document.getElementById('maxPrice')?.addEventListener('input', debounce(applyFilters, 300));
    document.getElementById('dietaryFilter')?.addEventListener('change', applyFilters);
});

// Utility function for debouncing
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Notification system
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    // Clear any existing session data first
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('cart');
    currentUser = null;

    // Check authentication status
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');

    if (!token || !user) {
        // Redirect to login if no valid session
        window.location.href = '/login.html';
        return;
    }

    // Initialize application only if user is authenticated
    currentUser = user;
    loadFoodItems();
    initializeOrderTracking();
    updateUI();

    // Initialize Razorpay if available
    if (typeof Razorpay !== 'undefined') {
        razorpay = Razorpay;
        console.log('Razorpay initialized successfully');
    }
});

// Add event listeners for filters
document.getElementById('searchInput')?.addEventListener('input', debounce(applyFilters, 300));
document.getElementById('categoryFilter')?.addEventListener('change', () => {
    filterByCategory(document.getElementById('categoryFilter').value);
});
document.getElementById('minPrice')?.addEventListener('input', debounce(applyFilters, 300));
document.getElementById('maxPrice')?.addEventListener('input', debounce(applyFilters, 300));
document.getElementById('dietaryFilter')?.addEventListener('change', applyFilters);

// Export necessary functions
window.filterByCategory = filterByCategory;
window.showNotification = showNotification;

// Razorpay payment handler
function handleRazorpayPayment(razorpayDetails) {
    const options = {
        key: razorpayDetails.key,
        amount: razorpayDetails.amount,
        currency: razorpayDetails.currency,
        name: 'Food Delivery',
        description: 'Food Order Payment',
        order_id: razorpayDetails.orderId,
        handler: function (response) {
            verifyPayment(razorpayDetails.orderId, response.razorpay_payment_id, response.razorpay_signature);
        },
        prefill: {
            name: currentUser.name,
            email: currentUser.email,
            contact: currentUser.phone
        },
        theme: {
            color: '#ff4757'
        }
    };

    const rzp = new razorpay(options);
    rzp.open();
}

async function verifyPayment(orderId, paymentId, signature) {
    try {
        const response = await fetch(`${API_URL}/api/order/verify-payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                orderId,
                razorpayPaymentId: paymentId,
                razorpaySignature: signature
            })
        });

        if (!response.ok) {
            throw new Error('Payment verification failed');
        }

        const result = await response.json();
        orderSuccess(orderId);
        
        // Update profile orders if available
        if (typeof updateProfileOrders === 'function') {
            updateProfileOrders();
        }
    } catch (error) {
        console.error('Payment verification error:', error);
        showNotification('Payment verification failed. Please contact support.', 'error');
    }
}

// Make payment handler available globally
window.handleRazorpayPayment = handleRazorpayPayment;

// Modal functionality
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Add event listeners for modal close buttons
document.addEventListener('DOMContentLoaded', () => {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        const closeBtn = modal.querySelector('.close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }
    });
});

// Make modal functions available globally
window.showModal = showModal;
window.closeModal = closeModal;

