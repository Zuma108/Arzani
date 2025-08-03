// Test script to verify that the seller questionnaire routes are accessible without payment
import express from 'express';
import sellerQuestionnaireRoutes from './routes/sellerQuestionnaire.js';

const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set up the routes
app.use('/seller-questionnaire', sellerQuestionnaireRoutes);

// Test route to check if basics is accessible
app.get('/test-routes', (req, res) => {
    res.json({
        message: 'Route testing endpoints',
        routes: [
            '/seller-questionnaire/basics',
            '/seller-questionnaire/email',
            '/seller-questionnaire/form',
            '/seller-questionnaire/revenue'
        ]
    });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`✅ Test server running on http://localhost:${PORT}`);
    console.log('🔍 Testing routes:');
    console.log('  • /seller-questionnaire/basics - should be accessible without payment');
    console.log('  • /seller-questionnaire/email - should be accessible without payment');
    console.log('  • /seller-questionnaire/form - should be accessible without payment');
    console.log('  • /test-routes - shows available test routes');
    console.log('\nPress Ctrl+C to stop the test server');
});
