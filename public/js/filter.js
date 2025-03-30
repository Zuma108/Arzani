import { loadPage } from './marketplace.js';

class BusinessFilters {
    constructor() {
        this.filterTimeout = null;
        this.init();
    }

    init() {
        document.addEventListener('DOMContentLoaded', () => {
            this.setupElements();
            this.setupEventListeners();
        });
    }

    setupElements() {
        this.locationInput = document.getElementById('locationInput');
        this.industryCheckboxes = document.querySelectorAll('.industry-checkbox');
        this.priceRangeRadios = document.querySelectorAll('input[name="priceRange"]');
        this.revenueRangeRadios = document.querySelectorAll('input[name="revenueRange"]');
        this.cashflowRangeRadios = document.querySelectorAll('input[name="cashflowRange"]');
        this.clearBtn = document.querySelector('.clear-btn');
    }

    setupEventListeners() {
        // Location dropdown items
        document.querySelectorAll('.location-item').forEach(item => {
            item.addEventListener('click', () => {
                this.locationInput.value = item.textContent;
                this.autoFilter();
            });
        });

        // Text input change
        this.locationInput?.addEventListener('input', () => this.autoFilter());

        // Checkbox & radio changes
        this.industryCheckboxes?.forEach(cb => cb.addEventListener('change', () => this.autoFilter()));
        this.priceRangeRadios?.forEach(rb => rb.addEventListener('change', () => this.autoFilter()));
        this.revenueRangeRadios?.forEach(rb => rb.addEventListener('change', () => this.autoFilter()));
        this.cashflowRangeRadios?.forEach(rb => rb.addEventListener('change', () => this.autoFilter()));

        // Clear filters
        this.clearBtn?.addEventListener('click', () => this.handleClearFilters());
    }

    autoFilter() {
        if (this.filterTimeout) {
            clearTimeout(this.filterTimeout);
        }

        this.filterTimeout = setTimeout(() => {
            const filters = {
                location: this.locationInput?.value || '',
                industries: [...this.industryCheckboxes]
                    .filter(cb => cb.checked)
                    .map(cb => cb.value)
                    .join(','),
                priceRange: [...this.priceRangeRadios].find(rb => rb.checked)?.value || '',
                revenueRange: [...this.revenueRangeRadios].find(rb => rb.checked)?.value || '',
                cashflowRange: [...this.cashflowRangeRadios].find(rb => rb.checked)?.value || ''
            };

            loadPage(1, filters);
        }, 300);
    }

    handleClearFilters() {
        this.industryCheckboxes?.forEach(cb => cb.checked = false);
        this.priceRangeRadios?.forEach(rb => rb.checked = false);
        this.revenueRangeRadios?.forEach(rb => rb.checked = false);
        this.cashflowRangeRadios?.forEach(rb => rb.checked = false);
        if (this.locationInput) this.locationInput.value = '';
        this.autoFilter();
    }
}

// Initialize filters once
new BusinessFilters();

// Industry options array
const industries = [
    'Agriculture',
    'Automotive & Boat',
    'Beauty & Personal Care',
    'Building & Construction',
    'Communication & Media',
    'Education & Children',
    'Entertainment & Recreation',
    'Financial Services',
    'Health Care & Fitness',
    'Manufacturing',
    'Online & Technology',
    'Pet Services',
    'Restaurants & Food',
    'Retail',
    'Service Businesses',
    'Transportation & Storage',
    'Travel',
    'Wholesale & Distributors',
    'Other'
];

