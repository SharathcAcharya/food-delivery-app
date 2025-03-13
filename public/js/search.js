// Search and Filter functionality
let currentFilters = {
	search: '',
	category: '',
	isVeg: undefined,
	minPrice: undefined,
	maxPrice: undefined,
	sort: ''
};

// Initialize search functionality
function initializeSearch() {
	// Search input handler
	const searchInput = document.getElementById('searchInput');
	if (searchInput) {
		searchInput.addEventListener('input', debounce((e) => {
			currentFilters.search = e.target.value;
			updateFoodList();
		}, 300));
	}

	// Category filter handler
	const categorySelect = document.getElementById('categoryFilter');
	if (categorySelect) {
		categorySelect.addEventListener('change', (e) => {
			currentFilters.category = e.target.value;
			updateFoodList();
		});
	}

	// Veg/Non-veg filter handler
	const vegFilter = document.getElementById('vegFilter');
	if (vegFilter) {
		vegFilter.addEventListener('change', (e) => {
			currentFilters.isVeg = e.target.value === '' ? undefined : e.target.value === 'true';
			updateFoodList();
		});
	}

	// Price range handlers
	const minPriceInput = document.getElementById('minPrice');
	const maxPriceInput = document.getElementById('maxPrice');

	if (minPriceInput) {
		minPriceInput.addEventListener('change', (e) => {
			currentFilters.minPrice = e.target.value ? Number(e.target.value) : undefined;
			updateFoodList();
		});
	}

	if (maxPriceInput) {
		maxPriceInput.addEventListener('change', (e) => {
			currentFilters.maxPrice = e.target.value ? Number(e.target.value) : undefined;
			updateFoodList();
		});
	}

	// Sort handler
	const sortSelect = document.getElementById('sortFilter');
	if (sortSelect) {
		sortSelect.addEventListener('change', (e) => {
			currentFilters.sort = e.target.value;
			updateFoodList();
		});
	}
}

// Update food list based on filters
async function updateFoodList() {
	try {
		// Build query string from filters
		const queryParams = new URLSearchParams();
		Object.entries(currentFilters).forEach(([key, value]) => {
			if (value !== undefined && value !== '') {
				queryParams.append(key, value);
			}
		});

		// Fetch filtered results
		const response = await fetch(`${API_URL}/api/food?${queryParams.toString()}`);
		if (!response.ok) throw new Error('Failed to fetch food items');

		const foods = await response.json();
		displayFoodItems(foods);
	} catch (error) {
		console.error('Error updating food list:', error);
		showNotification('Error fetching food items', 'error');
	}
}

// Debounce helper function
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

// Initialize search when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeSearch);