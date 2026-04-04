const { Client } = require('pg');
require('dotenv').config();

async function createDatabase() {
  const url = process.env.DATABASE_URL;
  // Parse the URL to get the host, port, user and password, but connect to 'postgres' DB
  const parts = url.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
  if (!parts) {
    console.error('Invalid DATABASE_URL format');
    process.exit(1);
  }

  const [, user, password, host, port] = parts;
  // Decode password for the client
  const decodedPassword = decodeURIComponent(password);

  const client = new Client({
    user,
    host,
    database: 'postgres', // Connect to default postgres DB
    password: decodedPassword,
    port: parseInt(port),
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL (postgres database)');
    
    // Check if automated_AI exists
    const res = await client.query("SELECT 1 FROM pg_database WHERE datname='automated_AI'");
    if (res.rowCount === 0) {
      await client.query('CREATE DATABASE "automated_AI"');
      console.log('Database "automated_AI" created successfully!');
    } else {
      console.log('Database "automated_AI" already exists.');
    }
  } catch (err) {
    console.error('Error creating database:', err.message);
  } finally {
    await client.end();
  }
}

createDatabase();