// Example of applying filters to a separate endpoint
async function applyFilters() {
    try {
        const response = await fetch('/api/business/listings/filter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(filterState)
        });
        if (!response.ok) throw new Error('Filter request failed');

        const data = await response.json();
        renderBusinesses(data.businesses);
        renderPaginationControls(1, data.totalPages);
    } catch (error) {
        console.error('Error applying filters:', error);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing filters...');
    
    // Initialize dropdown toggles
    const dropdownToggles = document.querySelectorAll('.dropdown-toggle');
    
    // Handle dropdown toggle clicks
    dropdownToggles.forEach(toggle => {
        toggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const dropdown = this.closest('.dropdown');
            const menu = dropdown.querySelector('.dropdown-menu');
            
            // Close other dropdowns
            document.querySelectorAll('.dropdown-menu.show').forEach(openMenu => {
                // Don't close this dropdown if it's the one we're toggling
                if(openMenu !== menu) {
                    openMenu.classList.remove('show');
                }
            });
            
            // Toggle this dropdown
            menu.classList.toggle('show');
            console.log('Toggled dropdown menu:', menu.classList.contains('show'));
        });
    });
    
    // Handle selection in dropdowns
    document.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const dropdown = this.closest('.dropdown');
            const toggle = dropdown.querySelector('.dropdown-toggle');
            const menu = dropdown.querySelector('.dropdown-menu');
            
            // Handle checkbox selection for multi-select dropdowns
            if (this.querySelector('input[type="checkbox"]')) {
                const checkbox = this.querySelector('input[type="checkbox"]');
                checkbox.checked = !checkbox.checked;
                e.preventDefault(); // Prevent default to handle checkbox manually
                
                // Update the dropdown toggle text to show selection count
                const checkedItems = menu.querySelectorAll('input[type="checkbox"]:checked');
                if (checkedItems.length > 0) {
                    toggle.textContent = `Industries (${checkedItems.length})`;
                } else {
                    toggle.textContent = 'Industries';
                }
            } 
            // Handle radio selection for single-select dropdowns
            else if (this.querySelector('input[type="radio"]')) {
                const radio = this.querySelector('input[type="radio"]');
                radio.checked = true;
                
                // Update toggle text with selected value
                if (toggle.id === 'priceRangeDropdown') {
                    toggle.textContent = 'Price: ' + this.textContent.trim();
                } else if (toggle.id === 'revenueDropdown') {
                    toggle.textContent = 'Revenue: ' + this.textContent.trim();
                } else if (toggle.id === 'cashflowDropdown') {
                    toggle.textContent = 'Cashflow: ' + this.textContent.trim();
                }
                
                // Close menu after selection for radio buttons
                menu.classList.remove('show');
            }
            // Handle location selection
            else if (this.classList.contains('location-item')) {
                document.getElementById('locationInput').value = this.textContent.trim();
                menu.classList.remove('show');
            }
            
            // Apply filters when selection changes
            applyFilters();
        });
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.dropdown')) {
            document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
                menu.classList.remove('show');
            });
        }
    });
    
    // Initialize location input
    const locationInput = document.getElementById('locationInput');
    if (locationInput) {
        locationInput.addEventListener('input', function() {
            // Apply filters on input change with debounce
            clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(() => {
                applyFilters();
            }, 500);
        });
    }
    
    // Apply filters button
    const filterButton = document.querySelector('.filter-button');
    if (filterButton) {
        filterButton.addEventListener('click', function() {
            applyFilters();
        });
    }
    
    // Apply filters function
    function applyFilters() {
        // Collect all filter values
        const location = document.getElementById('locationInput')?.value || '';
        
        // Get selected industries
        const industriesChecked = Array.from(document.querySelectorAll('.industry-checkbox:checked')).map(cb => cb.value);
        
        // Get price range
        const priceRange = document.querySelector('input[name="priceRange"]:checked')?.value || '';
        
        // Get revenue range
        const revenueRange = document.querySelector('input[name="revenueRange"]:checked')?.value || '';
        
        // Get cashflow range
        const cashflowRange = document.querySelector('input[name="cashflowRange"]:checked')?.value || '';
        
        // Build filters object
        const filters = {
            location: location,
            industries: industriesChecked.join(','),
            priceRange: priceRange,
            revenueRange: revenueRange,
            cashflowRange: cashflowRange
        };
        
        console.log('Applying filters:', filters);
        
        // Call loadPage from marketplace.js with the filters
        if (typeof window.loadPage === 'function') {
            window.loadPage(1, filters);
        } else {
            console.error('loadPage function not found. Make sure marketplace.js is loaded properly.');
            // Fallback to manually building query and reloading
            const query = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value) query.append(key, value);
            });
            
            // Reload the page with the filters as query params
            if (query.toString()) {
                window.location.href = '/marketplace2?' + query.toString();
            }
        }
    }
});
