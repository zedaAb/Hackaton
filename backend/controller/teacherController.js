const pool = require('../config/db');

// Create assignment
const createAssignment = async (req, res) => {
  const { title, description, due_date, max_marks } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO assignments (title, description, teacher_id, due_date, max_marks)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [title, description, req.user.id, due_date || null, max_marks || 100]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get teacher's assignments
const getAssignments = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, COUNT(s.id) as submission_count
       FROM assignments a
       LEFT JOIN submissions s ON s.assignment_id = a.id
       WHERE a.teacher_id=$1
       GROUP BY a.id
       ORDER BY a.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Upload exam: question image + teacher answer image + student answer image
const uploadExam = async (req, res) => {
  const { student_id, assignment_id } = req.body;
  const files = req.files || {};

  const studentFile = files['student_answer_image']?.[0];
  const questionFile = files['question_image']?.[0];
  const teacherFile = files['teacher_answer_image']?.[0];

  if (!studentFile) return res.status(400).json({ message: 'Student answer image is required' });
  if (!questionFile) return res.status(400).json({ message: 'Exam question image is required' });
  if (!teacherFile) return res.status(400).json({ message: 'Teacher answer image is required' });

  try {
    const result = await pool.query(
      `INSERT INTO submissions
         (student_id, assignment_id, image_url, question_image_url, teacher_answer_image_url, submission_type, status)
       VALUES ($1,$2,$3,$4,$5,'image','submitted') RETURNING *`,
      [
        student_id,
        assignment_id,
        `uploads/${studentFile.filename}`,
        `uploads/${questionFile.filename}`,
        `uploads/${teacherFile.filename}`,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get all submissions for teacher's assignments
const getSubmissions = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, u.name as student_name, a.title as assignment_title, a.max_marks
       FROM submissions s
       JOIN users u ON s.student_id = u.id
       JOIN assignments a ON s.assignment_id = a.id
       WHERE a.teacher_id = $1
       ORDER BY s.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get all students
const getStudents = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email FROM users WHERE role='student' ORDER BY name"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Set / update answer key for an assignment
const setAnswerKey = async (req, res) => {
  const { id } = req.params;
  const { answer_key } = req.body;
  if (!answer_key?.trim()) return res.status(400).json({ message: 'Answer key cannot be empty' });
  try {
    const result = await pool.query(
      `UPDATE assignments SET answer_key=$1 WHERE id=$2 AND teacher_id=$3 RETURNING *`,
      [answer_key.trim(), id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: 'Assignment not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createAssignment, getAssignments, uploadExam, getSubmissions, getStudents, setAnswerKey };
