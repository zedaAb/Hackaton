const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const run = async () => {
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS student_id VARCHAR(50) UNIQUE`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(50)`);
  await pool.query(`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS department VARCHAR(50)`);
  console.log('Migration 6 done');
  pool.end();
};

run().catch(e => { console.error(e.message); pool.end(); });
