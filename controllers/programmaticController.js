
import businessData from '../data/businessData.json' assert { type: 'json' };

const programmaticController = {
  getBusinessListings: (req, res) => {
    const { city, industry } = req.params;

    // Filter data based on city and industry
    let filteredData = businessData.businesses;
    if (city) {
      filteredData = filteredData.filter(business => business.location.toLowerCase() === city.toLowerCase());
    }
    if (industry) {
      filteredData = filteredData.filter(business => business.industry.toLowerCase() === industry.toLowerCase());
    }

    const page_data = {
        city: city || 'UK',
        industry: industry || 'All Industries',
        business_count: filteredData.length,
        avg_valuation: "£500,000",
        avg_multiple: "4.0x",
        avg_roi: "20%",
        market_growth: "10%",
        success_rate: "90%",
        avg_days_to_sale": 50
    };

    res.render('business-listings', {
      page_data,
      businesses: filteredData,
      title: `${page_data.business_count}+ Businesses for Sale in ${page_data.city} | AI-Verified | Arzani`,
      description: `Find profitable businesses for sale in ${page_data.city}. Get instant AI valuations, transparent pricing, and expert support. ${page_data.business_count}+ verified listings available.`,
      keywords: `business for sale ${page_data.city}, buy business ${page_data.city}, ${page_data.city} business broker, business valuation ${page_data.city}`
    });
  }
};

export default programmaticController;
