// Global state
const DEFAULT_FOOD_IMAGE = 'https://via.placeholder.com/100x100?text=Food';
let cart = [];

// Initialize cart when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Check login status first
        await checkLoginStatus();
        
        // Load cart data
        await loadCart();
        
        // Initialize UI elements
        initializeUI();

        // Add event listeners
        setupEventListeners();
    } catch (error) {
        console.error('Error initializing cart:', error);
        showNotification('Error loading cart', 'error');
    }
});

// Function to check login status
async function checkLoginStatus() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    window.isLoggedIn = !!(token && user && !user.isAdmin);
    window.currentUser = user;
    
    if (window.isLoggedIn) {
        try {
            // Fetch user's cart from the database
            const response = await fetch('/api/cart', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const dbCart = await response.json();
                // Merge database cart with local cart
                await mergeCart(dbCart);
            }
        } catch (error) {
            console.error('Error fetching cart from database:', error);
        }
    }
}

// Function to merge database cart with local cart
async function mergeCart(dbCart) {
    try {
        const localCart = JSON.parse(localStorage.getItem('cart') || '[]');
        
        // Merge items, preferring database quantities for existing items
        const mergedCart = dbCart.items.map(dbItem => ({
            _id: dbItem.food._id,
            name: dbItem.food.name,
            price: dbItem.food.price,
            image: dbItem.food.image || DEFAULT_FOOD_IMAGE,
            quantity: dbItem.quantity
        }));

        // Add local items that don't exist in db cart
        localCart.forEach(localItem => {
            if (!mergedCart.find(item => item._id === localItem._id)) {
                mergedCart.push(localItem);
            }
        });

        cart = mergedCart;
        await saveCart();
        updateCartDisplay();
    } catch (error) {
        console.error('Error merging carts:', error);
    }
}

// Function to sync cart with database
async function syncCartWithDB() {
    if (!window.isLoggedIn) return;

    const token = localStorage.getItem('token');
    try {
        const response = await fetch('/api/cart/sync', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                items: cart.map(item => ({
                    food: item._id,
                    quantity: item.quantity
                }))
            })
        });

        if (!response.ok) {
            throw new Error('Failed to sync cart with database');
        }
    } catch (error) {
        console.error('Error syncing cart:', error);
        showNotification('Failed to sync cart with server', 'error');
    }
}

// Function to initialize UI elements
function initializeUI() {
    // Update cart count in header
    updateCartCount();

    // Setup cart items display
    const cartItemsContainer = document.getElementById('cartItems');
    if (cartItemsContainer) {
        displayCartItems(cartItemsContainer);
    }

    // Setup cart total
    updateCartTotal();

    // Setup checkout button
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) {
        checkoutBtn.disabled = cart.length === 0;
    }
}

// Function to setup event listeners
function setupEventListeners() {
    // Checkout form submission
    const checkoutForm = document.getElementById('checkoutForm');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', handleCheckout);
    }

    // Modal close buttons
    const closeButtons = document.getElementsByClassName('close');
    Array.from(closeButtons).forEach(button => {
        button.addEventListener('click', () => {
            const modal = button.closest('.modal');
            if (modal) modal.style.display = 'none';
        });
    });

    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });

    // Login form submission
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleLogin(e);
        });
    }
}

// Function to handle login
async function handleLogin(e) {
    try {
        const formData = new FormData(e.target);
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: formData.get('username'),
                password: formData.get('password')
            })
        });

        const data = await response.json();
        if (data.token) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            window.isLoggedIn = true;
            document.getElementById('loginModal').style.display = 'none';
            showNotification('Login successful!');
            location.reload();
        } else {
            throw new Error(data.message || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification(error.message || 'Login failed', 'error');
    }
}

