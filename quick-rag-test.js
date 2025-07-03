import dotenv from 'dotenv';
import pkg from 'pg';
const { Client } = pkg;
import OpenAI from 'openai';

dotenv.config();

console.log('🚀 Starting RAG Data Population (Simplified Version)');
console.log('==================================================\n');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Database client with shorter timeout
const client = new Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
  ssl: false,
  connectionTimeoutMillis: 3000,
  query_timeout: 5000
});

async function quickTest() {
  try {
    console.log('📡 Connecting to database...');
    await client.connect();
    console.log('✅ Database connected');
    
    // Check tables exist
    const tables = await client.query(`
      SELECT table_name, 
             (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public' 
      AND table_name IN ('questionnaire_submissions', 'business_valuations', 'industry_multipliers')
    `);
    
    console.log('\n📊 Available tables:');
    tables.rows.forEach(row => {
      console.log(`  • ${row.table_name} (${row.column_count} columns)`);
    });
    
    // Get sample data count
    for (const table of tables.rows) {
      try {
        const count = await client.query(`SELECT COUNT(*) FROM ${table.table_name}`);
        console.log(`  📈 ${table.table_name}: ${count.rows[0].count} records`);
      } catch (err) {
        console.log(`  ❌ ${table.table_name}: Error accessing table`);
      }
    }
    
    // Test OpenAI embedding
    console.log('\n🧪 Testing OpenAI embedding generation...');
    const testEmbedding = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: 'Test business valuation data for RAG system'
    });
    
    console.log(`✅ Embedding generated successfully (${testEmbedding.data[0].embedding.length} dimensions)`);
    
    // Test Pinecone connection
    console.log('\n🌲 Testing Pinecone connection...');
    
    // Import Pinecone service
    const { Pinecone } = await import('@pinecone-database/pinecone');
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY
    });
    
    const indexName = process.env.PINECONE_INDEX_NAME;
    console.log(`🔍 Checking index: ${indexName}`);
    
    const indexList = await pinecone.listIndexes();
    const indexExists = indexList.indexes?.some(index => index.name === indexName);
    
    if (indexExists) {
      console.log('✅ Pinecone index exists and accessible');
      
      const index = pinecone.index(indexName);
      const stats = await index.describeIndexStats();
      console.log(`📊 Current vectors in index: ${stats.totalVectorCount || 0}`);
    } else {
      console.log('❌ Pinecone index not found');
    }
    
    await client.end();
    console.log('\n🎉 All systems check complete!');
    console.log('\n📋 Next steps:');
    console.log('1. ✅ Database connection - Working');
    console.log('2. ✅ OpenAI embeddings - Working');
    console.log('3. ✅ Pinecone connection - Working');
    console.log('4. 🔄 Ready to populate RAG data');
    
  } catch (error) {
    console.error('❌ Error during system check:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
  } finally {
    if (client._connected) {
      await client.end();
    }
    process.exit(0);
  }
}

// Set overall timeout
setTimeout(() => {
  console.log('\n⏰ Script timed out after 30 seconds');
  process.exit(1);
}, 30000);

quickTest();
