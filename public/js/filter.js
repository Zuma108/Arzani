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
