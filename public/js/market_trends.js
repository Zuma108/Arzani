let trendChart = null;
let priceDistChart = null;
let revenueVsEbitdaChart = null;
let growthTrendsChart = null;
let activeFilters = {
    timeRange: '30', // default to 30 days
    industry: '',
    location: ''
};

/**
 * Creates a gradient fill for Chart.js charts
 * @param {CanvasRenderingContext2D} ctx - The canvas context
 * @param {string} colorStart - The starting color (hex code)
 * @returns {CanvasGradient} - The gradient object for use with Chart.js
 */
function createGradient(ctx, colorStart) {
    const colorEnd = colorStart + '00'; // Add transparency
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, colorStart + 'CC'); // Semi-transparent version of the color
    gradient.addColorStop(1, colorEnd);
    return gradient;
}

/**
 * Generates an array of distinct colors based on the count
 * @param {number} count - Number of colors needed
 * @returns {string[]} - Array of hex color codes
 */
function generateColorPalette(count) {
    // Base set of professional colors
    const baseColors = [
        '#3b82f6', // blue
        '#10b981', // green
        '#6366f1', // indigo
        '#8b5cf6', // purple
        '#ec4899', // pink
        '#f97316', // orange
        '#ef4444', // red
        '#14b8a6', // teal
        '#84cc16', // lime
        '#a855f7', // violet
        '#f59e0b', // amber
        '#64748b'  // slate
    ];
    
    // If we have enough base colors, return a slice of that array
    if (count <= baseColors.length) {
        return baseColors.slice(0, count);
    }
    
    // Otherwise generate more colors using hue rotation
    const colors = [...baseColors];
    const hueStep = 360 / (count - baseColors.length);
    
    for (let i = baseColors.length; i < count; i++) {
        // Generate hue based on position and convert to hex
        const hue = Math.floor(i * hueStep) % 360;
        const saturation = 70 + (i % 20);
        const lightness = 45 + (i % 15);
        
        // HSL to Hex conversion (simplified)
        const h = hue / 360;
        const s = saturation / 100;
        const l = lightness / 100;
        
        // Color algorithm
        let r, g, b;
        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        
        // Convert to hex
        const toHex = (x) => {
            const hex = Math.round(x * 255).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };
        
        colors.push(`#${toHex(r)}${toHex(g)}${toHex(b)}`);
    }
    
    return colors;
}

