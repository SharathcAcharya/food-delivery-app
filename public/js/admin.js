// API URL configuration
const API_URL = 'http://localhost:3005';
const DEFAULT_FOOD_IMAGE = '/uploads/cheese-pizza.jpg';

// Global state
let token = null;
let isAuthenticating = false;
let foods = [];
let orders = [];
let users = [];
let analytics = {
	totalRevenue: 0,
	totalOrders: 0,
	activeUsers: 0
};

// Update checkAdminAuth function
function checkAdminAuth() {
    token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    
    if (!token || !user) {
        return false;
    }
    
    if (!user.isAdmin) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        return false;
    }
    return true;
}

// Update fetchWithAuth function
async function fetchWithAuth(url, options = {}) {
	const token = localStorage.getItem('token');
	const user = JSON.parse(localStorage.getItem('user') || 'null');

	if (!token || !user || !user.isAdmin) {
		window.location.href = 'admin-login.html';
		return null;
	}

	try {
		const response = await fetch(url, {
			...options,
			headers: {
				...options.headers,
				'Authorization': `Bearer ${token}`,
				'Accept': 'application/json'
			}
		});

		if (!response.ok) {
			if (response.status === 401 || response.status === 403) {
				localStorage.removeItem('token');
				localStorage.removeItem('user');
				window.location.href = 'admin-login.html';
				return null;
			}
			throw new Error('Request failed');
		}

		return response;
	} catch (error) {
		console.error('Fetch error:', error);
		showNotification(error.message, 'error');
		return null;
	}
}

// Add filterFoods function
function filterFoods() {
	const category = document.getElementById('categoryFilter').value;
	loadFoods(category);
}

// DOM Elements
const foodList = document.getElementById('foodList');
const orderList = document.getElementById('orderList');
const userList = document.getElementById('userList');
const logoutBtn = document.getElementById('logoutBtn');
const categoryFilter = document.getElementById('categoryFilter');
const orderStatusFilter = document.getElementById('orderStatusFilter');
const orderDateFilter = document.getElementById('orderDateFilter');

// Charts
let revenueChart, ordersChart;

// Update loadFoods function
async function loadFoods(category = '') {
	const url = category ? 
		`${API_URL}/api/food?category=${category}` : 
		`${API_URL}/api/food`;

	const response = await fetchWithAuth(url);
	if (response) {
		foods = await response.json();
		displayFoods();
	}
}


function displayFoods() {
	if (!foodList) return;
	
	foodList.innerHTML = foods.map(food => {
		// Handle image path
		const imagePath = food.image ? 
			(food.image.startsWith('/') ? food.image : `/${food.image}`) : 
			DEFAULT_FOOD_IMAGE;
			
		return `
			<div class="food-item">
				<img src="${imagePath}" alt="${food.name}" onerror="this.src='${DEFAULT_FOOD_IMAGE}'">
				<div class="food-info">
					<h3>${food.name}</h3>
					<p>${food.description}</p>
					<span class="food-price">₹${food.price.toFixed(2)}</span>
					<span class="food-category">${food.category}</span>
					${food.isVeg ? '<span class="veg-badge">VEG</span>' : ''}
				</div>
				<div class="food-actions">
					<button onclick="editFood('${food._id}')" class="edit-btn">Edit</button>
					<button onclick="deleteFood('${food._id}')" class="delete-btn">Delete</button>
				</div>
			</div>
		`;
	}).join('');
}

// Load and filter orders
async function loadOrders(status = '', date = '') {
	try {
		let url = `${API_URL}/api/order`;  // Changed back to /api/order
		const params = new URLSearchParams();
		if (status) params.append('status', status);
		if (date) {
			// Convert date to start and end of day
			const startDate = new Date(date);
			const endDate = new Date(date);
			endDate.setHours(23, 59, 59, 999);
			params.append('startDate', startDate.toISOString());
			params.append('endDate', endDate.toISOString());
		}
		if (params.toString()) url += '?' + params.toString();

		const response = await fetch(url, {
			headers: { 
				'Authorization': `Bearer ${token}`,
				'Accept': 'application/json'
			}
		});

		if (!response.ok) {
			throw new Error('Failed to load orders');
		}

		orders = await response.json();
		displayOrders();
	} catch (error) {
		console.error('Error loading orders:', error);
		showNotification('Error loading orders', 'error');
	}
}

// Add filterOrders function
function filterOrders() {
	const status = document.getElementById('orderStatusFilter').value;
	const date = document.getElementById('orderDateFilter').value;
	loadOrders(status, date);
}

