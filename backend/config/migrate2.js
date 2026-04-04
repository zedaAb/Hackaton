const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const run = async () => {
  await pool.query(`ALTER TABLE assignments ADD COLUMN IF NOT EXISTS due_date TIMESTAMP`);
  await pool.query(`ALTER TABLE assignments ADD COLUMN IF NOT EXISTS max_marks INT DEFAULT 100`);
  await pool.query(`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS answer_text TEXT`);
  await pool.query(`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS submission_type VARCHAR(20) DEFAULT 'image'`);
  await pool.query(`ALTER TABLE submissions ALTER COLUMN image_url DROP NOT NULL`);
  console.log('Migration 2 done');
  pool.end();
};

run().catch(e => { console.error(e.message); pool.end(); });
