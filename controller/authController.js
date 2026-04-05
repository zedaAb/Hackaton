const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const DEPARTMENTS = ['IS', 'IT', 'CS', 'Cyber', 'Software'];

const register = async (req, res) => {
  const { name, email, password, role, student_id, department } = req.body;
  try {
    if (role !== 'student') {
      return res.status(403).json({ message: 'Only students can register publicly. Teachers must be registered by an Admin.' });
    }
    // Students require student_id and department
    if (role === 'student') {
      if (!student_id?.trim()) return res.status(400).json({ message: 'Student ID is required' });
      if (!department || !DEPARTMENTS.includes(department))
        return res.status(400).json({ message: 'Valid department is required' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (name, email, password, role, student_id, department)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, name, email, role, student_id, department`,
      [name, email || null, hashed, role,
       role === 'student' ? student_id.trim() : null,
       role === 'student' ? department : null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      if (err.constraint?.includes('student_id'))
        return res.status(400).json({ message: 'Student ID already registered' });
      if (err.constraint?.includes('email'))
        return res.status(400).json({ message: 'Email already registered' });
    }
    res.status(400).json({ message: err.message });
  }
};

const login = async (req, res) => {
  const { identifier, password } = req.body; // identifier = student_id OR email
  console.log('Login attempt:', { identifier, password: password ? '[HIDDEN]' : null });
  
  if (!identifier || !password)
    return res.status(400).json({ message: 'ID/Email and password are required' });
  try {
    // Try student_id first, then email
    const result = await pool.query(
      'SELECT * FROM users WHERE student_id=$1 OR email=$1',
      [identifier]
    );
    console.log('Query result:', result.rows.length, 'users found');
    
    const user = result.rows[0];
    if (!user) {
      console.log('No user found with identifier:', identifier);
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    console.log('Found user:', { id: user.id, name: user.name, email: user.email, role: user.role });
    
    const passwordMatch = await bcrypt.compare(password, user.password);
    console.log('Password match:', passwordMatch);
    
    if (!passwordMatch) {
      console.log('Password does not match for user:', user.email || user.student_id);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name, department: user.department, student_id: user.student_id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      token,
      user: {
        id: user.id, name: user.name, email: user.email,
        role: user.role, student_id: user.student_id, department: user.department,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { register, login };
