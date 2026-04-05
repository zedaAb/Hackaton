const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const migrate = require('./config/migrate');

const app = express();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database initialization endpoint
app.get('/init-db', async (req, res) => {
  try {
    const { Client } = require('pg');
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    
    const sql = fs.readFileSync(path.join(__dirname, 'config', 'database.sql'), 'utf8');
    await client.query(sql);
    await client.end();
    
    res.json({ message: 'Database initialized successfully' });
  } catch (err) {
    console.error('Database init error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Test database connection
app.get('/test-db', async (req, res) => {
  try {
    const pool = require('./config/db');
    const result = await pool.query('SELECT NOW()');
    res.json({ message: 'Database connected', time: result.rows[0] });
  } catch (err) {
    console.error('Database test error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Test file upload
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
app.post('/test-upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  res.json({ message: 'File uploaded successfully', filename: req.file.filename });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/teacher', require('./routes/teacher'));
app.use('/api/student', require('./routes/student'));
app.use('/api/admin', require('./routes/admin'));

const PORT = process.env.PORT || 5000;
migrate().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