function displayOrders() {
	if (!orderList) return;
	
	orderList.innerHTML = orders.map(order => {
		const userName = order.user?.name || 'Unknown User';
		const userPhone = order.user?.phone || 'No Phone';
		const deliveryAddress = order.deliveryAddress || 'No Address';
		
		return `
			<div class="order-item">
				<div class="order-header">
					<span>Order #${order._id}</span>
					<span class="order-status status-${order.status}">${order.status}</span>
				</div>
				<div class="order-customer">
					<p>Customer: ${userName}</p>
					<p>Phone: ${userPhone}</p>
					<p>Address: ${deliveryAddress}</p>
				</div>
				<div class="order-items">
					${order.items.map(item => `
						<div class="order-item-detail">
							${item.food?.name || 'Unknown Item'} x ${item.quantity} - ₹${((item.price || 0) * item.quantity).toFixed(2)}
						</div>
					`).join('')}
				</div>
				<div class="order-payment">
					<p>Payment Method: ${order.paymentMethod || 'Not specified'}</p>
					<p>Payment Status: ${order.paymentStatus || 'Unknown'}</p>
				</div>
				<div class="order-total">Total: ₹${(order.total || 0).toFixed(2)}</div>
				<div class="order-actions">
					<select onchange="updateOrderStatus('${order._id}', this.value)" class="status-select">
						<option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
						<option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
						<option value="preparing" ${order.status === 'preparing' ? 'selected' : ''}>Preparing</option>
						<option value="out_for_delivery" ${order.status === 'out_for_delivery' ? 'selected' : ''}>Out for Delivery</option>
						<option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
						<option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
					</select>
					<button onclick="viewOrderDetails('${order._id}')" class="view-btn">View Details</button>
				</div>
			</div>
		`;
	}).join('');
}

// Add new food item
document.getElementById('addFoodForm').addEventListener('submit', async (e) => {
	e.preventDefault();
	const formData = new FormData(e.target);

	try {
		const response = await fetch(`${API_URL}/api/food`, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${token}`
			},
			body: formData // Send FormData directly for multipart/form-data
		});

		if (response.ok) {
			closeModal('addFoodModal');
			loadFoods();
			e.target.reset();
			showNotification('Food item added successfully', 'success');
		} else {
			const error = await response.json();
			showNotification(error.message || 'Error adding food item', 'error');
		}
	} catch (error) {
		console.error('Error adding food:', error);
		showNotification('Error adding food item', 'error');
	}
});

// Edit food item
async function editFood(foodId) {
	const food = foods.find(f => f._id === foodId);
	if (!food) return;

	const form = document.getElementById('editFoodForm');
	form.querySelector('input[name="foodId"]').value = food._id;
	form.querySelector('input[name="name"]').value = food.name;
	form.querySelector('textarea[name="description"]').value = food.description;
	form.querySelector('input[name="price"]').value = food.price;
	form.querySelector('select[name="category"]').value = food.category;
	form.querySelector('input[name="isVeg"]').checked = food.isVeg;

	showModal('editFoodModal');
}

// Update food item
document.getElementById('editFoodForm').addEventListener('submit', async (e) => {
	e.preventDefault();
	const formData = new FormData(e.target);
	const foodId = formData.get('foodId');

	try {
		// Explicitly set isVeg value
		formData.set('isVeg', formData.get('isVeg') === 'on');

		// Remove empty file input if no new image is selected
		if (formData.get('image').size === 0) {
			formData.delete('image');
		}

		const response = await fetch(`${API_URL}/api/food/${foodId}`, {
			method: 'PUT',
			headers: {
				'Authorization': `Bearer ${token}`
			},
			body: formData
		});

		if (response.ok) {
			closeModal('editFoodModal');
			await loadFoods();
			showNotification('Food item updated successfully', 'success');
		} else {
			const error = await response.json();
			showNotification(error.message || 'Error updating food item', 'error');
		}
	} catch (error) {
		console.error('Error updating food:', error);
		showNotification('Error updating food item', 'error');
	}
});


// Delete food item
async function deleteFood(foodId) {
	if (!confirm('Are you sure you want to delete this food item?')) return;

	try {
		const response = await fetch(`${API_URL}/api/food/${foodId}`, {
			method: 'DELETE',
			headers: { 'Authorization': `Bearer ${token}` }
		});

		if (response.ok) {
			loadFoods();
		}
	} catch (error) {
		console.error('Error deleting food:', error);
	}
}

// Update order status function
async function updateOrderStatus(orderId, status) {
	try {
		if (!orderId || typeof orderId !== 'string' || !/^[0-9a-fA-F]{24}$/.test(orderId)) {
			throw new Error('Invalid order ID format');
		}

		const response = await fetch(`${API_URL}/api/order/${orderId}/status`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${token}`
			},
			body: JSON.stringify({ status })
		});

		if (!response.ok) {
			throw new Error('Failed to update order status');
		}

		await loadOrders(); // Refresh orders list
		showNotification('Order status updated successfully', 'success');
	} catch (error) {
		console.error('Error updating order status:', error);
		showNotification(error.message || 'Error updating order status', 'error');
	}
}