// Modify the fetchMarketTrends function to include better error handling
async function fetchMarketTrends(filters = activeFilters) {
    const token = localStorage.getItem('token');
    
    if (!token) {
        console.error('No authentication token found');
        // Try to get the current URL to use as redirect after login
        const currentPage = encodeURIComponent(window.location.pathname);
        window.location.href = `/login2?redirect=${currentPage}`;
        throw new Error('Authentication required');
    }
    
    const queryParams = new URLSearchParams({
        timeRange: filters.timeRange || '30'
    });
    
    if (filters.industry) queryParams.append('industry', filters.industry);
    if (filters.location) queryParams.append('location', filters.location);
    
    try {
        console.log('Fetching market trends with token:', token ? 'Present' : 'Missing');
        const response = await fetch(`/api/market-trends/data?${queryParams.toString()}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                // Token might be expired, redirect to login
                const currentPage = encodeURIComponent(window.location.pathname);
                window.location.href = `/login2?redirect=${currentPage}`;
                throw new Error('Authentication required');
            }
            
            const errorData = await response.json().catch(() => ({
                error: 'Failed to fetch market trends'
            }));
            
            throw new Error(errorData.message || errorData.error || 'Failed to fetch market trends');
        }

        return response.json();
    } catch (error) {
        console.error('Market trends fetch error:', error);
        showError(`Error: ${error.message}`);
        throw error;
    }
}

async function fetchFilters() {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/market-trends/filters', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error('Failed to fetch filters');
    }

    return response.json();
}

async function populateFilters() {
    try {
        const filters = await fetchFilters();
        const industrySelect = document.getElementById('industryFilter');
        const locationSelect = document.getElementById('locationFilter');
        
        // Clear existing options (except first)
        while (industrySelect.options.length > 1) {
            industrySelect.remove(1);
        }
        
        while (locationSelect.options.length > 1) {
            locationSelect.remove(1);
        }
        
        // Add new options
        filters.industries.forEach(industry => {
            const option = document.createElement('option');
            option.value = industry;
            option.textContent = industry;
            industrySelect.appendChild(option);
        });
        
        filters.locations.forEach(location => {
            const option = document.createElement('option');
            option.value = location;
            option.textContent = location;
            locationSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error populating filters:', error);
        showError('Failed to load filter options');
    }
}

async function updateDashboard() {
    try {
        const data = await fetchMarketTrends(activeFilters);
        updateChart(data);
        populateTable(data);
        updateInsights(data);
    } catch (error) {
        console.error('Error updating dashboard:', error);
        showError('Failed to update dashboard data');
    }
}

// Helper function to safely access properties that might have different column names
function getPropertyValue(item, possibleProps, defaultValue = 0) {
    for (const prop of possibleProps) {
        if (item[prop] !== undefined) {
            return item[prop];
        }
    }
    return defaultValue;
}

function updateChart(data) {
    // Standard chart update code for valuationChart
    const ctx = document.getElementById('valuationChart').getContext('2d');
    
    // Create gradient for background
    const gradientFill = ctx.createLinearGradient(0, 0, 0, 400);
    gradientFill.addColorStop(0, 'rgba(59, 130, 246, 0.2)');
    gradientFill.addColorStop(1, 'rgba(59, 130, 246, 0)');
    
    const chartData = {
        // Use date from any possible column name
        labels: data.map(d => new Date(d.date || d.date_listed || d.created_at || d.listing_date).toLocaleDateString()),
        datasets: [{
            label: 'Average Price',
            data: data.map(d => getPropertyValue(d, ['avg_price', 'price', 'average_price'])),
            borderColor: '#3b82f6', // Modern blue
            borderWidth: 3,
            pointRadius: 4,
            pointBackgroundColor: '#3b82f6',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            tension: 0.4,
            fill: {
                target: 'origin',
                above: gradientFill
            }
        }, {
            label: 'Average Multiple',
            data: data.map(d => getPropertyValue(d, ['avg_multiple', 'multiple', 'average_multiple'])),
            borderColor: '#f97316', // Modern orange
            borderWidth: 3,
            pointRadius: 4,
            pointBackgroundColor: '#f97316',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            tension: 0.4,
            yAxisID: 'y1'
        }]
    };

    if (trendChart) {
        trendChart.destroy();
    }

    trendChart = new Chart(ctx, {
        type: 'line',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        boxWidth: 8,
                        font: {
                            family: "'Inter', sans-serif",
                            size: 12
                        }
                    }
                },
                title: {
                    display: true,
                    text: 'Market Valuation Trends',
                    font: {
                        family: "'Inter', sans-serif",
                        size: 16,
                        weight: 'bold'
                    },
                    padding: {
                        bottom: 15
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    titleColor: '#1f2937',
                    bodyColor: '#1f2937',
                    bodyFont: {
                        family: "'Inter', sans-serif",
                        size: 12
                    },
                    titleFont: {
                        family: "'Inter', sans-serif",
                        size: 14,
                        weight: 'bold'
                    },
                    borderColor: 'rgba(0, 0, 0, 0.1)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    padding: 12,
                    boxPadding: 6,
                    usePointStyle: true,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) label += ': ';
                            if (context.datasetIndex === 1) {
                                label += parseFloat(context.raw).toFixed(2) + 'x';
                            } else {
                                label += '£' + parseInt(context.raw).toLocaleString();
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            family: "'Inter', sans-serif",
                            size: 11
                        }
                    }
                },
                y: {
                    position: 'left',
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        font: {
                            family: "'Inter', sans-serif",
                            size: 11
                        },
                        callback: value => '£' + value.toLocaleString()
                    }
                },
                y1: {
                    position: 'right',
                    beginAtZero: true,
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            family: "'Inter', sans-serif",
                            size: 11
                        },
                        callback: value => value.toFixed(1) + 'x'
                    }
                }
            },
            animations: {
                tension: {
                    duration: 1000,
                    easing: 'easeOutQuart',
                    from: 0.4,
                    to: 0.4,
                    loop: false
                },
                radius: {
                    duration: 400,
                    easing: 'linear'
                }
            }
        }
    });

    // Initialize or update other chart types
    updatePriceDistributionChart(data);
    updateRevenueVsEbitdaChart(data);
    updateGrowthTrendsChart(data);
}

function updatePriceDistributionChart(data) {
    // Group data by price ranges for histogram
    const priceRanges = [0, 50000, 100000, 250000, 500000, 1000000, 2000000, 5000000, 10000000];
    const priceDistribution = Array(priceRanges.length - 1).fill(0);
    
    data.forEach(item => {
        const price = parseFloat(item.avg_price);
        for (let i = 0; i < priceRanges.length - 1; i++) {
            if (price >= priceRanges[i] && price < priceRanges[i + 1]) {
                priceDistribution[i]++;
                break;
            }
        }
    });
    
    const labels = priceRanges.slice(0, -1).map((min, i) => {
        return `£${(min/1000).toFixed(0)}k - £${(priceRanges[i+1]/1000).toFixed(0)}k`;
    });

    if (priceDistChart) {
        priceDistChart.destroy();
    }

    const ctx = document.getElementById('priceDistChart').getContext('2d');
    
    // Create gradient fill
    const gradientColors = [
        createGradient(ctx, '#3b82f6'), // blue
        createGradient(ctx, '#10b981'), // green
        createGradient(ctx, '#6366f1'), // indigo
        createGradient(ctx, '#8b5cf6'), // purple
        createGradient(ctx, '#ec4899'), // pink
        createGradient(ctx, '#f97316'), // orange
        createGradient(ctx, '#ef4444'), // red
        createGradient(ctx, '#14b8a6')  // teal
    ];
    
    priceDistChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Number of Businesses',
                data: priceDistribution,
                backgroundColor: gradientColors.slice(0, priceRanges.length - 1),
                borderColor: 'rgba(255, 255, 255, 0.8)',
                borderWidth: 1,
                borderRadius: 6,
                barPercentage: 0.6,
                categoryPercentage: 0.8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Business Price Distribution',
                    font: {
                        family: "'Inter', sans-serif",
                        size: 16,
                        weight: 'bold'
                    },
                    padding: {
                        bottom: 15
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    titleColor: '#1f2937',
                    bodyColor: '#1f2937',
                    bodyFont: {
                        family: "'Inter', sans-serif",
                        size: 12
                    },
                    titleFont: {
                        family: "'Inter', sans-serif",
                        size: 14,
                        weight: 'bold'
                    },
                    borderColor: 'rgba(0, 0, 0, 0.1)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    padding: 12,
                    boxPadding: 6,
                    callbacks: {
                        label: function(context) {
                            return `${context.parsed.y} businesses`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    title: {
                        display: true,
                        text: 'Number of Businesses',
                        font: {
                            family: "'Inter', sans-serif",
                            size: 12
                        }
                    },
                    ticks: {
                        font: {
                            family: "'Inter', sans-serif",
                            size: 11
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Price Range',
                        font: {
                            family: "'Inter', sans-serif",
                            size: 12
                        }
                    },
                    ticks: {
                        font: {
                            family: "'Inter', sans-serif",
                            size: 10
                        },
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            },
            animations: {
                y: {
                    easing: 'easeOutElastic',
                    from: (ctx) => {
                        if (ctx.type === 'data') {
                            if (ctx.mode === 'default' && !ctx.dropped) {
                                ctx.dropped = true;
                                return 0;
                            }
                        }
                        return ctx.chart.scales.y.getPixelForValue(100);
                    }
                }
            }
        }
    });
}

function updateRevenueVsEbitdaChart(data) {
    const ctx = document.getElementById('revenueVsEbitdaChart').getContext('2d');
    
    // Extract revenue and EBITDA data points
    const chartData = data.map(item => ({
        x: parseFloat(item.avg_gross_revenue || 0),
        y: parseFloat(item.avg_ebitda || 0),
        industry: item.industry,
        location: item.location,
        date: new Date(item.date).toLocaleDateString()
    }));
    
    // Generate unique colors for different industries
    const industries = [...new Set(data.map(item => item.industry))];
    const colors = generateColorPalette(industries.length);
    
    // Group data by industry
    const datasets = industries.map((industry, index) => {
        const industryData = chartData.filter(point => point.industry === industry);
        return {
            label: industry,
            data: industryData,
            backgroundColor: colors[index] + 'CC', // Add transparency
            borderColor: colors[index],
            borderWidth: 1,
            pointRadius: 6,
            pointHoverRadius: 10,
            pointStyle: 'circle',
            pointBackgroundColor: colors[index],
            pointBorderColor: 'white',
            pointBorderWidth: 2
        };
    });
    
    if (revenueVsEbitdaChart) {
        revenueVsEbitdaChart.destroy();
    }
    
    revenueVsEbitdaChart = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    align: 'start',
                    labels: {
                        usePointStyle: true,
                        boxWidth: 10,
                        boxHeight: 10,
                        padding: 15,
                        font: {
                            family: "'Inter', sans-serif",
                            size: 11
                        }
                    }
                },
                title: {
                    display: true,
                    text: 'Revenue vs EBITDA by Industry',
                    font: {
                        family: "'Inter', sans-serif",
                        size: 16,
                        weight: 'bold'
                    },
                    padding: {
                        bottom: 15
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    titleColor: '#1f2937',
                    bodyColor: '#1f2937',
                    bodyFont: {
                        family: "'Inter', sans-serif",
                        size: 12
                    },
                    titleFont: {
                        family: "'Inter', sans-serif",
                        size: 14,
                        weight: 'bold'
                    },
                    borderColor: 'rgba(0, 0, 0, 0.1)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    padding: 12,
                    boxPadding: 6,
                    usePointStyle: true,
                    callbacks: {
                        label: function(context) {
                            const point = context.raw;
                            return [
                                `Industry: ${point.industry}`,
                                `Location: ${point.location}`,
                                `Revenue: £${Math.round(point.x).toLocaleString()}`,
                                `EBITDA: £${Math.round(point.y).toLocaleString()}`,
                                `Date: ${point.date}`
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    title: {
                        display: true,
                        text: 'Average Gross Revenue (£)',
                        font: {
                            family: "'Inter', sans-serif",
                            size: 12
                        }
                    },
                    ticks: {
                        font: {
                            family: "'Inter', sans-serif",
                            size: 11
                        },
                        callback: value => '£' + value.toLocaleString()
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    title: {
                        display: true,
                        text: 'Average EBITDA (£)',
                        font: {
                            family: "'Inter', sans-serif",
                            size: 12
                        }
                    },
                    ticks: {
                        font: {
                            family: "'Inter', sans-serif",
                            size: 11
                        },
                        callback: value => '£' + value.toLocaleString()
                    }
                }
            },
            animations: {
                radius: {
                    duration: 400,
                    easing: 'linear',
                    loop: (ctx) => ctx.active
                }
            }
        }
    });
}

function updateGrowthTrendsChart(data) {
    const ctx = document.getElementById('growthTrendsChart').getContext('2d');
    
    // Group data by industry and calculate average values over time
    const industries = [...new Set(data.map(item => 
        getPropertyValue(item, ['industry', 'business_type', 'category'], 'Unknown')
    ))];
    
    // Get all dates from the data
    const dates = [...new Set(data.map(item => 
        item.date || item.date_listed || item.created_at || item.listing_date
    ))].sort((a, b) => new Date(a) - new Date(b));
    
    // Create datasets for each industry
    const colors = generateColorPalette(industries.length);
    const datasets = industries.map((industry, index) => {
        const industryData = dates.map(date => {
            // Find matching records for this industry and date
            const matchingRecords = data.filter(item => {
                const itemIndustry = getPropertyValue(item, ['industry', 'business_type', 'category'], 'Unknown');
                const itemDate = item.date || item.date_listed || item.created_at || item.listing_date;
                return itemIndustry === industry && 
                       new Date(itemDate).toISOString() === new Date(date).toISOString();
            });
            
            if (matchingRecords.length === 0) return null;
            
            // Calculate average price
            const avgPrice = matchingRecords.reduce((sum, item) => {
                const price = getPropertyValue(item, ['avg_price', 'price', 'average_price']);
                return sum + parseFloat(price);
            }, 0) / matchingRecords.length;
            
            return avgPrice;
        });
        
        // Create area gradient
        const gradientFill = ctx.createLinearGradient(0, 0, 0, 300);
        gradientFill.addColorStop(0, colors[index] + '40');
        gradientFill.addColorStop(0.8, colors[index] + '00');
        
        return {
            label: industry,
            data: industryData,
            borderColor: colors[index],
            backgroundColor: gradientFill,
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 7,
            pointBackgroundColor: colors[index],
            pointBorderColor: '#ffffff',
            pointBorderWidth: 1.5,
            fill: true,
            tension: 0.4
        };
    });
    
    if (growthTrendsChart) {
        growthTrendsChart.destroy();
    }
    
    growthTrendsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates.map(date => new Date(date).toLocaleDateString()),
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        boxWidth: 8,
                        font: {
                            family: "'Inter', sans-serif",
                            size: 11
                        }
                    }
                },
                title: {
                    display: true,
                    text: 'Business Valuation Trends by Industry',
                    font: {
                        family: "'Inter', sans-serif",
                        size: 16,
                        weight: 'bold'
                    },
                    padding: {
                        bottom: 15
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    titleColor: '#1f2937',
                    bodyColor: '#1f2937',
                    bodyFont: {
                        family: "'Inter', sans-serif",
                        size: 12
                    },
                    titleFont: {
                        family: "'Inter', sans-serif",
                        size: 14,
                        weight: 'bold'
                    },
                    borderColor: 'rgba(0, 0, 0, 0.1)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    padding: 12,
                    boxPadding: 6,
                    usePointStyle: true
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Date',
                        font: {
                            family: "'Inter', sans-serif",
                            size: 12
                        }
                    },
                    ticks: {
                        font: {
                            family: "'Inter', sans-serif",
                            size: 11
                        },
                        maxRotation: 45,
                        minRotation: 45
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    title: {
                        display: true,
                        text: 'Average Valuation (£)',
                        font: {
                            family: "'Inter', sans-serif",
                            size: 12
                        }
                    },
                    ticks: {
                        font: {
                            family: "'Inter', sans-serif",
                            size: 11
                        },
                        callback: value => '£' + value.toLocaleString()
                    }
                }
            },
            animations: {
                tension: {
                    duration: 1000,
                    easing: 'easeOutQuart',
                }
            }
        }
    });
}

function updateInsights(data) {
    // Calculate and display key insights
    const avgPrice = data.reduce((sum, item) => {
        const price = getPropertyValue(item, ['avg_price', 'price', 'average_price']);
        return sum + parseFloat(price);
    }, 0) / data.length;
    
    const avgValuationEl = document.getElementById('avgValuation');
    if (avgValuationEl) {
        avgValuationEl.textContent = `£${Math.round(avgPrice).toLocaleString()}`;
    }
    
    // Find top industry
    const industryPrices = {};
    data.forEach(item => {
        // Get industry value from any possible column name
        const industry = getPropertyValue(item, ['industry', 'business_type', 'category'], 'Unknown');
        
        if (!industryPrices[industry]) {
            industryPrices[industry] = {
                total: 0,
                count: 0
            };
        }
        const price = getPropertyValue(item, ['avg_price', 'price', 'average_price']);
        industryPrices[industry].total += parseFloat(price);
        industryPrices[industry].count++;
    });
    
    let topIndustry = '';
    let topAvg = 0;
    
    Object.entries(industryPrices).forEach(([industry, stats]) => {
        const avg = stats.total / stats.count;
        if (avg > topAvg) {
            topAvg = avg;
            topIndustry = industry;
        }
    });
    const topIndustryEl = document.getElementById('topIndustry');
    if (topIndustryEl) {
        topIndustryEl.textContent = topIndustry || 'N/A';
    }
    
    // Calculate and display growth rate
    // Update to use date_listed
    const sortedDates = [...new Set(data.map(item => new Date(item.date_listed).getTime()))].sort();
    if (sortedDates.length >= 2) {
        const oldestData = data.filter(item => new Date(item.date_listed).getTime() === sortedDates[0]);
        const newestData = data.filter(item => new Date(item.date_listed).getTime() === sortedDates[sortedDates.length - 1]);
        
        const oldestAvg = oldestData.reduce((sum, item) => sum + parseFloat(item.avg_price), 0) / oldestData.length;
        const newestAvg = newestData.reduce((sum, item) => sum + parseFloat(item.avg_price), 0) / newestData.length;
        
        const growthRate = ((newestAvg - oldestAvg) / oldestAvg) * 100;
        
        const avgGrowthEl = document.getElementById('avgGrowth');
        if (avgGrowthEl) {
            avgGrowthEl.textContent = `${growthRate.toFixed(1)}%`;
        }
        
        // Update growth change indicator
        const growthChangeEl = document.getElementById('growthChange');
        if (growthChangeEl) {
            if (growthRate > 0) {
                growthChangeEl.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    ${growthRate.toFixed(1)}%
                `;
                growthChangeEl.classList.remove('text-red-600');
                growthChangeEl.classList.add('text-green-600');
            } else {
                growthChangeEl.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
                    </svg>
                    ${Math.abs(growthRate).toFixed(1)}%
                `;
                growthChangeEl.classList.remove('text-green-600');
                growthChangeEl.classList.add('text-red-600');
            }
        }
    }
    
    // Set recent listings count
    const recentListings = data.filter(item => {
        // Update to use date_listed
        const date = new Date(item.date_listed);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return date >= sevenDaysAgo;
    }).length;
    
    const recentListingsEl = document.getElementById('recentListings');
    if (recentListingsEl) {
        recentListingsEl.textContent = recentListings;
    }

    // Update valuation change indicator
    if (sortedDates.length >= 2) {
        const oldestData = data.filter(item => new Date(item.date_listed).getTime() === sortedDates[0]);
        const newestData = data.filter(item => new Date(item.date_listed).getTime() === sortedDates[sortedDates.length - 1]);
        
        const oldestAvg = oldestData.reduce((sum, item) => sum + parseFloat(item.avg_price), 0) / oldestData.length;
        const newestAvg = newestData.reduce((sum, item) => sum + parseFloat(item.avg_price), 0) / newestData.length;
        
        const changePercent = ((newestAvg - oldestAvg) / oldestAvg) * 100;
        
        const valuationChangeEl = document.getElementById('valuationChange');
        if (valuationChangeEl) {
            if (changePercent > 0) {
                valuationChangeEl.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    ${changePercent.toFixed(1)}%
                `;
                valuationChangeEl.classList.remove('text-red-600');
                valuationChangeEl.classList.add('text-green-600');
            } else {
                valuationChangeEl.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
                    </svg>
                    ${Math.abs(changePercent).toFixed(1)}%
                `;
                valuationChangeEl.classList.remove('text-green-600');
                valuationChangeEl.classList.add('text-red-600');
            }
        }
    }
}

function showError(message) {
    const errorContainer = document.getElementById('errorContainer');
    errorContainer.textContent = message;
    errorContainer.classList.remove('hidden');
    errorContainer.classList.add('bg-red-100', 'text-red-700', 'p-4', 'rounded-lg', 'mb-4');
    
    // Add fade-out animation
    setTimeout(() => {
        errorContainer.classList.add('opacity-0', 'transition-opacity', 'duration-500');
        setTimeout(() => {
            errorContainer.classList.add('hidden');
            errorContainer.classList.remove('opacity-0', 'transition-opacity', 'duration-500');
        }, 500);
    }, 5000);
}

async function exportTrendsToGoogleDrive() {
    // Show loading state
    const driveBtn = document.querySelector('button[onclick="exportTrendsToGoogleDrive()"]');
    const originalText = driveBtn.innerHTML;
    driveBtn.innerHTML = `
        <svg class="animate-spin h-4 w-4 mr-1 inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Exporting...
    `;
    driveBtn.disabled = true;

    try {
        const trendsData = await fetchMarketTrends(activeFilters);

        const token = localStorage.getItem('token');
        const response = await fetch('/api/drive/export-trends', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                filters: activeFilters,
                trendsData
            })
        });

        const result = await response.json();

        if (!response.ok) {
            if (response.status === 401 && result.redirectUrl) {
                window.location.href = result.redirectUrl;
                return;
            }
            throw new Error(result.error || 'Export failed');
        }

        // Show success message
        const errorContainer = document.getElementById('errorContainer');
        errorContainer.classList.remove('bg-red-100', 'text-red-700', 'hidden');
        errorContainer.classList.add('bg-green-100', 'text-green-700', 'p-4', 'rounded-lg', 'mb-4');
        errorContainer.innerHTML = `
            <div class="flex items-center">
                <svg class="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
                Export successful! <a href="${result.webViewLink}" target="_blank" class="underline font-medium">View in Google Drive</a>
            </div>
        `;

        // Add fade-out animation
        setTimeout(() => {
            errorContainer.classList.add('opacity-0', 'transition-opacity', 'duration-500');
            setTimeout(() => {
                errorContainer.classList.add('hidden');
                errorContainer.classList.remove('opacity-0', 'transition-opacity', 'duration-500', 'bg-green-100', 'text-green-700');
            }, 500);
        }, 5000);

    } catch (error) {
        console.error('Export error:', error);
        showError(`Failed to export: ${error.message}`);
    } finally {
        // Reset button state
        driveBtn.innerHTML = originalText;
        driveBtn.disabled = false;
    }
}

function exportToFormat(format) {
    // Show loading state
    const btn = document.querySelector(`button[onclick="exportToFormat('${format}')"]`);
    const originalText = btn.innerHTML;
    btn.innerHTML = `
        <svg class="animate-spin h-4 w-4 mr-1 inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cx="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Exporting...
    `;
    btn.disabled = true;
    
    const token = localStorage.getItem('token');
    
    // For PDF format, use POST method with JSON body to include more data
    if (format === 'pdf') {
        fetchMarketTrends(activeFilters)
            .then(trendsData => {
                // Create request with full data needed for rich PDF export
                return fetch('/api/market-trends/export', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        format: format,
                        filters: activeFilters,
                        trendsData: trendsData,
                        exportOptions: {
                            includeSummary: true,
                            includeCharts: true,
                            includeTable: true
                        }
                    })
                });
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(data => {
                        throw new Error(data.message || 'Export failed with status: ' + response.status);
                    });
                }
                return response.blob();
            })
            .then(blob => {
                downloadFile(blob, format);
            })
            .catch(error => {
                console.error('Export error:', error);
                showError(`Failed to export as ${format.toUpperCase()}: ${error.message}`);
            })
            .finally(() => {
                // Reset button state
                btn.innerHTML = originalText;
                btn.disabled = false;
            });
    } else {
        // For other formats, keep using GET with query params
        const queryParams = new URLSearchParams({
            format: format,
            timeRange: activeFilters.timeRange || '30'
        });
        
        if (activeFilters.industry) queryParams.append('industry', activeFilters.industry);
        if (activeFilters.location) queryParams.append('location', activeFilters.location);
        
        const url = `/api/market-trends/export?${queryParams.toString()}`;
        
        fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.message || 'Export failed with status: ' + response.status);
                });
            }
            return response.blob();
        })
        .then(blob => {
            downloadFile(blob, format);
        })
        .catch(error => {
            console.error('Export error:', error);
            showError(`Failed to export as ${format.toUpperCase()}: ${error.message}`);
        })
        .finally(() => {
            // Reset button state
            btn.innerHTML = originalText;
            btn.disabled = false;
        });
    }
}

// Helper function to download file
function downloadFile(blob, format) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `market_trends_${format}_${new Date().toISOString().split('T')[0]}.${format}`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }, 100);
    
    // Show success toast message
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 right-4 bg-green-100 text-green-800 px-4 py-2 rounded-lg shadow-lg transition-opacity duration-500';
    toast.innerHTML = `
        <div class="flex items-center">
            <svg class="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
            ${format.toUpperCase()} exported successfully
        </div>
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('opacity-0');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 500);
    }, 3000);
}

