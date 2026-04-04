const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const migrate = require('./config/migrate');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/teacher', require('./routes/teacher'));
app.use('/api/student', require('./routes/student'));
app.use('/api/admin', require('./routes/admin'));

const PORT = process.env.PORT || 5000;
migrate().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
