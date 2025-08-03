import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import pool from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = path.join(__dirname, '..');

async function initializeAIAssistant() {
  console.log('Initializing AI Assistant...');
  
  // 1. Ensure required directories exist
  const directories = [
    path.join(rootDir, 'public', 'images'),
    path.join(rootDir, 'public', 'css'),
    path.join(rootDir, 'public', 'js')
  ];
  
  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  });
  
  // 2. Ensure necessary database tables exist
  try {
    // Check if the assistant_interactions table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'assistant_interactions'
      )
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('AI Assistant tables not found, running migrations...');
      
      // Import and run the migration
      const { createAssistantTables } = await import('../migrations/create_assistant_interactions.js');
      await createAssistantTables();
      
      console.log('AI Assistant database tables created successfully');
    } else {
      console.log('AI Assistant database tables already exist');
    }
    
    // 3. Create example prompts if they don't exist
    const promptsCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'assistant_prompts'
      )
    `);
    
    if (!promptsCheck.rows[0].exists) {
      await pool.query(`
        CREATE TABLE assistant_prompts (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          prompt_text TEXT NOT NULL,
          category VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Insert some example prompts
      const examplePrompts = [
        {
          title: 'Find Business by Industry',
          prompt_text: 'Show me available businesses in the {industry} industry',
          category: 'search'
        },
        {
          title: 'Find Business by Location',
          prompt_text: 'What businesses are for sale in {location}?',
          category: 'search'
        },
        {
          title: 'Business Valuation',
          prompt_text: 'How much is my {industry} business with £{revenue} annual revenue worth?',
          category: 'valuation'
        },
        {
          title: 'Selling Tips',
          prompt_text: 'What documents do I need to prepare when selling my business?',
          category: 'selling'
        }
      ];
      
      for (const prompt of examplePrompts) {
        await pool.query(
          `INSERT INTO assistant_prompts (title, prompt_text, category) 
           VALUES ($1, $2, $3)`,
          [prompt.title, prompt.prompt_text, prompt.category]
        );
      }
      
      console.log('Created assistant prompts table with example prompts');
    }
    
    console.log('AI Assistant initialization completed successfully');
  } catch (error) {
    console.error('Error initializing AI Assistant:', error);
    throw error;
  }
}

// Execute if this script is run directly
if (process.argv[1].endsWith('init-ai-assistant.js')) {
  initializeAIAssistant()
    .then(() => {
      console.log('AI Assistant initialization complete');
      process.exit(0);
    })
    .catch(err => {
      console.error('AI Assistant initialization failed:', err);
      process.exit(1);
    });
}

export { initializeAIAssistant };
