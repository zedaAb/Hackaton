const pool = require('../config/db');
const bcrypt = require('bcryptjs');

// Get all users
const getAllUsers = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete a user
const deleteUser = async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id=$1', [req.params.id]);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get system stats
const getStats = async (req, res) => {
  try {
    const users = await pool.query('SELECT role, COUNT(*) as count FROM users GROUP BY role');
    const submissions = await pool.query(
      `SELECT COUNT(*) as total,
        COUNT(CASE WHEN status='graded' THEN 1 END) as graded,
        ROUND(AVG(CASE WHEN status='graded' THEN grade END), 2) as avg_grade
       FROM submissions`
    );
    res.json({ users: users.rows, submissions: submissions.rows[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get all submissions
const getAllSubmissions = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, u.name as student_name, a.title as assignment_title, t.name as teacher_name
       FROM submissions s
       JOIN users u ON s.student_id = u.id
       JOIN assignments a ON s.assignment_id = a.id
       JOIN users t ON a.teacher_id = t.id
       ORDER BY s.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Register a new teacher securely
const registerTeacher = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1,$2,$3,'teacher')
       RETURNING id, name, email, role, created_at`,
      [name, email, hashed]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505' && err.constraint?.includes('email')) {
      return res.status(400).json({ message: 'Email already registered' });
    }
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getAllUsers, deleteUser, getStats, getAllSubmissions, registerTeacher };
