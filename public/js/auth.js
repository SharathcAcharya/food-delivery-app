// API URL configuration
const API_URL = 'http://localhost:3005';

// Default profile image as base64 SVG - only declare if not already defined
if (typeof window.DEFAULT_PROFILE_IMAGE === 'undefined') {
	window.DEFAULT_PROFILE_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNTAiIGhlaWdodD0iMTUwIiB2aWV3Qm94PSIwIDAgMTUwIDE1MCI+PHJlY3Qgd2lkdGg9IjE1MCIgaGVpZ2h0PSIxNTAiIGZpbGw9IiNlMGUwZTAiLz48dGV4dCB4PSI3NSIgeT0iNzUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtc2l6ZT0iNTAiIGZpbGw9IiM5OTkiPlU8L3RleHQ+PC9zdmc+';}

// Global state
let currentUser = null;
let isLoggedIn = false;

// Initialize user state from localStorage
function initializeUserState() {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
        try {
            currentUser = JSON.parse(storedUser);
            if (currentUser && currentUser.isAdmin) {
                // Clear admin user data from regular user pages
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                currentUser = null;
                isLoggedIn = false;
            } else {
                isLoggedIn = true;
            }
        } catch (error) {
            console.error('Error parsing user data:', error);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            currentUser = null;
            isLoggedIn = false;
        }
    } else {
        currentUser = null;
        isLoggedIn = false;
    }
    
    updateUI(); // Update UI to reflect current state
}

// Call initializeUserState when the page loads
document.addEventListener('DOMContentLoaded', initializeUserState);

// WebSocket is initialized in main.js

// Modal functions
function showModal(modalId) {
	const modal = document.getElementById(modalId);
	if (modal) {
		modal.style.display = 'block';
		// Clear any previous error messages
		const errorMessages = modal.querySelectorAll('.error-message');
		errorMessages.forEach(msg => msg.style.display = 'none');
	}
}

function closeModal(modalId) {
	const modal = document.getElementById(modalId);
	if (modal) {
		modal.style.display = 'none';
		// Clear form inputs
		const form = modal.querySelector('form');
		if (form) form.reset();
	}
}

// DOM Elements with existence checks
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const profileImage = document.getElementById('profileImage');
const profilePreview = document.getElementById('profilePreview');
const profileLink = document.getElementById('profileLink');

// Add image preview functionality with error handling
if (profileImage && profilePreview) {
	profilePreview.src = window.DEFAULT_PROFILE_IMAGE;
	profilePreview.onerror = () => {
		profilePreview.src = window.DEFAULT_PROFILE_IMAGE;
	};

	profileImage.addEventListener('change', (e) => {
		const file = e.target.files[0];
		if (file) {
			if (file.size > 5 * 1024 * 1024) {
				showNotification('File size should be less than 5MB', 'error');
				return;
			}
			const reader = new FileReader();
			reader.onload = (e) => {
				profilePreview.src = e.target.result;
			};
			reader.onerror = () => {
				showNotification('Error reading file', 'error');
				profilePreview.src = window.DEFAULT_PROFILE_IMAGE;
			};
			reader.readAsDataURL(file);
		} else {
			profilePreview.src = window.DEFAULT_PROFILE_IMAGE;
		}
	});
}

// Event listeners for modal buttons - Add checks
if (loginBtn) {
	loginBtn.addEventListener('click', () => showModal('loginModal'));
}
if (registerBtn) {
	registerBtn.addEventListener('click', () => showModal('registerModal'));
}

// Login functionality with improved error handling
if (loginForm) {
	loginForm.addEventListener('submit', async (e) => {
		e.preventDefault();
		const username = loginForm.querySelector('input[name="username"]').value.trim();
		const password = loginForm.querySelector('input[name="password"]').value;

		if (!username || !password) {
			showNotification('Please fill in all fields', 'error');
			return;
		}

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
				if (data.user.isAdmin) {
					showNotification('Please use admin login page', 'error');
					return;
				}
				
				localStorage.setItem('token', data.token);
				localStorage.setItem('user', JSON.stringify(data.user));
				currentUser = data.user;
				isLoggedIn = true;
				updateUI();
				closeModal('loginModal');
				showNotification('Logged in successfully!', 'success');
				initializeOrderTracking();
			} else {
				showNotification(data.message || 'Invalid credentials', 'error');
			}
		} catch (error) {
			console.error('Login error:', error);
			showNotification('Error during login. Please try again.', 'error');
		}
	});
}

// Registration functionality with improved validation
if (registerForm) {
	registerForm.addEventListener('submit', async (e) => {
		e.preventDefault();
		const formData = new FormData(e.target);
		
		// Basic validation
		const username = formData.get('username').trim();
		const email = formData.get('email').trim();
		const password = formData.get('password');
		const phone = formData.get('phone').trim();
		const name = formData.get('name').trim();

		if (!username || !email || !password || !phone || !name) {
			showNotification('Please fill in all required fields', 'error');
			return;
		}

		if (password.length < 6) {
			showNotification('Password must be at least 6 characters long', 'error');
			return;
		}

		if (!/^\d{10}$/.test(phone)) {
			showNotification('Please enter a valid 10-digit phone number', 'error');
			return;
		}

		try {
			const response = await fetch(`${API_URL}/api/auth/register`, {
				method: 'POST',
				body: formData,
				headers: {
					'Accept': 'application/json'
				}
			});

			const data = await response.json();

			if (response.ok) {
				showNotification('Registration successful! Please login.', 'success');
				closeModal('registerModal');
				if (loginForm) {
					loginForm.querySelector('input[name="username"]').value = username;
					loginForm.querySelector('input[name="password"]').value = '';
				}
				showModal('loginModal');
			} else {
				showNotification(data.message || 'Registration failed', 'error');
			}
		} catch (error) {
			console.error('Registration error:', error);
			showNotification('Error during registration. Please try again.', 'error');
		}
	});
}

// Update UI based on login state
function updateUI() {
	const authButtons = document.getElementById('authButtons');
	const userMenu = document.getElementById('userMenu');
	const userImage = document.getElementById('userImage');
	const userName = document.getElementById('userName');

	if (isLoggedIn && currentUser) {
		if (authButtons) authButtons.style.display = 'none';
		if (userMenu) {
			userMenu.style.display = 'flex';
			if (userImage) userImage.src = currentUser.image || window.DEFAULT_PROFILE_IMAGE;
			if (userName) userName.textContent = currentUser.name;
		}
	} else {
		if (authButtons) authButtons.style.display = 'flex';
		if (userMenu) userMenu.style.display = 'none';
	}
}

// Logout function
window.logout = function() {
	localStorage.removeItem('token');
	localStorage.removeItem('user');
	currentUser = null;
	isLoggedIn = false;
	updateUI();
	showNotification('Logged out successfully', 'success');
	// Redirect to home page
	window.location.href = '/';
}

// Make auth state available globally
window.isLoggedIn = isLoggedIn;
window.currentUser = currentUser;
window.initializeUserState = initializeUserState;
window.showModal = showModal;
window.closeModal = closeModal;