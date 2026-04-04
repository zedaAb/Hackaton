const { Client } = require('pg');
require('dotenv').config();

async function testConnection(password) {
  const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: password,
    port: 5432,
  });

  try {
    await client.connect();
    console.log(`Connection SUCCESS with password: ${password}`);
    await client.end();
    return true;
  } catch (err) {
    console.log(`Connection FAILED with password: ${password} - ${err.message}`);
    return false;
  }
}

async function runTests() {
  await testConnection('Dawit@2721');
  await testConnection('Dawot@2721');
  await testConnection('Dawit');
  await testConnection('Dawot');
}

runTests();