// Update the order status event handler in the order details modal
document.getElementById('orderDetailsModal').querySelector('button[onclick="updateOrderStatus()"]')
	.addEventListener('click', function() {
		const orderId = this.closest('.modal-content').querySelector('#orderDetails .order-item')?.dataset.orderId;
		const status = document.getElementById('orderStatus').value;
		if (orderId) {
			updateOrderStatus(orderId, status);
		}
	});


// Load users
async function loadUsers() {
	try {
		const response = await fetch(`${API_URL}/api/auth/users`, {
			headers: { 'Authorization': `Bearer ${token}` }
		});
		users = await response.json();
		displayUsers();
	} catch (error) {
		console.error('Error loading users:', error);
	}
}

function displayUsers() {
	userList.innerHTML = users.map(user => `
		<div class="user-item">
			<h3>${user.name}</h3>
			<p>Email: ${user.email}</p>
			<p>Phone: ${user.phone || 'Not provided'}</p>
			<p>Orders: ${user.orderCount || 0}</p>
			<button onclick="viewUserOrders('${user._id}')" class="view-btn">View Orders</button>
		</div>
	`).join('');
}

// Load analytics
async function loadAnalytics() {
	try {
		const response = await fetch(`${API_URL}/api/order/analytics`, {
			headers: { 'Authorization': `Bearer ${token}` }
		});
		
		if (!response.ok) {
			throw new Error('Failed to load analytics');
		}
		
		analytics = await response.json();
		displayAnalytics();
	} catch (error) {
		console.error('Error loading analytics:', error);
		showNotification('Error loading analytics', 'error');
	}
}

function displayAnalytics() {
	if (!analytics) return;
	
	document.getElementById('totalRevenue').textContent = `₹${analytics.totalRevenue.toFixed(2)}`;
	document.getElementById('totalOrders').textContent = analytics.totalOrders;
	document.getElementById('activeUsers').textContent = users.length;

	// Create chart data
	const orderStatusData = {
		labels: Object.keys(analytics.orderStatus),
		values: Object.values(analytics.orderStatus)
	};

	const paymentMethodData = {
		labels: Object.keys(analytics.paymentMethods),
		values: Object.values(analytics.paymentMethods)
	};

	updateCharts(orderStatusData, paymentMethodData);
}

function updateCharts(orderData, paymentData) {
	try {
		const revenueCtx = document.getElementById('revenueChart')?.getContext('2d');
		const ordersCtx = document.getElementById('ordersChart')?.getContext('2d');

		if (!revenueCtx || !ordersCtx) {
			throw new Error('Chart contexts not found');
		}

		// Clean up existing charts
		if (revenueChart) revenueChart.destroy();
		if (ordersChart) ordersChart.destroy();

		// Payment Methods Chart (Revenue)
		revenueChart = new Chart(revenueCtx, {
			type: 'pie',
			data: {
				labels: paymentData.labels,
				datasets: [{
					data: paymentData.values,
					backgroundColor: ['#2ecc71', '#e74c3c', '#3498db', '#f1c40f'],
					borderWidth: 1
				}]
			},
			options: {
				responsive: true,
				maintainAspectRatio: true,
				plugins: {
					title: {
						display: true,
						text: 'Payment Methods Distribution',
						font: {
							size: 16
						}
					},
					legend: {
						position: 'bottom'
					}
				}
			}
		});

		// Order Status Chart
		ordersChart = new Chart(ordersCtx, {
			type: 'bar',
			data: {
				labels: orderData.labels,
				datasets: [{
					label: 'Orders by Status',
					data: orderData.values,
					backgroundColor: '#3498db',
					borderWidth: 1
				}]
			},
			options: {
				responsive: true,
				maintainAspectRatio: true,
				plugins: {
					title: {
						display: true,
						text: 'Order Status Distribution',
						font: {
							size: 16
						}
					},
					legend: {
						position: 'bottom'
					}
				},
				scales: {
					y: {
						beginAtZero: true,
						ticks: {
							stepSize: 1,
							precision: 0
						}
					}
				}
			}
		});
	} catch (error) {
		console.error('Error updating charts:', error);
		showNotification('Error updating analytics charts', 'error');
	}
}


