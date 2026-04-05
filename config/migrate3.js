const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const run = async () => {
  await pool.query(`ALTER TABLE assignments ADD COLUMN IF NOT EXISTS answer_key TEXT`);
  console.log('Migration 3 done: answer_key column added');
  pool.end();
};

run().catch(e => { console.error(e.message); pool.end(); });
