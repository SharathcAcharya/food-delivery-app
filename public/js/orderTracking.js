// Order tracking functionality
let map = null;
let marker = null;
let trackingInterval = null;

// Initialize tracking map
async function initializeTrackingMap(orderId, containerId) {
    try {
        if (!google || !google.maps) {
            throw new Error('Google Maps not loaded');
        }

        // Get order details
        const response = await fetch(`${API_URL}/api/order/${orderId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error('Failed to fetch order details');
        const order = await response.json();

        // Initialize map
        const mapContainer = document.getElementById(containerId);
        if (!mapContainer) throw new Error('Map container not found');

        const deliveryLocation = {
            lat: parseFloat(order.deliveryAddress.latitude) || 12.9716,
            lng: parseFloat(order.deliveryAddress.longitude) || 77.5946
        };

        map = new google.maps.Map(mapContainer, {
            zoom: 15,
            center: deliveryLocation,
            styles: [
                {
                    featureType: 'poi',
                    elementType: 'labels',
                    stylers: [{ visibility: 'off' }]
                }
            ]
        });

        // Add delivery location marker
        new google.maps.Marker({
            position: deliveryLocation,
            map: map,
            icon: {
                url: '/images/home-marker.png',
                scaledSize: new google.maps.Size(40, 40)
            },
            title: 'Delivery Location'
        });

        // Initialize delivery person marker
        marker = new google.maps.Marker({
            map: map,
            icon: {
                url: '/images/delivery-marker.png',
                scaledSize: new google.maps.Size(40, 40)
            },
            title: 'Delivery Person'
        });

        // Start tracking updates
        startTracking(orderId);
    } catch (error) {
        console.error('Error initializing tracking map:', error);
        showNotification('Error initializing tracking map', 'error');
    }
}

// Start real-time tracking
function startTracking(orderId) {
    if (trackingInterval) clearInterval(trackingInterval);

    // Update every 30 seconds
    trackingInterval = setInterval(async () => {
        try {
            const response = await fetch(`${API_URL}/api/order/${orderId}/location`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) throw new Error('Failed to fetch location update');
            const data = await response.json();

            // Update marker position
            if (marker && data.location) {
                const position = new google.maps.LatLng(
                    data.location.latitude,
                    data.location.longitude
                );
                marker.setPosition(position);
                map.panTo(position);

                // Update ETA
                if (data.eta) {
                    updateETA(data.eta);
                }
            }

            // Stop tracking if order is delivered
            if (data.status === 'delivered') {
                stopTracking();
                showNotification('Order delivered!', 'success');
            }
        } catch (error) {
            console.error('Error updating location:', error);
        }
    }, 30000);
}

// Stop tracking updates
function stopTracking() {
    if (trackingInterval) {
        clearInterval(trackingInterval);
        trackingInterval = null;
    }
}

// Update estimated delivery time
function updateETA(eta) {
    const etaElement = document.getElementById('deliveryETA');
    if (etaElement) {
        const etaTime = new Date(eta).toLocaleTimeString();
        etaElement.textContent = `Estimated delivery by ${etaTime}`;
    }
}

// Update order status in UI
function updateOrderStatus(status) {
    const statusElement = document.getElementById('orderStatus');
    if (statusElement) {
        statusElement.textContent = status.replace('_', ' ').toUpperCase();
        statusElement.className = `status ${status}`;
    }
}

// Export functions
window.initializeTrackingMap = initializeTrackingMap;
window.stopTracking = stopTracking;