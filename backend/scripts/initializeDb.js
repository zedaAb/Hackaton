const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const initializeDb = async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    const dbName = process.env.DATABASE_URL.split('/').pop().split('?')[0];
    console.log(`Connected to database: ${dbName}`);

    const sqlPath = path.join(__dirname, '../config/database.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Applying schema from database.sql...');
    await client.query(sql);
    console.log('Database tables created successfully!');
  } catch (err) {
    console.error('Error during database initialization:', err.message);
    if (err.message.includes('already exists')) {
      console.log('Note: Some tables or constraints already existed.');
    }
  } finally {
    await client.end();
  }
};

initializeDb();
