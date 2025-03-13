// Language utility module
let currentLanguage = localStorage.getItem('language') || 'en';
let translations = {};

// Load translations dynamically
async function loadTranslations() {
    try {
        const [enModule, esModule] = await Promise.all([
            import('./translations/en.js'),
            import('./translations/es.js')
        ]);
        
        translations = {
            en: enModule.default,
            es: esModule.default
        };
    } catch (error) {
        console.error('Error loading translations:', error);
    }
}

// Initialize translations
loadTranslations();

// Get translation for a key (supports nested keys like 'nav.home')
function t(key) {
    const keys = key.split('.');
    let value = translations[currentLanguage];
    
    for (const k of keys) {
        if (value && value[k]) {
            value = value[k];
        } else {
            console.warn(`Translation missing for key: ${key} in language: ${currentLanguage}`);
            return key;
        }
    }
    
    return value;
}

// Change language
function setLanguage(lang) {
    if (['en', 'es'].includes(lang)) {
        currentLanguage = lang;
        localStorage.setItem('language', lang);
        document.documentElement.lang = lang;
        updatePageContent();
    }
}

// Update all translatable content on the page
function updatePageContent() {
    // Update navigation items
    document.querySelector('.nav-items a[href="#"]').textContent = t('nav.home');
    document.querySelector('.nav-items a[href="#menu"]').textContent = t('nav.menu');
    document.querySelector('#cartBtn').innerHTML = `<i class="fas fa-shopping-cart"></i> ${t('nav.cart')} <span id="cartCount">0</span>`;
    document.querySelector('#profileLink').innerHTML = `
        <img src="${document.querySelector('#profileLink img').src}" alt="${t('nav.profile')}" class="profile-pic">
        ${t('nav.profile')}
    `;
    document.querySelector('#loginBtn').textContent = t('nav.login');
    document.querySelector('#registerBtn').textContent = t('nav.register');

    // Update hero section
    document.querySelector('.hero-content h1').textContent = t('hero.title');
    document.querySelector('.hero-content p').textContent = t('hero.subtitle');
    document.querySelector('.hero-content .cta-button').textContent = t('hero.cta');

    // Update menu section
    document.querySelector('#menu h2').textContent = t('menu.title');
    document.querySelector('#searchInput').placeholder = t('menu.search');

    // Update filter labels and options
    document.querySelectorAll('.filter-label').forEach(label => {
        if (label.textContent.includes('Category')) {
            label.textContent = t('menu.filters.category');
        } else if (label.textContent.includes('Price Range')) {
            label.textContent = t('menu.filters.priceRange');
        } else if (label.textContent.includes('Dietary')) {
            label.textContent = t('menu.filters.dietary');
        }
    });

    // Update select options
    const categoryFilter = document.querySelector('#categoryFilter');
    if (categoryFilter) {
        categoryFilter.options[0].text = t('menu.filters.allCategories');
        // Update other category options...
    }

    // Dispatch event to notify components of language change
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: currentLanguage } }));
}

// Export the module
export { t, setLanguage, currentLanguage };