// Show/hide sections
function showSection(sectionName) {
	const sections = ['foods', 'orders', 'users', 'analytics'];
	sections.forEach(section => {
		const sectionElement = document.getElementById(`${section}-section`);
		if (sectionElement) {
			sectionElement.style.display = sectionName === section ? 'block' : 'none';
		}
	});

	// Load section data with proper error handling
	try {
		switch(sectionName) {
			case 'orders':
				loadOrders();
				break;
			case 'users':
				loadUsers();
				break;
			case 'analytics':
				loadAnalytics();
				break;
			case 'foods':
				loadFoods();
				break;
		}
	} catch (error) {
		console.error('Error loading section:', error);
		showNotification(`Error loading ${sectionName} section`, 'error');
	}
}

// Modal functions
function showModal(modalId) {
	document.getElementById(modalId).style.display = 'block';
}

function closeModal(modalId) {
	document.getElementById(modalId).style.display = 'none';
}

// Update logout handler
if (logoutBtn) {
	logoutBtn.onclick = () => {
		localStorage.removeItem('token');
		localStorage.removeItem('user');
		window.location.href = 'admin-login.html';
	};
}

// Add notification function
function showNotification(message, type = 'success') {
	const notification = document.createElement('div');
	notification.className = `notification ${type}`;
	notification.textContent = message;
	document.body.appendChild(notification);
	setTimeout(() => notification.remove(), 3000);
}

// Initialize admin panel
async function initializeAdmin() {
	if (isAuthenticating) return;
	isAuthenticating = true;

	if (!checkAdminAuth()) {
		isAuthenticating = false;
		return;
	}

	try {
		const response = await fetchWithAuth(`${API_URL}/api/auth/profile`);
		if (!response) return;

		const userData = await response.json();
		if (!userData.isAdmin) {
			throw new Error('Not an admin user');
		}

		await loadFoods();
		showSection('foods');
		setupEventListeners();
	} catch (error) {
		console.error('Authentication error:', error);
		localStorage.removeItem('token');
		localStorage.removeItem('user');
		window.location.replace('./admin-login.html');
	} finally {
		isAuthenticating = false;
	}
}



function setupEventListeners() {
	// Category filter
	categoryFilter.addEventListener('change', (e) => loadFoods(e.target.value));

	// Order filters
	orderStatusFilter.addEventListener('change', () => {
		loadOrders(orderStatusFilter.value, orderDateFilter.value);
	});
	orderDateFilter.addEventListener('change', () => {
		loadOrders(orderStatusFilter.value, orderDateFilter.value);
	});

	// Logout
	logoutBtn.addEventListener('click', () => {
		localStorage.removeItem('token');
		localStorage.removeItem('user');
		window.location.href = '/';
	});

	// Modal close
	window.addEventListener('click', (event) => {
		if (event.target.classList.contains('modal')) {
			event.target.style.display = 'none';
		}
	});
}

// Add viewUserOrders function
async function viewUserOrders(userId) {
	try {
		if (!userId || typeof userId !== 'string' || !/^[0-9a-fA-F]{24}$/.test(userId)) {
			throw new Error('Invalid user ID format');
		}

		// Use the main orders endpoint with a user filter
		const response = await fetch(`${API_URL}/api/order?userId=${userId}`, {
			headers: {
				'Authorization': `Bearer ${token}`,
				'Accept': 'application/json'
			}
		});
		
		if (!response.ok) {
			throw new Error('Failed to fetch user orders');
		}
		
		const userOrders = await response.json();
		
		// Display orders in modal
		const orderDetails = document.getElementById('orderDetails');
		
		if (!userOrders || userOrders.length === 0) {
			orderDetails.innerHTML = '<p>No orders found for this user.</p>';
		} else {
			orderDetails.innerHTML = `
				<div class="user-orders">
					${userOrders.map(order => `
						<div class="order-item">
							<div class="order-header">
								<span>Order #${order._id}</span>
								<span class="status-${order.status}">${order.status}</span>
							</div>
							<div class="order-items">
								${order.items.map(item => `
									<div class="item">
										${item.food?.name || 'Unknown Item'} x ${item.quantity} - ₹${((item.price || 0) * item.quantity).toFixed(2)}
									</div>
								`).join('')}
							</div>
							<div class="order-footer">
								<span>Total: ₹${(order.total || 0).toFixed(2)}</span>
								<span>Date: ${new Date(order.createdAt).toLocaleDateString()}</span>
							</div>
						</div>
					`).join('')}
				</div>
			`;
		}
		
		showModal('orderDetailsModal');
	} catch (error) {
		console.error('Error viewing user orders:', error);
		showNotification(error.message || 'Error fetching user orders', 'error');
	}
}

// Add viewOrderDetails function
async function viewOrderDetails(orderId) {
	try {
		if (!orderId || typeof orderId !== 'string' || !/^[0-9a-fA-F]{24}$/.test(orderId)) {
			throw new Error('Invalid order ID format');
		}

		const order = orders.find(o => o._id === orderId);
		if (!order) {
			throw new Error('Order not found');
		}

		const orderDetails = document.getElementById('orderDetails');
		const orderStatusSelect = document.getElementById('orderStatus');

		// Update order status select
		orderStatusSelect.value = order.status;

		// Display order details
		orderDetails.innerHTML = `
			<div class="order-detail-section">
				<h3>Customer Information</h3>
				<p>Name: ${order.user?.name || 'Unknown User'}</p>
				<p>Phone: ${order.user?.phone || 'No Phone'}</p>
				<p>Address: ${order.deliveryAddress || 'No Address'}</p>
			</div>
			<div class="order-detail-section">
				<h3>Order Items</h3>
				${order.items.map(item => `
					<div class="order-item-detail">
						<p>${item.food?.name || 'Unknown Item'} x ${item.quantity}</p>
						<p>Price: ₹${((item.price || 0) * item.quantity).toFixed(2)}</p>
					</div>
				`).join('')}
			</div>
			<div class="order-detail-section">
				<h3>Payment Information</h3>
				<p>Method: ${order.paymentMethod || 'Not specified'}</p>
				<p>Status: ${order.paymentStatus || 'Unknown'}</p>
				<p>Total Amount: ₹${(order.total || 0).toFixed(2)}</p>
			</div>
			<div class="order-detail-section">
				<h3>Order Timeline</h3>
				<p>Created: ${new Date(order.createdAt).toLocaleString()}</p>
				<p>Last Updated: ${new Date(order.updatedAt).toLocaleString()}</p>
			</div>
		`;

		showModal('orderDetailsModal');
	} catch (error) {
		console.error('Error viewing order details:', error);
		showNotification(error.message || 'Error viewing order details', 'error');
	}
}

// Make functions globally available
window.filterFoods = filterFoods;
window.filterOrders = filterOrders;
window.showSection = showSection;
window.showModal = showModal;
window.closeModal = closeModal;
window.editFood = editFood;
window.viewOrderDetails = viewOrderDetails;
window.deleteFood = deleteFood;
window.updateOrderStatus = updateOrderStatus;
window.viewUserOrders = viewUserOrders;

// Admin Login Form Handler
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            if (!data.user.isAdmin) {
                document.getElementById('loginError').style.display = 'block';
                document.getElementById('loginError').textContent = 'Access denied. Admin privileges required.';
                return;
            }

            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            document.getElementById('loginSection').style.display = 'none';
            document.getElementById('adminContent').style.display = 'block';
            await initializeAdmin();
        } else {
            document.getElementById('loginError').style.display = 'block';
            document.getElementById('loginError').textContent = data.message || 'Invalid credentials';
        }
    } catch (error) {
        console.error('Login error:', error);
        document.getElementById('loginError').style.display = 'block';
        document.getElementById('loginError').textContent = 'Error during login. Please try again.';
    }
});

// Update DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', async () => {
	try {
		const token = localStorage.getItem('token');
		const user = JSON.parse(localStorage.getItem('user') || 'null');

		if (!token || !user || !user.isAdmin) {
			window.location.href = 'admin-login.html';
			return;
		}

		// Verify token and admin status
		const response = await fetch(`${API_URL}/api/auth/profile`, {
			headers: {
				'Authorization': `Bearer ${token}`
			}
		});

		if (!response.ok) {
			throw new Error('Invalid token');
		}

		const userData = await response.json();
		if (!userData.isAdmin) {
			throw new Error('Not an admin user');
		}

		// Initialize admin panel
		await loadFoods();
		showSection('foods');
		setupEventListeners();
	} catch (error) {
		console.error('Authentication error:', error);
		localStorage.removeItem('token');
		localStorage.removeItem('user');
		window.location.href = 'admin-login.html';
	}
});