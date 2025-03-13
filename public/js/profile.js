// Default profile image as base64 SVG - only declare if not already defined
if (typeof window.DEFAULT_PROFILE_IMAGE === 'undefined') {
    window.DEFAULT_PROFILE_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNTAiIGhlaWdodD0iMTUwIiB2aWV3Qm94PSIwIDAgMTUwIDE1MCI+PHJlY3Qgd2lkdGg9IjE1MCIgaGVpZ2h0PSIxNTAiIGZpbGw9IiNlMGUwZTAiLz48dGV4dCB4PSI3NSIgeT0iNzUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtc2l6ZT0iNTAiIGZpbGw9IiM5OTkiPlU8L3RleHQ+PC9zdmc+';}

// Add showNotification function
function showNotification(message, type = 'success') {
	const notificationDiv = document.createElement('div');
	notificationDiv.className = `notification ${type}`;
	notificationDiv.textContent = message;
	document.body.appendChild(notificationDiv);
	setTimeout(() => notificationDiv.remove(), 3000);
}

document.addEventListener('DOMContentLoaded', () => {
	const profilePage = document.getElementById('profilePage');
	const profileLink = document.getElementById('profileLink');
	window.notifications = [];
	window.unreadCount = 0;

	// Add click handler for profile link
	if (profileLink) {
		profileLink.addEventListener('click', async (e) => {
			e.preventDefault();
			await loadUserProfile();
		});
	}

	// Update loadUserProfile function
	async function loadUserProfile() {
		try {
			const token = localStorage.getItem('token');
			if (!token) {
				showNotification('Please login to view your profile.', 'warning');
				return;
			}

			const response = await fetch(`${API_URL}/api/auth/profile`, {
				headers: {
					'Authorization': `Bearer ${token}`
				}
			});

			if (!response.ok) {
				throw new Error('Failed to load profile');
			}

			const userData = await response.json();

			// Hide all sections first
			document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));

			// Hide hero and food menu sections with null checks
			const heroSection = document.querySelector('.hero');
			const foodMenuSection = document.querySelector('#foodMenu');

			if (heroSection) heroSection.style.display = 'none';
			if (foodMenuSection) foodMenuSection.style.display = 'none';

			// Show profile section
			const profilePage = document.getElementById('profilePage');
			if (profilePage) {
				profilePage.classList.add('active');
				profilePage.style.display = 'block';
			}

			// Update profile information
			updateProfileUI(userData);

		} catch (error) {
			console.error('Error loading profile:', error);
			showNotification('Error loading profile', 'error');
		}
	}

	// Handle image upload
	async function handleImageUpload(file) {
		if (!file) return;

		if (file.size > 5 * 1024 * 1024) {
			showNotification('File size too large. Maximum size is 5MB.', 'error');
			return;
		}

		const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
		if (!allowedTypes.includes(file.type)) {
			showNotification('Only .png, .jpg and .jpeg format allowed!', 'error');
			return;
		}

		const formData = new FormData();
		formData.append('image', file);

		try {
			const profileImage = document.getElementById('profileImage');
			profileImage.style.opacity = '0.5';

			const response = await fetch(`${API_URL}/api/auth/profile/image`, {
				method: 'PUT',
				headers: {
					'Authorization': `Bearer ${localStorage.getItem('token')}`
				},
				body: formData
			});

			const result = await response.json();

			if (response.ok) {
				profileImage.src = result.image;
				showNotification('Profile image updated successfully', 'success');

				// Update user data and UI
				const userData = JSON.parse(localStorage.getItem('user'));
				if (userData) {
					userData.image = result.image;
					localStorage.setItem('user', JSON.stringify(userData));
					if (typeof updateUI === 'function') {
						updateUI();
					}
				}
			} else {
				throw new Error(result.message || 'Failed to update profile image');
			}
		} catch (error) {
			console.error('Error updating profile image:', error);
			showNotification(error.message, 'error');
		} finally {
			const profileImage = document.getElementById('profileImage');
			profileImage.style.opacity = '1';
		}
	}

	// Add event listener for image upload
	document.addEventListener('click', (e) => {
		if (e.target.closest('.upload-btn')) {
			const input = document.createElement('input');
			input.type = 'file';
			input.accept = 'image/*';
			input.onchange = (e) => handleImageUpload(e.target.files[0]);
			input.click();
		}
	});
});



