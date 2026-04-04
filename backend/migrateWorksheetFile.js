const pool = require('./config/db');

async function migrate() {
    try {
        await pool.query(`ALTER TABLE worksheets ADD COLUMN file_url TEXT;`);
        console.log('Successfully added file_url to worksheets');
        process.exit(0);
    } catch (err) {
        console.error('Error altering table:', err.message);
        process.exit(1);
    }
}

migrate();
