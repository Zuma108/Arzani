class CalendarWidget {
    constructor() {
        this.calendar = document.getElementById('calendarWidget');
        this.init();
    }

    init() {
        this.renderCalendar();
        this.setupEventListeners();
    }

    renderCalendar() {
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        const calendar = document.createElement('div');
        calendar.className = 'calendar-container';
        
        // Add calendar HTML structure
        calendar.innerHTML = `
            <div class="calendar-header">
                <button class="prev-month">&lt;</button>
                <h3>${new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long' })} ${currentYear}</h3>
                <button class="next-month">&gt;</button>
            </div>
            <div class="calendar-body">
                ${this.generateCalendarDays(currentMonth, currentYear)}
            </div>
        `;

        this.calendar.appendChild(calendar);
    }

    generateCalendarDays(month, year) {
        // Calendar generation logic here
        return `<div class="calendar-days">...</div>`;
    }

    setupEventListeners() {
        this.calendar.addEventListener('click', (e) => {
            if (e.target.matches('.calendar-day')) {
                const date = e.target.dataset.date;
                this.handleDateSelection(date);
            }
        });
    }

    handleDateSelection(date) {
        // Handle date selection
        console.log('Selected date:', date);
    }
}

// Initialize calendar when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('calendarWidget')) {
        window.calendarWidget = new CalendarWidget();
    }
});