// Function to load cart from localStorage
async function loadCart() {
    try {
        const savedCart = localStorage.getItem('cart');
        if (savedCart) {
            cart = JSON.parse(savedCart);
            // Validate cart items
            cart = cart.filter(item => item && item._id && item.name && !isNaN(item.price));
            // Ensure all items have the required properties
            cart = cart.map(item => ({
                _id: item._id,
                name: item.name,
                price: parseFloat(item.price),
                image: item.image || DEFAULT_FOOD_IMAGE,
                quantity: Math.max(1, parseInt(item.quantity) || 1)
            }));
            await saveCart(); // Save the validated cart back to localStorage
        }
    } catch (error) {
        console.error('Error loading cart:', error);
        cart = [];
    }
    updateCartDisplay();
}

// Function to update cart count in header
function updateCartCount() {
    const cartCount = document.getElementById('cartCount');
    if (cartCount) {
        const totalItems = cart.reduce((total, item) => total + (item.quantity || 0), 0);
        cartCount.textContent = totalItems;
    }
}

// Function to display cart items
function displayCartItems(container) {
    if (!container) return;
    
    container.innerHTML = '';
    
    if (cart.length === 0) {
        container.innerHTML = '<div class="empty-cart">Your cart is empty</div>';
        return;
    }

    cart.forEach(item => {
        const cartItemElement = document.createElement('div');
        cartItemElement.className = 'cart-item';
        cartItemElement.innerHTML = `
            <img src="${item.image || DEFAULT_FOOD_IMAGE}" alt="${item.name}" onerror="this.src='${DEFAULT_FOOD_IMAGE}'">
            <div class="cart-item-details">
                <h3>${item.name}</h3>
                <p>₹${item.price.toFixed(2)} × ${item.quantity}</p>
                <p class="item-total">Total: ₹${(item.price * item.quantity).toFixed(2)}</p>
            </div>
            <div class="cart-item-actions">
                <button onclick="updateQuantity('${item._id}', -1)">-</button>
                <span>${item.quantity}</span>
                <button onclick="updateQuantity('${item._id}', 1)">+</button>
                <button onclick="removeFromCart('${item._id}')" class="remove-btn">×</button>
            </div>
        `;
        container.appendChild(cartItemElement);
    });
}

// Function to update cart total
function updateCartTotal() {
    const cartTotal = document.getElementById('cartTotal');
    if (cartTotal) {
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        cartTotal.textContent = total.toFixed(2);
    }
}

// Function to update cart display
function updateCartDisplay() {
    updateCartCount();
    const cartItemsContainer = document.getElementById('cartItems');
    if (cartItemsContainer) {
        displayCartItems(cartItemsContainer);
    }
    updateCartTotal();

    // Update checkout button state
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) {
        checkoutBtn.disabled = cart.length === 0;
    }
}

// Function to add item to cart
async function addToCart(item) {
    try {
        // Parse the item if it's a string
        if (typeof item === 'string') {
            item = JSON.parse(decodeURIComponent(item));
        }

        if (!item || !item._id) {
            console.error('Invalid item:', item);
            showNotification('Error adding item to cart', 'error');
            return;
        }

        const existingItem = cart.find(cartItem => cartItem._id === item._id);
        if (existingItem) {
            existingItem.quantity = (existingItem.quantity || 0) + 1;
        } else {
            cart.push({
                _id: item._id,
                name: item.name,
                price: parseFloat(item.price),
                image: item.image || DEFAULT_FOOD_IMAGE,
                quantity: 1
            });
        }
        await saveCart();
        updateCartDisplay();
        showNotification('Item added to cart!');
    } catch (error) {
        console.error('Error adding item to cart:', error);
        showNotification('Error adding item to cart', 'error');
    }
}

// Function to update item quantity
async function updateQuantity(itemId, change) {
    try {
        const item = cart.find(item => item._id === itemId);
        if (item) {
            const newQuantity = Math.max(0, item.quantity + change);
            if (newQuantity === 0) {
                await removeFromCart(itemId);
            } else {
                item.quantity = newQuantity;
                await saveCart();
                updateCartDisplay();
            }
        }
    } catch (error) {
        console.error('Error updating quantity:', error);
        showNotification('Error updating quantity', 'error');
    }
}

// Function to remove item from cart
async function removeFromCart(itemId) {
    try {
        cart = cart.filter(item => item._id !== itemId);
        await saveCart();
        updateCartDisplay();
        showNotification('Item removed from cart!');
    } catch (error) {
        console.error('Error removing item:', error);
        showNotification('Error removing item', 'error');
    }
}

