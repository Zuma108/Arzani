import dotenv from 'dotenv';
dotenv.config();
import pool from '../db.js';
import minimist from 'minimist'; // Ensure minimist is installed (npm install minimist)

async function deleteListings() {
  const args = minimist(process.argv.slice(2));
  
  if (args.id) {
    const id = parseInt(args.id, 10);
    if (isNaN(id)) {
      console.error('Invalid id provided.');
      process.exit(1);
    }
    try {
      const result = await pool.query(
        'DELETE FROM businesses WHERE id = $1 RETURNING *',
        [id]
      );
      console.log(`Deleted listing with id ${id}:`, result.rows);
    } catch (err) {
      console.error('Error deleting listing by id:', err);
    } finally {
      pool.end();
    }
  } else if (args.category) {
    const category = args.category;
    try {
      const result = await pool.query(
        'DELETE FROM businesses WHERE category = $1 RETURNING *',
        [category]
      );
      console.log(`Deleted ${result.rowCount} listings with category "${category}".`);
    } catch (err) {
      console.error('Error deleting listings by category:', err);
    } finally {
      pool.end();
    }
  } else {
    console.log('Usage:');
    console.log('  node deleteListings.js --id=<LISTING_ID>');
    console.log('  node deleteListings.js --category=<CategoryName>');
    process.exit(0);
  }
}

deleteListings();