function suggestQuery(query) {
    document.getElementById('messageInput').value = query;
    // Focus the input field for better UX
    document.getElementById('messageInput').focus();
    
    // Optional: Add a subtle animation to the input field to draw attention
    const inputField = document.getElementById('messageInput');
    inputField.classList.add('pulse-animation');
    setTimeout(() => {
        inputField.classList.remove('pulse-animation');
    }, 1000);
}

// Add event listeners when document is ready
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    
    // Log token status (but not the actual token)
    console.log('Token status:', token ? 'Present' : 'Missing');
    
    // Check if token exists and is valid
    if (!token) {
        // Try to refresh token first
        refreshToken().then(newToken => {
            if (newToken) {
                console.log('Token refreshed successfully');
                // Now initialize the page
                initializePage();
            } else {
                // Redirect to login if no token and can't refresh
                const currentPage = encodeURIComponent(window.location.pathname);
                window.location.href = `/login2?redirect=${currentPage}`;
            }
        });
    } else {
        // Initialize page with existing token
        initializePage();
    }
});

// Add this function to refresh the token if needed
async function refreshToken() {
    try {
        const response = await fetch('/auth/refresh-token', {
            method: 'POST',
            credentials: 'include' // Important for cookies
        });
        
        if (!response.ok) {
            throw new Error('Failed to refresh token');
        }
        
        const data = await response.json();
        localStorage.setItem('token', data.token);
        return data.token;
    } catch (error) {
        console.error('Token refresh failed:', error);
        return null;
    }
}

