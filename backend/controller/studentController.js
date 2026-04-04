const pool = require('../config/db');
const { autoGradeText, chatWithMaterial, evaluateQASession } = require('./aiController');

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
       WHERE a.department IS NULL OR a.department = (SELECT department FROM users WHERE id = $1)
       ORDER BY a.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Student submits a text answer and/or PDF (exactly one: typed text OR uploaded PDF)
const submitAssignment = async (req, res) => {
  const { assignment_id, answer_text } = req.body;
  if (!assignment_id) return res.status(400).json({ message: 'Assignment is required' });

  try {
    const asg = await pool.query('SELECT id FROM assignments WHERE id=$1', [assignment_id]);
    if (!asg.rows[0]) return res.status(404).json({ message: 'Assignment not found' });

    const existing = await pool.query(
      'SELECT id FROM submissions WHERE student_id=$1 AND assignment_id=$2',
      [req.user.id, assignment_id]
    );
    if (existing.rows.length > 0)
      return res.status(400).json({ message: 'Already submitted this assignment' });

    const pdfFile = req.file;
    if (pdfFile) {
      if (answer_text?.trim())
        return res.status(400).json({ message: 'Submit either typed text or a PDF, not both' });
      const answer_pdf_url = `uploads/${pdfFile.filename}`;
      const result = await pool.query(
        `INSERT INTO submissions (student_id, assignment_id, submission_type, status, answer_pdf_url)
         VALUES ($1,$2,'pdf','submitted',$3) RETURNING *`,
        [req.user.id, assignment_id, answer_pdf_url]
      );
      return res.status(201).json(result.rows[0]);
    }

    if (!answer_text?.trim())
      return res.status(400).json({ message: 'Type your answer or upload a PDF' });

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

// Get available materials for student based on their department
const getMaterials = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT m.*, u.name as teacher_name
       FROM materials m
       JOIN users u ON m.teacher_id = u.id
       WHERE m.department = (SELECT department FROM users WHERE id = $1)
       ORDER BY m.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get available worksheets (for the student's department)
const getWorksheets = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT w.*, u.name as teacher_name,
        EXISTS (
          SELECT 1 FROM worksheet_submissions s
          WHERE s.worksheet_id = w.id AND s.student_id = $1
        ) as already_submitted,
       (
         SELECT json_agg(json_build_object('id', m.id, 'title', m.title, 'file_url', m.file_url))
         FROM worksheet_materials wm
         JOIN materials m ON wm.material_id = m.id
         WHERE wm.worksheet_id = w.id
       ) as attached_materials
       FROM worksheets w
       JOIN users u ON w.teacher_id = u.id
       WHERE w.department = (SELECT department FROM users WHERE id = $1)
       ORDER BY w.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Submit a worksheet and instantly auto-grade
const submitWorksheet = async (req, res) => {
  const { worksheet_id, answer_text } = req.body;
  if (!worksheet_id || !answer_text?.trim()) 
    return res.status(400).json({ message: 'Worksheet and answer are required' });

  try {
    const ws = await pool.query('SELECT * FROM worksheets WHERE id=$1', [worksheet_id]);
    if (!ws.rows[0]) return res.status(404).json({ message: 'Worksheet not found' });

    const existing = await pool.query(
      'SELECT id FROM worksheet_submissions WHERE student_id=$1 AND worksheet_id=$2',
      [req.user.id, worksheet_id]
    );
    if (existing.rows.length > 0)
      return res.status(400).json({ message: 'Already submitted this worksheet' });

    const wSheet = ws.rows[0];

    // Grade instantly
    const analysis = await autoGradeText(wSheet.description, wSheet.file_url, wSheet.answer_key, answer_text.trim());

    const result = await pool.query(
      `INSERT INTO worksheet_submissions (student_id, worksheet_id, answer_text, grade, ai_feedback, ai_analysis)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        req.user.id, worksheet_id, answer_text.trim(),
        analysis.overall_grade, analysis.summary || '', JSON.stringify(analysis)
      ]
    );

    res.status(201).json({ success: true, submission: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get my worksheet submissions
const getMyWorksheetSubmissions = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, w.title as worksheet_title, w.course, w.description as worksheet_description, u.name as teacher_name
       FROM worksheet_submissions s
       JOIN worksheets w ON s.worksheet_id = w.id
       JOIN users u ON w.teacher_id = u.id
       WHERE s.student_id=$1
       ORDER BY s.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// AI QA: Chat with Tutor
const chatQA = async (req, res) => {
  const { session_id, material_id, message } = req.body;
  if (!message?.trim()) return res.status(400).json({ message: 'Message required' });

  try {
    let session;
    let mat;

    if (session_id) {
       const ps = await pool.query('SELECT p.*, m.file_url FROM ai_qa_sessions p JOIN materials m ON p.material_id = m.id WHERE p.id=$1 AND p.student_id=$2', [session_id, req.user.id]);
       if (!ps.rows[0]) return res.status(404).json({ message: 'Session not found' });
       session = ps.rows[0];
       mat = { file_url: session.file_url };
    } else {
       if (!material_id) return res.status(400).json({ message: 'material_id required' });
       const mQuery = await pool.query('SELECT * FROM materials WHERE id=$1', [material_id]);
       if (!mQuery.rows[0]) return res.status(404).json({ message: 'Material not found' });
       mat = mQuery.rows[0];

       const usr = await pool.query('SELECT department FROM users WHERE id=$1', [req.user.id]);
       if (usr.rows[0].department !== mat.department) return res.status(403).json({ message: 'Access denied' });

       const createRes = await pool.query(
         `INSERT INTO ai_qa_sessions (student_id, material_id, chat_history) VALUES ($1, $2, $3) RETURNING *`,
         [req.user.id, material_id, JSON.stringify([])]
       );
       session = createRes.rows[0];
    }

    if (session.grade != null) return res.status(400).json({ message: 'Session already graded/finished' });

    const history = session.chat_history || [];
    const newAiMessage = await chatWithMaterial(mat.file_url, history, message);

    history.push({ role: 'user', text: message });
    history.push({ role: 'model', text: newAiMessage });

    const result = await pool.query(
      `UPDATE ai_qa_sessions SET chat_history=$1 WHERE id=$2 RETURNING *`,
      [JSON.stringify(history), session.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// AI QA: Evaluate Session
const evaluateQA = async (req, res) => {
  const { session_id } = req.body;
  if (!session_id) return res.status(400).json({ message: 'Session ID required' });

  try {
    const ps = await pool.query(
      `SELECT p.*, m.file_url 
       FROM ai_qa_sessions p
       JOIN materials m ON p.material_id = m.id
       WHERE p.id=$1 AND p.student_id=$2`,
      [session_id, req.user.id]
    );
    if (!ps.rows[0]) return res.status(404).json({ message: 'Session not found' });
    if (ps.rows[0].grade != null) return res.status(400).json({ message: 'Already graded' });

    const session = ps.rows[0];
    const analysis = await evaluateQASession(session.file_url, session.chat_history || []);

    const result = await pool.query(
      `UPDATE ai_qa_sessions 
       SET grade=$1, ai_feedback=$2 
       WHERE id=$3 RETURNING *`,
      [analysis.overall_grade, JSON.stringify(analysis), session_id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get student's QA history
const getQAHistory = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, m.title as material_title 
       FROM ai_qa_sessions p
       JOIN materials m ON p.material_id = m.id
       WHERE p.student_id=$1 
       ORDER BY p.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { 
  getAvailableAssignments, submitAssignment, getMySubmissions, getStats, getMaterials,
  getWorksheets, submitWorksheet, getMyWorksheetSubmissions,
  chatQA, evaluateQA, getQAHistory
};
