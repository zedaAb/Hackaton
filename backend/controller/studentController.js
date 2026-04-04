const pool = require('../config/db');

// Get all available assignments (not yet submitted by this student)
const getAvailableAssignments = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, u.name as teacher_name,
        EXISTS (
          SELECT 1 FROM submissions s
          WHERE s.assignment_id = a.id AND s.student_id = $1
        ) as already_submitted
       FROM assignments a
       JOIN users u ON a.teacher_id = u.id
       ORDER BY a.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Student submits a text answer for an assignment
const submitAssignment = async (req, res) => {
  const { assignment_id, answer_text } = req.body;
  if (!answer_text?.trim()) return res.status(400).json({ message: 'Answer cannot be empty' });
  try {
    // Check not already submitted
    const existing = await pool.query(
      'SELECT id FROM submissions WHERE student_id=$1 AND assignment_id=$2',
      [req.user.id, assignment_id]
    );
    if (existing.rows.length > 0)
      return res.status(400).json({ message: 'Already submitted this assignment' });

    const result = await pool.query(
      `INSERT INTO submissions (student_id, assignment_id, answer_text, submission_type, status)
       VALUES ($1,$2,$3,'text','submitted') RETURNING *`,
      [req.user.id, assignment_id, answer_text.trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get student's own submissions with grades
const getMySubmissions = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, COALESCE(a.title, 'General Exam') as assignment_title,
              a.description, COALESCE(a.max_marks, 100) as max_marks,
              u.name as teacher_name
       FROM submissions s
       LEFT JOIN assignments a ON s.assignment_id = a.id
       LEFT JOIN users u ON a.teacher_id = u.id
       WHERE s.student_id = $1
       ORDER BY s.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get student stats
const getStats = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status='graded' THEN 1 END) as graded,
        COUNT(CASE WHEN status='submitted' THEN 1 END) as pending,
        ROUND(AVG(CASE WHEN status='graded' THEN grade END), 2) as average_grade
       FROM submissions WHERE student_id=$1`,
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getAvailableAssignments, submitAssignment, getMySubmissions, getStats };
