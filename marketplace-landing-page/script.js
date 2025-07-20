const page_data = {
    "city": "London",
    "industry": "Technology",
    "business_count": 247,
    "avg_valuation": "£450,000",
    "avg_multiple": "3.2x",
    "avg_roi": "18%",
    "market_growth": "12%",
    "success_rate": "87%",
    "avg_days_to_sale": 45
};

const businesses = [
    {
      "id": "biz_001",
      "name": "TechStart Solutions",
      "industry": "SaaS",
      "valuation": "£1,200,000",
      "revenue": "£800,000",
      "profit": "£320,000",
      "multiple": "3.8x",
      "location": "London",
      "ai_confidence": "96%"
    },
    {
        "id": "biz_002",
        "name": "Retail Innovations",
        "industry": "Retail",
        "valuation": "£500,000",
        "revenue": "£1,000,000",
        "profit": "£150,000",
        "multiple": "3.3x",
        "location": "Manchester",
        "ai_confidence": "94%"
    },
    {
        "id": "biz_003",
        "name": "Foodie Ventures",
        "industry": "Restaurant",
        "valuation": "£250,000",
        "revenue": "£400,000",
        "profit": "£80,000",
        "multiple": "3.1x",
        "location": "London",
        "ai_confidence": "92%"
    }
];

function createBusinessCard(business) {
    return `
        <div class="bg-white rounded-lg shadow-md p-6 flex">
            <img src="https://via.placeholder.com/300x200" alt="${business.name}" class="w-1/3 rounded-lg">
            <div class="ml-6">
                <h3 class="text-2xl font-bold">${business.name}</h3>
                <p class="text-gray-600">${business.location}</p>
                <p class="text-gray-600">${business.industry}</p>
                
                <div class="flex items-center my-4">
                    <span class="text-2xl mr-2">🤖</span>
                    <span class="text-lg">AI Valuation: ${business.valuation}</span>
                    <span class="ml-4 text-sm text-gray-500">${business.ai_confidence} Confidence</span>
                </div>
                
                <div class="flex">
                    <div class="mr-8">
                        <p class="text-gray-600">Revenue</p>
                        <p class="font-bold">${business.revenue}</p>
                    </div>
                    <div class="mr-8">
                        <p class="text-gray-600">Profit</p>
                        <p class="font-bold">${business.profit}</p>
                    </div>
                    <div>
                        <p class="text-gray-600">Multiple</p>
                        <p class="font-bold">${business.multiple}</p>
                    </div>
                </div>
                
                <button class="mt-4 bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded">View Full Details</button>
            </div>
        </div>
    `;
}

function renderBusinessListings() {
    const container = document.getElementById('business-listings-container');
    container.innerHTML = businesses.map(createBusinessCard).join('');
}

function updateSEOTags() {
    document.title = `${page_data.business_count}+ Businesses for Sale in ${page_data.city} | AI-Verified | Arzani`;
    document.querySelector('h1').textContent = `${page_data.business_count}+ Profitable Businesses for Sale in ${page_data.city} | AI-Verified Valuations`;
    document.querySelector('header p').textContent = `Browse verified businesses with instant AI valuations. Find your perfect acquisition opportunity with transparent pricing and detailed analytics.`;
}

function setupCTAs() {
    const viewAllButton = document.querySelector('header button:nth-of-type(1)');
    const getValuationButton = document.querySelector('header button:nth-of-type(2)');

    viewAllButton.addEventListener('click', () => {
        console.log('View All Businesses button clicked');
    });

    getValuationButton.addEventListener('click', () => {
        console.log('Get Free AI Valuation button clicked');
    });
}

document.addEventListener('DOMContentLoaded', () => {
    renderBusinessListings();
    updateSEOTags();
    setupCTAs();
});