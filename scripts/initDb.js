const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function initSchema() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    const sqlPath = path.join(__dirname, '..', 'config', 'database.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await client.connect();
    console.log('Connected to automated_AI database');
    
    await client.query(sql);
    console.log('Tables created successfully from database.sql');
  } catch (err) {
    console.error('Error initializing schema:', err.message);
  } finally {
    await client.end();
  }
}

initSchema();
