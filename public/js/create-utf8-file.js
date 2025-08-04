// Simple script to read and output the UTF-8 version of the file
const fs = require('fs');
const path = require('path');

try {
    const filePath = path.join(__dirname, 'views', 'valuation-confirmation.ejs');
    console.log(`Reading file: ${filePath}`);
    
    // Read the file as a buffer
    const data = fs.readFileSync(filePath);
    
    // Create a new buffer with half the size (to remove null bytes)
    const result = Buffer.alloc(data.length);
    let pos = 0;
    
    // Process each byte, skip any null bytes
    for (let i = 0; i < data.length; i++) {
        if (data[i] !== 0) {
            result[pos++] = data[i];
        }
    }
    
    // Trim buffer to actual size and convert to string
    const utf8Content = result.slice(0, pos).toString('utf8');
    
    // Prepare the HTML file with proper UTF-8 encoding
    const finalContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Confirmed | Arzani Marketplace</title>
    <link rel="icon" href="/figma design exports/images.webp/arzani-icon-nobackground.png" type="image/png">

    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;600;700;900&display=swap" rel="stylesheet">
    <%- include('./partials/tailwind-setup') %>
    <link rel="stylesheet" href="/css/seller-questionnaire.css">
    <style>
        body {
            font-family: 'Roboto', sans-serif;
            background-color: #f8fafc; /* Tailwind slate-50 */
        }
        .confirmation-container {
            max-width: 850px;
            margin: 0 auto;
            padding: 1.5rem; /* More padding on mobile */
        }
        @media (min-width: 768px) {
            .confirmation-container {
                padding: 2.5rem; /* More padding on desktop */
            }
        }

        .page-title {
            font-size: 1.875rem; /* text-3xl */
            line-height: 2.25rem;
            font-weight: 700; /* bold */
            margin-bottom: 0.75rem; /* mb-3 */
            color: #1e293b; /* slate-800 */
            text-align: center;
        }
        @media (min-width: 768px) {
            .page-title {
                font-size: 2.25rem; /* md:text-4xl */
                line-height: 2.5rem;
            }
        }
        .page-subtitle {
            color: #475569; /* slate-600 */
            margin-bottom: 2rem; /* mb-8 */
            text-align: center;
            font-size: 1rem; /* base */
        }
        @media (min-width: 768px) {
            .page-subtitle {
                margin-bottom: 2.5rem; /* md:mb-10 */
                font-size: 1.125rem; /* md:text-lg */
            }
        }

        .confirmation-card {
            border-radius: 16px; /* More rounded */
            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.07), 0 4px 8px rgba(0, 0, 0, 0.04); /* Softer shadow */
            overflow: hidden;
            margin-bottom: 2.5rem; /* Increased margin */
            transition: all 0.3s ease-in-out;
            background: white;
        }
        
        .confirmation-header {
            padding: 2rem; /* Increased padding */
            background: linear-gradient(135deg, #16a34a, #22c55e); /* Green gradient for success */
            color: white;
            text-align: center;
        }
        .confirmation-header h2 {
            font-size: 1.5rem; /* text-xl */
            font-weight: 700; /* bold */
        }
        @media (min-width: 768px) {
            .confirmation-header h2 {
                font-size: 1.875rem; /* md:text-2xl */
            }
        }
        
        .confirmation-header svg {
            width: 64px;
            height: 64px;
            margin: 0 auto 1rem auto;
        }

        .confirmation-body {
            padding: 2rem; /* Consistent padding */
            text-align: center;
        }
        @media (min-width: 768px) {
            .confirmation-body {
                padding: 2.5rem; /* More padding on desktop */
            }
        }
        
        .confirmation-body p {
            color: #334155; /* slate-700 */
            font-size: 1.125rem;
            line-height: 1.75rem;
            margin-bottom: 1.5rem;
        }

        .btn-next {
            background-color: #041b76;
            color: white;
            border-radius: 0.5rem;
            padding: 0.85rem 2rem;
            font-weight: 600;
            font-size: 1.125rem;
            transition: all 0.3s ease;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            margin-top: 1rem;
        }

        .btn-next:hover {
            background-color: #0f2e8a;
            transform: translateY(-2px);
            box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
        }
        
        .btn-next svg {
            height: 20px;
            width: 20px;
            margin-left: 8px;
        }

        .steps-container {
            margin-top: 2rem;
            padding: 1.5rem;
            background-color: #f1f5f9; /* slate-100 */
            border-radius: 12px;
            border: 1px solid #e2e8f0; /* slate-200 */
        }
        
        .step-header {
            font-weight: 600;
            color: #334155; /* slate-700 */
            margin-bottom: 1rem;
            font-size: 1.25rem;
        }
        
        .steps-list {
            list-style-type: none;
            padding: 0;
            margin: 0;
            counter-reset: step-counter;
        }
        
        .step-item {
            display: flex;
            align-items: flex-start;
            margin-bottom: 1.25rem;
            counter-increment: step-counter;
        }
        
        .step-item:last-child {
            margin-bottom: 0;
        }
        
        .step-number {
            background-color: #2563eb; /* blue-600 */
            color: white;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 0.875rem;
            flex-shrink: 0;
            margin-right: 1rem;
        }
        
        .step-content {
            flex-grow: 1;
        }
        
        .step-title {
            font-weight: 600;
            color: #334155; /* slate-700 */
            font-size: 1rem;
            margin-bottom: 0.25rem;
        }
        
        .step-description {
            color: #64748b; /* slate-500 */
            font-size: 0.875rem;
            line-height: 1.5;
        }

        .site-footer {
            background-color: #0f172a; /* slate-900 */
            color: white;
            padding-top: 2.5rem; /* py-10 */
            padding-bottom: 2.5rem;
        }
        .site-footer p {
            font-size: 0.875rem; /* text-sm */
            color: #94a3b8; /* slate-400 */
        }
    </style>
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-W50GKB6F3M"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-W50GKB6F3M');
    </script>
</head>
<body class="bg-slate-50">
    <div class="w-full min-h-screen flex flex-col bg-white">
        <main class="flex-1 py-8 md:py-12">
            <div class="confirmation-container">
                <h1 class="page-title">Payment Successful</h1>
                <p class="page-subtitle">Thank you for choosing our Business Valuation Service</p>
                
                <div class="confirmation-card">
                    <div class="confirmation-header">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <circle cx="12" cy="12" r="10" stroke="white" stroke-width="2" fill="none" />
                            <path d="M9 12l2 2 4-4" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                        </svg>
                        <h2>Your Payment Has Been Confirmed</h2>
                    </div>
                    <div class="confirmation-body">
                        <p>We've received your payment for the Business Valuation Service.</p>
                        <p>The next step is to complete our seller questionnaire so we can provide you with an accurate valuation of your business.</p>
                        
                        <a href="/seller-questionnaire/basics" class="btn-next">
                            Continue to Questionnaire
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                        </a>
                    </div>
                </div>
                
                <div class="steps-container">
                    <h3 class="step-header">What Happens Next?</h3>
                    <ul class="steps-list">
                        <li class="step-item">
                            <span class="step-number">1</span>
                            <div class="step-content">
                                <h4 class="step-title">Complete the Questionnaire</h4>
                                <p class="step-description">Provide detailed information about your business to help us generate an accurate valuation.</p>
                            </div>
                        </li>
                        <li class="step-item">
                            <span class="step-number">2</span>
                            <div class="step-content">
                                <h4 class="step-title">Review Your Valuation</h4>
                                <p class="step-description">We'll analyze your business data and present you with a comprehensive valuation report.</p>
                            </div>
                        </li>
                        <li class="step-item">
                            <span class="step-number">3</span>
                            <div class="step-content">
                                <h4 class="step-title">Get Expert Insights</h4>
                                <p class="step-description">Receive detailed analysis on your business's strengths, opportunities, and recommendations for maximizing value.</p>
                            </div>
                        </li>
                    </ul>
                </div>
            </div>
        </main>

        <footer class="site-footer">
            <div class="container mx-auto px-4 sm:px-6 lg:px-8">
                <div class="text-center">
                    <p>&copy; <%= new Date().getFullYear() %> Arzani. All rights reserved.</p>
                </div>
            </div>
        </footer>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            // Store a flag in localStorage to indicate they've completed payment
            localStorage.setItem('valuation_payment_complete', 'true');
            localStorage.setItem('valuation_payment_time', Date.now().toString());

            // Set a cookie as a backup method for tracking completion
            document.cookie = "valuation_payment_complete=true; path=/; max-age=86400"; // 24 hours
            
            // Auto-redirect to questionnaire after 5 seconds
            const redirectDelay = 5000; // 5 seconds
            
            // Show countdown
            const countdownElement = document.createElement('div');
            countdownElement.style.textAlign = 'center';
            countdownElement.style.marginTop = '2rem';
            countdownElement.style.fontSize = '0.9rem';
            countdownElement.style.color = '#6b7280';
            document.querySelector('.confirmation-body').appendChild(countdownElement);
            
            let secondsLeft = redirectDelay / 1000;
            
            const updateCountdown = () => {
                countdownElement.textContent = \`Automatically continuing to questionnaire in \${secondsLeft} seconds...\`;
                secondsLeft--;
                
                if (secondsLeft < 0) {
                    clearInterval(countdownInterval);
                }
            };
            
            updateCountdown();
            const countdownInterval = setInterval(updateCountdown, 1000);
            
            // Set the timer for redirect
            setTimeout(() => {
                window.location.href = '/seller-questionnaire/basics';
            }, redirectDelay);
        });
    </script>
</body>
</html>`;

    // Write the file to a new location
    const outputPath = path.join(__dirname, 'views', 'valuation-confirmation-fixed.ejs');
    fs.writeFileSync(outputPath, finalContent, 'utf8');
    
    console.log(`Conversion complete. UTF-8 file written to: ${outputPath}`);
    console.log(`\nYou can copy the content from this file and replace your original file.`);
    
} catch (error) {
    console.error(`Error during conversion: ${error.message}`);
}
