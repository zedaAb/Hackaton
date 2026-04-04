const pool = require('../config/db');
const { extractIdentity } = require('./aiController');

const DEPARTMENTS = ['IS', 'IT', 'CS', 'Cyber', 'Software'];

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

// Upload bulk exam: 1 question + 1 teacher answer + many student answer images
// AI extracts student ID/name from each paper and matches to DB
const uploadBulkExam = async (req, res) => {
  const { department, assignment_id } = req.body;
  const files = req.files || {};

  if (!department || !DEPARTMENTS.includes(department))
    return res.status(400).json({ message: 'Valid department is required' });

  const questionFile = files['question_image']?.[0];
  const teacherFile  = files['teacher_answer_image']?.[0];
  const studentFiles = files['student_answer_images'] || [];

  if (!questionFile)             return res.status(400).json({ message: 'Exam question image is required' });
  if (!teacherFile)              return res.status(400).json({ message: 'Teacher answer image is required' });
  if (studentFiles.length === 0) return res.status(400).json({ message: 'At least one student answer image is required' });

  const questionUrl = `uploads/${questionFile.filename}`;
  const teacherUrl  = `uploads/${teacherFile.filename}`;
  const results     = [];

  for (const studentFile of studentFiles) {
    const studentUrl  = `uploads/${studentFile.filename}`;
    const studentPath = studentFile.path;

    // AI extracts student ID and name from the paper
    const identity = await extractIdentity(studentPath);

    let dbStudentId = null;
    let matchedName = identity.student_name || 'Unknown';

    // Match by student_id
    if (identity.student_id) {
      const match = await pool.query(
        `SELECT id, name FROM users
         WHERE role='student' AND department=$1
           AND (student_id ILIKE $2 OR student_id ILIKE $3)`,
        [department, identity.student_id, `%${identity.student_id}%`]
      );
      if (match.rows[0]) { dbStudentId = match.rows[0].id; matchedName = match.rows[0].name; }
    }

    // Fallback: match by name
    if (!dbStudentId && identity.student_name) {
      const nameMatch = await pool.query(
        `SELECT id, name FROM users
         WHERE role='student' AND department=$1 AND name ILIKE $2`,
        [department, `%${identity.student_name}%`]
      );
      if (nameMatch.rows[0]) { dbStudentId = nameMatch.rows[0].id; matchedName = nameMatch.rows[0].name; }
    }

    if (!dbStudentId) {
      results.push({
        file: studentFile.originalname, status: 'unmatched',
        extracted_id: identity.student_id, extracted_name: identity.student_name,
        message: 'Could not match to a registered student in this department',
      });
      continue;
    }

    // Skip duplicate
    if (assignment_id) {
      const exists = await pool.query(
        'SELECT id FROM submissions WHERE student_id=$1 AND assignment_id=$2',
        [dbStudentId, assignment_id]
      );
      if (exists.rows.length > 0) {
        results.push({ file: studentFile.originalname, status: 'skipped', student_name: matchedName, message: 'Already submitted' });
        continue;
      }
    }

    const r = await pool.query(
      `INSERT INTO submissions
         (student_id, assignment_id, image_url, question_image_url, teacher_answer_image_url,
          submission_type, status, department)
       VALUES ($1,$2,$3,$4,$5,'image','submitted',$6) RETURNING id`,
      [dbStudentId, assignment_id || null, studentUrl, questionUrl, teacherUrl, department]
    );

    results.push({
      file: studentFile.originalname, status: 'created',
      submission_id: r.rows[0].id, student_name: matchedName,
      extracted_id: identity.student_id, extracted_name: identity.student_name,
    });
  }

  const created   = results.filter((r) => r.status === 'created').length;
  const unmatched = results.filter((r) => r.status === 'unmatched').length;
  const skipped   = results.filter((r) => r.status === 'skipped').length;

  res.status(201).json({
    message: `${created} submission(s) created, ${unmatched} unmatched, ${skipped} skipped`,
    results,
  });
};

// Get all image submissions (for AI grading page)
const getTeacherSubmissions = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, u.name as student_name, u.student_id as student_code,
              u.department as student_department,
              COALESCE(a.title, 'General Exam') as assignment_title,
              COALESCE(a.max_marks, 100) as max_marks
       FROM submissions s
       JOIN users u ON s.student_id = u.id
       LEFT JOIN assignments a ON s.assignment_id = a.id
       WHERE s.submission_type = 'image' AND s.question_image_url IS NOT NULL
       ORDER BY s.department, u.name, s.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get students by department
const getStudentsByDept = async (req, res) => {
  const { department } = req.params;
  try {
    const result = await pool.query(
      `SELECT id, name, student_id, department, email
       FROM users WHERE role='student' AND department=$1 ORDER BY name`,
      [department]
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
      "SELECT id, name, email, student_id, department FROM users WHERE role='student' ORDER BY department, name"
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

module.exports = {
  createAssignment, getAssignments, uploadBulkExam,
  getTeacherSubmissions, getStudents, getStudentsByDept, setAnswerKey,
};
