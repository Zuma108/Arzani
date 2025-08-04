import { createProfessionalTables } from '../../migrations/create_professional_tables.js';
import { createRoleTables } from '../../migrations/create_role_tables.js';

/**
 * Initialize all database tables required for the application
 */
export async function initializeDatabase() {
  console.log('Initializing database tables...');
  
  try {
    // Create role management tables
    const roleTablesResult = await createRoleTables();
    if (!roleTablesResult.success) {
      console.warn('Warning: Could not create role tables:', roleTablesResult.error);
    }
    
    // Create professional verification tables
    const professionalTablesResult = await createProfessionalTables();
    if (!professionalTablesResult.success) {
      console.warn('Warning: Could not create professional tables:', professionalTablesResult.error);
    }
    
    console.log('Database initialization completed');
    return { success: true };
  } catch (error) {
    console.error('Error initializing database:', error);
    return { success: false, error: error.message };
  }
}

// Run directly if called as script
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeDatabase()
    .then(result => {
      if (result.success) {
        console.log('Database initialization completed successfully');
        process.exit(0);
      } else {
        console.error('Database initialization failed:', result.error);
        process.exit(1);
      }
    })
    .catch(err => {
      console.error('Unhandled error during database initialization:', err);
      process.exit(1);
    });
}