// Update profile content function
function updateProfileContent(userData) {
    const profileContent = document.getElementById('profileContent');
    if (!profileContent) return;

    profileContent.innerHTML = `
        <div class="profile-container">
            <div class="profile-header">
                <img src="${userData.image || window.DEFAULT_PROFILE_IMAGE}" alt="Profile" class="profile-avatar">
                <div class="profile-info">
                    <h2>${userData.name}</h2>
                    <p class="user-details"><strong>Username:</strong> ${userData.username}</p>
                    <p class="user-details"><strong>Email:</strong> ${userData.email}</p>
                    <p class="user-details"><strong>Phone:</strong> ${userData.phone}</p>
                    <button onclick="window.logout()" class="logout-btn">Logout</button>
                </div>
            </div>

            <div class="profile-stats">
                <div class="stat-card">
                    <h3>Total Orders</h3>
                    <p>${userData.orderCount || 0}</p>
                </div>
                <div class="stat-card">
                    <h3>Total Spent</h3>
                    <p>₹${(userData.totalSpent || 0).toFixed(2)}</p>
                </div>
                <div class="stat-card">
                    <h3>Saved Addresses</h3>
                    <p>${userData.addresses?.length || 0}</p>
                </div>
            </div>

            <div class="profile-addresses">
                <h3>Delivery Addresses</h3>
                <div class="address-grid">
                    ${userData.addresses && userData.addresses.length ? 
                        userData.addresses.map((addr, index) => `
                            <div class="address-card">
                                <div class="address-header">
                                    <h4>Address ${index + 1}</h4>
                                </div>
                                <div class="address-content">
                                    <p>${addr.street}</p>
                                    <p>${addr.city}, ${addr.state}</p>
                                    <p>PIN: ${addr.pincode}</p>
                                </div>
                            </div>
                        `).join('') : 
                        '<p class="no-data">No addresses added yet.</p>'
                    }
                </div>
            </div>

            <div class="order-history">
                <h3>Recent Orders</h3>
                <div class="order-list">
                    ${userData.orders && userData.orders.length ? 
                        userData.orders.map(order => `
                            <div class="order-card">
                                <div class="order-header">
                                    <span class="order-id">Order #${order._id}</span>
                                    <span class="order-status status-${order.status}">${order.status}</span>
                                </div>
                                <div class="order-items">
                                    ${order.items.map(item => `
                                        <div class="order-item-detail">
                                            <span>${item.food?.name || 'Unknown Item'} x ${item.quantity}</span>
                                            <span>₹${((item.price || 0) * item.quantity).toFixed(2)}</span>
                                        </div>
                                    `).join('')}
                                </div>
                                <div class="order-footer">
                                    <span class="order-total">Total: ₹${(order.total || 0).toFixed(2)}</span>
                                    <span class="order-date">${new Date(order.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        `).join('') :
                        '<p class="no-data">No orders yet.</p>'
                    }
                </div>
            </div>
        </div>
    `;
}

// Update profile UI function
function updateProfileUI(userData) {
    // Update profile image if available
    const profileImage = document.querySelector('#profilePage .profile-avatar');
    if (profileImage) {
        profileImage.src = userData.image || window.DEFAULT_PROFILE_IMAGE;
    }

    // Update profile content
    updateProfileContent(userData);

    // Show profile page
    const profilePage = document.getElementById('profilePage');
    if (profilePage) {
        profilePage.style.display = 'block';
    }

    // Update navigation menu if needed
    const profileLink = document.getElementById('profileLink');
    if (profileLink) {
        const profileLinkImage = profileLink.querySelector('img');
        if (profileLinkImage) {
            profileLinkImage.src = userData.image || window.DEFAULT_PROFILE_IMAGE;
        }
    }
}

// Ensure addToCart function is available
if (typeof window.addToCart === 'undefined') {
    console.warn('Cart functionality not available, loading cart.js...');
    const cartScript = document.createElement('script');
    cartScript.src = '/js/cart.js';
    document.head.appendChild(cartScript);
    cartScript.onload = () => console.log('Cart functionality loaded');
}