// Page initialization function
function initializePage() {
    const timeRange = document.getElementById('timeRange');
    timeRange.addEventListener('change', (e) => {
        activeFilters.timeRange = e.target.value;
        updateDashboard();
    });
    
    // Initial load
    updateDashboard();
}

// Initialize filters
populateFilters();

// Filter change handlers
document.getElementById('industryFilter').addEventListener('change', (e) => {
    activeFilters.industry = e.target.value;
    updateDashboard();
});

document.getElementById('locationFilter').addEventListener('change', (e) => {
    activeFilters.location = e.target.value;
    updateDashboard();
});

// Tab functionality
const tabBtns = document.querySelectorAll('.tab-btn');
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active class from all tabs
        tabBtns.forEach(b => b.classList.remove('active'));
        // Add active class to clicked tab
        btn.classList.add('active');
        
        // Hide all charts
        const charts = document.querySelectorAll('.chart-container canvas');
        charts.forEach(chart => chart.style.display = 'none');
        
        // Show selected chart
        const chartId = btn.dataset.chart;
        document.getElementById(chartId).style.display = 'block';
    });
});

// Add chart animation on scroll
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('chart-animate');
            observer.unobserve(entry.target);
        }
    });
}, { threshold: 0.1 });

document.querySelectorAll('.chart-container').forEach(chart => {
    observer.observe(chart);
});

// Handle WebSocket connections for real-time updates
const ws = new WebSocket('ws://' + window.location.host);
ws.onmessage = function(event) {
    const update = JSON.parse(event.data);
    if (update.type === 'market_update') {
        updateDashboard();
    }
};