// Function to save cart to localStorage
async function saveCart() {
    try {
        localStorage.setItem('cart', JSON.stringify(cart));
        if (window.isLoggedIn) {
            await syncCartWithDB();
        }
    } catch (error) {
        console.error('Error saving cart:', error);
        showNotification('Error saving cart', 'error');
    }
}

// Function to show notification
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    const container = document.getElementById('notificationContainer') || document.body;
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Function to handle checkout
async function handleCheckout(e) {
    e.preventDefault();
    
    if (!window.isLoggedIn) {
        showNotification('Please login to checkout!', 'error');
        document.getElementById('loginModal').style.display = 'block';
        return;
    }

    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value;
    if (!paymentMethod) {
        showNotification('Please select a payment method', 'error');
        return;
    }

    const deliveryDetails = {
        street: document.getElementById('street').value,
        city: document.getElementById('city').value,
        state: document.getElementById('state').value,
        pincode: document.getElementById('pincode').value,
        phone: document.getElementById('phone').value
    };

    // Validate delivery details
    for (const [key, value] of Object.entries(deliveryDetails)) {
        if (!value) {
            showNotification(`Please enter your ${key}`, 'error');
            return;
        }
    }

    try {
        const orderData = {
            items: cart.map(item => ({
                food: item._id,
                quantity: item.quantity,
                price: item.price
            })),
            total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
            deliveryAddress: deliveryDetails,
            paymentMethod
        };

        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Authentication token not found');
        }

        if (paymentMethod === 'razorpay') {
            const response = await fetch('/api/order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(orderData)
            });

            const data = await response.json();
            
            if (data.success) {
                const options = {
                    key: window.RAZORPAY_KEY,
                    amount: data.order.amount,
                    currency: 'INR',
                    name: 'Food Delivery App',
                    description: 'Order Payment',
                    order_id: data.order.id,
                    handler: function(response) {
                        handleRazorpayPayment(response, data.order);
                    },
                    prefill: {
                        name: window.currentUser?.name || '',
                        email: window.currentUser?.email || '',
                        contact: window.currentUser?.phone || ''
                    },
                    theme: {
                        color: '#ff4757'
                    },
                    modal: {
                        ondismiss: function() {
                            showNotification('Payment cancelled', 'error');
                        }
                    }
                };

                try {
                    const razorpayHandler = new window.Razorpay(options);
                    razorpayHandler.open();
                } catch (error) {
                    console.error('Razorpay initialization error:', error);
                    showNotification('Payment gateway error. Please try again later.', 'error');
                }
            } else {
                throw new Error(data.message || 'Failed to create order');
            }
        } else {
            // Handle cash on delivery
            const response = await fetch('/api/order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(orderData)
            });

            const data = await response.json();
            
            if (data.success) {
                await orderSuccess(data.order);
            } else {
                throw new Error(data.message || 'Failed to create order');
            }
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification(error.message || 'An error occurred while processing your order', 'error');
    }
}

// Function to handle Razorpay payment
async function handleRazorpayPayment(response, order) {
    try {
        if (response.razorpay_payment_id) {
            await orderSuccess(order);
        } else {
            showNotification('Payment failed. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Payment handling error:', error);
        showNotification('Error processing payment', 'error');
    }
}

// Function to handle successful order
async function orderSuccess(order) {
    try {
        cart = [];
        localStorage.removeItem('cart');
        await syncCartWithDB(); // Sync empty cart with database
        updateCartDisplay();
        showNotification('Order placed successfully!');
        window.location.href = `/orders.html?orderId=${order._id}`;
    } catch (error) {
        console.error('Error in order success:', error);
        showNotification('Order placed but there was an error updating the cart', 'error');
    }
}

// Make functions globally available
window.addToCart = addToCart;
window.updateQuantity = updateQuantity;
window.removeFromCart = removeFromCart;
window.handleCheckout = handleCheckout;
window.orderSuccess = orderSuccess; 