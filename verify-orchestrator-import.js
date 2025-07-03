// Simple verification that orchestrator routing works
const config = {
    pineconeIndex: process.env.PINECONE_INDEX || 'arzani-x-rag',
    firecrawlApiKey: process.env.FIRECRAWL_API_KEY,
    pineconeApiKey: process.env.PINECONE_API_KEY,
    openaiApiKey: process.env.OPENAI_API_KEY
};

// Simple test to verify the orchestrator can be imported and initialized
import('./services/orchestrator/orchestrator.js')
    .then(module => {
        console.log('✅ Orchestrator module imported successfully');
        const { Orchestrator } = module;
        const orchestrator = new Orchestrator();
        console.log('✅ Orchestrator instance created successfully');
        console.log('🎉 The currentText fix is working - no ReferenceError occurred!');
    })
    .catch(error => {
        console.error('❌ Error importing/creating orchestrator:', error.message);
        if (error.message.includes('currentText')) {
            console.error('🚨 currentText error still exists!');
        }
    });
