// Test route to preview the Google OAuth callback loading screen
import express from 'express';

const testRouter = express.Router();

testRouter.get('/test-oauth-loading', (req, res) => {
  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Completing Google Sign-in...</title>
    <style>
        body { 
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            text-align: center; 
            padding: 50px; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            margin: 0;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            color: white;
        }
        
        .loading-container {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            backdrop-filter: blur(10px);
            max-width: 400px;
            width: 90%;
        }
        
        .arzani-logo {
            width: 120px;
            height: auto;
            margin: 0 auto 20px;
            display: block;
            animation: logoFloat 2s ease-in-out infinite;
            filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
        }
        
        @keyframes logoFloat {
            0%, 100% { 
                transform: translateY(0px) scale(1);
                opacity: 0.9;
            }
            50% { 
                transform: translateY(-10px) scale(1.05);
                opacity: 1;
            }
        }
        
        .loading-dots {
            display: inline-flex;
            gap: 4px;
            margin-left: 8px;
        }
        
        .loading-dots span {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: #667eea;
            animation: loadingDots 1.5s ease-in-out infinite;
        }
        
        .loading-dots span:nth-child(2) { animation-delay: 0.2s; }
        .loading-dots span:nth-child(3) { animation-delay: 0.4s; }
        
        @keyframes loadingDots {
            0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
            40% { transform: scale(1.2); opacity: 1; }
        }
        
        h2 {
            color: #333;
            margin: 20px 0 10px;
            font-size: 24px;
            font-weight: 600;
        }
        
        p {
            color: #666;
            margin: 10px 0;
            font-size: 16px;
            line-height: 1.5;
        }
        
        .success-checkmark {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: #10b981;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-right: 8px;
            opacity: 0;
            transform: scale(0);
            animation: checkmarkAppear 0.5s ease-out 1.5s forwards;
        }
        
        @keyframes checkmarkAppear {
            to {
                opacity: 1;
                transform: scale(1);
            }
        }
        
        .checkmark {
            width: 12px;
            height: 12px;
            border: 2px solid white;
            border-top: none;
            border-right: none;
            transform: rotate(-45deg);
            margin-top: -2px;
        }
        
        .test-note {
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(255, 255, 255, 0.9);
            color: #333;
            padding: 10px 15px;
            border-radius: 8px;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
    </style>
</head>
<body>
    <div class="test-note">🧪 Test Preview</div>
    <div class="loading-container">
        <img src="/images/arzani-logo.png" alt="Arzani" class="arzani-logo">
        <h2>Completing your sign-in<span class="loading-dots"><span></span><span></span><span></span></span></h2>
        <p>
            <span class="success-checkmark"><div class="checkmark"></div></span>
            Please wait while we redirect you to the marketplace.
        </p>
    </div>
    <script>
        // Test version - no actual redirect
        console.log('This is a test preview of the Google OAuth callback loading screen');
    </script>
</body>
</html>`;
  
  res.send(html);
});

export default testRouter;
