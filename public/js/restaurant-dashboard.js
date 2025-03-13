// Restaurant Dashboard JavaScript
const restaurantDashboard = {
    restaurants: [],
    currentRestaurant: null,
    charts: {
        revenue: null,
        orders: null,
        popularItems: null
    },

    // Initialize the dashboard
    async init() {
        await this.loadRestaurants();
        this.setupEventListeners();
        this.initializeCharts();
    },

    // Load all restaurants
    async loadRestaurants() {
        try {
            const response = await fetchWithAuth(`${API_URL}/api/restaurant`);
            if (response) {
                this.restaurants = await response.json();
                this.displayRestaurants();
            }
        } catch (error) {
            console.error('Error loading restaurants:', error);
            showNotification('Error loading restaurants', 'error');
        }
    },

    // Display restaurants list
    displayRestaurants() {
        const container = document.getElementById('restaurantsList');
        if (!container) return;

        container.innerHTML = this.restaurants.map(restaurant => `
            <div class="restaurant-card">
                <div class="restaurant-header">
                    <h3>${restaurant.name}</h3>
                    <span class="${restaurant.isActive ? 'status-active' : 'status-inactive'}">
                        ${restaurant.isActive ? 'Active' : 'Inactive'}
                    </span>
                </div>
                <div class="restaurant-info">
                    <p>${restaurant.description || 'No description available'}</p>
                    <p>Location: ${restaurant.address.city}, ${restaurant.address.state}</p>
                </div>
                <div class="restaurant-actions">
                    <button onclick="restaurantDashboard.viewAnalytics('${restaurant._id}')" class="view-btn">
                        View Analytics
                    </button>
                    <button onclick="restaurantDashboard.editRestaurant('${restaurant._id}')" class="edit-btn">
                        Edit
                    </button>
                </div>
            </div>
        `).join('');
    },

    // View restaurant analytics
    async viewAnalytics(restaurantId) {
        try {
            const response = await fetchWithAuth(`${API_URL}/api/restaurant/${restaurantId}/analytics`);
            if (response) {
                const analytics = await response.json();
                this.currentRestaurant = this.restaurants.find(r => r._id === restaurantId);
                this.displayAnalytics(analytics);
            }
        } catch (error) {
            console.error('Error loading analytics:', error);
            showNotification('Error loading analytics', 'error');
        }
    },

    // Display analytics data
    displayAnalytics(analytics) {
        const container = document.getElementById('restaurantAnalytics');
        if (!container) return;

        // Update overview cards
        document.getElementById('totalRevenue').textContent = `₹${analytics.metrics.totalRevenue.toFixed(2)}`;
        document.getElementById('totalOrders').textContent = analytics.metrics.totalOrders;
        document.getElementById('avgOrderValue').textContent = `₹${analytics.metrics.averageOrderValue.toFixed(2)}`;
        document.getElementById('rating').textContent = `${analytics.rating.toFixed(1)} (${analytics.totalRatings} reviews)`;

        // Update charts
        this.updateCharts(analytics);

        // Show analytics section
        container.style.display = 'block';
    },

    // Initialize charts
    initializeCharts() {
        const ctx = {
            revenue: document.getElementById('revenueChart')?.getContext('2d'),
            orders: document.getElementById('ordersChart')?.getContext('2d'),
            popular: document.getElementById('popularItemsChart')?.getContext('2d')
        };

        if (ctx.revenue) {
            this.charts.revenue = new Chart(ctx.revenue, {
                type: 'line',
                data: { labels: [], datasets: [] },
                options: {
                    responsive: true,
                    plugins: {
                        title: { display: true, text: 'Revenue Trend' }
                    }
                }
            });
        }

        if (ctx.orders) {
            this.charts.orders = new Chart(ctx.orders, {
                type: 'bar',
                data: { labels: [], datasets: [] },
                options: {
                    responsive: true,
                    plugins: {
                        title: { display: true, text: 'Orders by Status' }
                    }
                }
            });
        }

        if (ctx.popular) {
            this.charts.popularItems = new Chart(ctx.popular, {
                type: 'bar',
                data: { labels: [], datasets: [] },
                options: {
                    responsive: true,
                    plugins: {
                        title: { display: true, text: 'Popular Items' }
                    }
                }
            });
        }
    },

    // Update charts with new data
    updateCharts(analytics) {
        // Update orders by status chart
        if (this.charts.orders) {
            const orderData = analytics.metrics.ordersByStatus;
            this.charts.orders.data = {
                labels: Object.keys(orderData),
                datasets: [{
                    label: 'Orders',
                    data: Object.values(orderData),
                    backgroundColor: '#4CAF50'
                }]
            };
            this.charts.orders.update();
        }

        // Update popular items chart
        if (this.charts.popularItems && analytics.metrics.popularItems.length > 0) {
            const popularItems = analytics.metrics.popularItems
                .sort((a, b) => b.orderCount - a.orderCount)
                .slice(0, 10);

            this.charts.popularItems.data = {
                labels: popularItems.map(item => item.foodId.name),
                datasets: [{
                    label: 'Orders',
                    data: popularItems.map(item => item.orderCount),
                    backgroundColor: '#2196F3'
                }]
            };
            this.charts.popularItems.update();
        }
    },

    // Setup event listeners
    setupEventListeners() {
        // Add event listeners for date range filters, etc.
        const dateFilter = document.getElementById('dateRangeFilter');
        if (dateFilter) {
            dateFilter.addEventListener('change', (e) => {
                if (this.currentRestaurant) {
                    this.viewAnalytics(this.currentRestaurant._id);
                }
            });
        }
    }
};

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    restaurantDashboard.init();
});