const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function listUsers() {
  try {
    const result = await pool.query('SELECT id, name, email, role, student_id, department, created_at FROM users');
    console.log('--- Registered Users ---');
    if (result.rows.length === 0) {
      console.log('No users found in the database.');
    } else {
      console.table(result.rows);
    }
  } catch (err) {
    console.error('Error fetching users:', err.message);
  } finally {
    await pool.end();
  }
}

listUsers();
