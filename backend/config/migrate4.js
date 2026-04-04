const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const run = async () => {
  await pool.query(`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS question_image_url TEXT`);
  await pool.query(`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS teacher_answer_image_url TEXT`);
  console.log('Migration 4 done');
  pool.end();
};

run().catch(e => { console.error(e.message); pool.end(); });
