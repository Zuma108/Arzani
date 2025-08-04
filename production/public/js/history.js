class BusinessHistory {
    constructor() {
        this.page = 1;
        this.limit = 10;
        this.container = document.getElementById('history-container');
        this.paginationContainer = document.getElementById('history-pagination');
    }

    async loadHistory(page = 1) {
        try {
            const response = await fetch(`/api/history?page=${page}&limit=${this.limit}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) throw new Error('Failed to load history');
            
            const data = await response.json();
            this.renderHistory(data.history);
            this.renderPagination(data.pagination);
        } catch (error) {
            console.error('Error loading history:', error);
            this.showError('Failed to load history. Please try again later.');
        }
    }

    formatTimeAgo(date) {
        const now = new Date();
        const past = new Date(date);
        const diffTime = Math.abs(now - past);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const diffMonths = Math.floor(diffDays / 30);
        const diffYears = Math.floor(diffDays / 365);
        
        if (diffTime < 1000 * 60) return 'just now';
        if (diffTime < 1000 * 60 * 60) return `${Math.floor(diffTime / (1000 * 60))} minutes ago`;
        if (diffTime < 1000 * 60 * 60 * 24) return `${Math.floor(diffTime / (1000 * 60 * 60))} hours ago`;
        if (diffDays === 1) return 'yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        if (diffMonths === 1) return '1 month ago';
        if (diffMonths < 12) return `${diffMonths} months ago`;
        if (diffYears === 1) return '1 year ago';
        return `${diffYears} years ago`;
    }

    renderHistory(history) {
        if (!this.container) return;

        this.container.innerHTML = '';
        
        if (history.length === 0) {
            this.container.innerHTML = '<div class="alert alert-info">No history found.</div>';
            return;
        }

        const table = document.createElement('table');
        table.className = 'table table-hover';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Business Name</th>
                    <th>When</th>
                    <th>Price</th>
                    <th>Industry</th>
                </tr>
            </thead>
            <tbody>
                ${history.map(item => `
                    <tr data-business-id="${item.business_id}" class="business-row">
                        <td class="business-name">${this.escapeHtml(item.business_name)}</td>
                        <td>
                            <span title="${new Date(item.viewed_at).toLocaleString()}">
                                ${this.formatTimeAgo(item.viewed_at)}
                            </span>
                        </td>
                        <td>£${this.formatPrice(item.price)}</td>
                        <td>${this.escapeHtml(item.industry)}</td>
                    </tr>
                `).join('')}
            </tbody>
        `;

        this.container.appendChild(table);
        this.attachRowClickHandlers();

        // Add debug logging
        console.log('History data:', history);
    }

    attachRowClickHandlers() {
        this.container.querySelectorAll('.business-row').forEach(row => {
            const businessId = row.dataset.businessId;
            // Add debug logging
            console.log('Attaching click handler for business ID:', businessId);
            
            row.addEventListener('click', () => {
                if (businessId) {
                    window.location.href = `/businesses/${businessId}`;
                } else {
                    console.error('No business ID found for row:', row);
                }
            });
        });
    }

    renderPagination({ currentPage, totalPages, hasMore }) {
        if (!this.paginationContainer) return;

        this.paginationContainer.innerHTML = '';
        if (totalPages <= 1) return;

        const nav = document.createElement('nav');
        nav.innerHTML = `
            <ul class="pagination justify-content-center">
                ${currentPage > 1 ? `
                    <li class="page-item">
                        <a class="page-link" href="#" data-page="${currentPage - 1}">Previous</a>
                    </li>
                ` : ''}
                ${Array.from({ length: totalPages }, (_, i) => i + 1)
                    .map(page => `
                        <li class="page-item ${page === currentPage ? 'active' : ''}">
                            <a class="page-link" href="#" data-page="${page}">${page}</a>
                        </li>
                    `).join('')}
                ${hasMore ? `
                    <li class="page-item">
                        <a class="page-link" href="#" data-page="${currentPage + 1}">Next</a>
                    </li>
                ` : ''}
            </ul>
        `;

        this.paginationContainer.appendChild(nav);
        this.attachPaginationListeners();
    }

    attachPaginationListeners() {
        this.paginationContainer.querySelectorAll('.page-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = parseInt(e.target.dataset.page);
                this.loadHistory(page);
            });
        });
    }

    formatAction(action) {
        const actions = {
            'view_details': 'Viewed Details',
            'contact_seller': 'Contacted Seller'
        };
        return actions[action] || action;
    }

    formatPrice(price) {
        return parseFloat(price).toLocaleString();
    }

    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    showError(message) {
        if (!this.container) return;
        this.container.innerHTML = `
            <div class="alert alert-danger" role="alert">
                ${this.escapeHtml(message)}
            </div>
        `;
    }
}

// Initialize history functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const history = new BusinessHistory();
    history.loadHistory();
});

export default BusinessHistory;
