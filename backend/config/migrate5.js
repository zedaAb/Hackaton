const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const run = async () => {
  // Drop the old check constraint and recreate with all needed values
  await pool.query(`
    ALTER TABLE submissions
      DROP CONSTRAINT IF EXISTS submissions_status_check
  `);
  await pool.query(`
    ALTER TABLE submissions
      ADD CONSTRAINT submissions_status_check
      CHECK (status IN ('pending', 'submitted', 'graded'))
  `);
  console.log('Migration 5 done: status constraint fixed');
  pool.end();
};

run().catch(e => { console.error(e.message); pool.end(); });
