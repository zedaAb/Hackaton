const pool = require('../config/db');
const path = require('path');
const { extractIdentity } = require('./aiController');

const DEPARTMENTS = ['IS', 'IT', 'CS', 'Cyber', 'Software'];

// Create assignment (text-based: full instructions in description)
const createAssignment = async (req, res) => {
  const { title, description, due_date, max_marks, assignment_format, department } = req.body;
  if (!title?.trim()) return res.status(400).json({ message: 'Title is required' });
  if (assignment_format === 'pdf')
    return res.status(400).json({ message: 'Use POST /teacher/assignments/pdf with a PDF file for PDF assignments' });
  if (!description?.trim())
    return res.status(400).json({ message: 'Assignment text or instructions are required' });
  if (!department || !DEPARTMENTS.includes(department))
    return res.status(400).json({ message: 'Valid department is required' });

  try {
    const result = await pool.query(
      `INSERT INTO assignments (title, description, teacher_id, due_date, max_marks, assignment_format, assignment_pdf_url, department)
       VALUES ($1,$2,$3,$4,$5,'text',NULL,$6) RETURNING *`,
      [title.trim(), description.trim(), req.user.id, due_date || null, max_marks || 100, department]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Create assignment with PDF document (questions / instructions in the PDF)
const createAssignmentPdf = async (req, res) => {
  const { title, description, due_date, max_marks, department } = req.body;
  if (!title?.trim()) return res.status(400).json({ message: 'Title is required' });
  if (!req.file) return res.status(400).json({ message: 'Assignment PDF file is required' });
  if (!department || !DEPARTMENTS.includes(department))
    return res.status(400).json({ message: 'Valid department is required' });

  const assignment_pdf_url = `uploads/${req.file.filename}`;
  try {
    const result = await pool.query(
      `INSERT INTO assignments (title, description, teacher_id, due_date, max_marks, assignment_format, assignment_pdf_url, department)
       VALUES ($1,$2,$3,$4,$5,'pdf',$6,$7) RETURNING *`,
      [title.trim(), description?.trim() || null, req.user.id, due_date || null, max_marks || 100, assignment_pdf_url, department]
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

// Get submissions for a specific assignment (teacher only)
const getAssignmentSubmissions = async (req, res) => {
  const { id } = req.params;
  try {
    // Verify teacher owns this assignment
    const asgCheck = await pool.query(
      'SELECT id FROM assignments WHERE id=$1 AND teacher_id=$2',
      [id, req.user.id]
    );
    if (!asgCheck.rows[0]) return res.status(403).json({ message: 'Access denied' });

    const result = await pool.query(
      `SELECT s.*, u.name as student_name, u.student_id as student_code, u.department as student_department
       FROM submissions s
       JOIN users u ON s.student_id = u.id
       WHERE s.assignment_id=$1
       ORDER BY s.created_at DESC`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Upload bulk exam: 1 question + 1 teacher answer + many student answer images
// AI extracts student ID/name from each paper and matches to DB
const uploadBulkExam = async (req, res) => {
  const { department, exam_type } = req.body;
  const files = req.files || {};

  if (!department || !DEPARTMENTS.includes(department))
    return res.status(400).json({ message: 'Valid department is required' });
  if (!exam_type || !['Midterm Exam', 'Final Exam'].includes(exam_type))
    return res.status(400).json({ message: 'Valid exam type (Midterm Exam or Final Exam) is required' });

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
    let identity = { student_id: null, student_name: null };
    try {
      identity = await extractIdentity(studentPath);
    } catch (err) {
      console.error('AI extraction failed for', studentFile.originalname, ':', err.message);
      // Continue without AI extraction
    }
    const filenameNoExt = path.parse(studentFile.originalname).name;

    const cleanId = (identity.student_id && identity.student_id !== '?') ? identity.student_id : null;
    const cleanName = (identity.student_name && identity.student_name !== '?') ? identity.student_name : null;

    let dbStudentId = null;
    let matchedName = cleanName || filenameNoExt || 'Unknown';

    // Match by student_id
    if (cleanId) {
      const match = await pool.query(
        `SELECT id, name FROM users
         WHERE role='student' AND department=$1
           AND (student_id ILIKE $2 OR student_id ILIKE $3)`,
        [department, cleanId, `%${cleanId}%`]
      );
      if (match.rows[0]) { dbStudentId = match.rows[0].id; matchedName = match.rows[0].name; }
    }

    // Fallback 1: match by name from OCR
    if (!dbStudentId && cleanName) {
      const nameMatch = await pool.query(
        `SELECT id, name FROM users
         WHERE role='student' AND department=$1 AND name ILIKE $2`,
        [department, `%${cleanName}%`]
      );
      if (nameMatch.rows[0]) { dbStudentId = nameMatch.rows[0].id; matchedName = nameMatch.rows[0].name; }
    }

    // Fallback 2: match by filename
    if (!dbStudentId) {
      const fnMatch = await pool.query(
        `SELECT id, name FROM users
         WHERE role='student' AND department=$1 
         AND (name ILIKE $2 OR student_id ILIKE $2)`,
        [department, `%${filenameNoExt}%`]
      );
      if (fnMatch.rows.length >= 1) { 
         // If exact 1 match, or multiple matches (take first)
         dbStudentId = fnMatch.rows[0].id; 
         matchedName = fnMatch.rows[0].name;
      }
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
    if (exam_type) {
      const exists = await pool.query(
        'SELECT id FROM submissions WHERE student_id=$1 AND exam_type=$2 AND submission_type=\'image\'',
        [dbStudentId, exam_type]
      );
      if (exists.rows.length > 0) {
        results.push({ file: studentFile.originalname, status: 'skipped', student_name: matchedName, message: `Already submitted ${exam_type}` });
        continue;
      }
    }

    const r = await pool.query(
      `INSERT INTO submissions
         (student_id, exam_type, image_url, question_image_url, teacher_answer_image_url,
          submission_type, status, department, owner_teacher_id)
       VALUES ($1,$2,$3,$4,$5,'image','submitted',$6,$7) RETURNING id`,
      [dbStudentId, exam_type, studentUrl, questionUrl, teacherUrl, department, req.user.id]
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

// Image submissions for this teacher only (assignment-owned or bulk-upload owner).
// Legacy rows with no assignment and no owner_teacher_id remain visible to all teachers.
const getTeacherSubmissions = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, u.name as student_name, u.student_id as student_code,
              u.department as student_department,
              COALESCE(s.exam_type, a.title, 'General Exam') as assignment_title,
              COALESCE(a.max_marks, 100) as max_marks
       FROM submissions s
       JOIN users u ON s.student_id = u.id
       LEFT JOIN assignments a ON s.assignment_id = a.id
       WHERE (
         (
           s.submission_type = 'image' AND s.question_image_url IS NOT NULL
           AND (
             COALESCE(a.teacher_id, s.owner_teacher_id) = $1
             OR (s.assignment_id IS NULL AND s.owner_teacher_id IS NULL)
           )
         )
         OR (
           s.submission_type IN ('text', 'pdf') AND s.assignment_id IS NOT NULL
           AND a.teacher_id = $1
         )
       )
       ORDER BY s.department NULLS LAST, u.name, s.created_at DESC`,
      [req.user.id]
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

// Upload reading material (PDF)
const uploadMaterial = async (req, res) => {
  const { title, description, department } = req.body;
  if (!title?.trim()) return res.status(400).json({ message: 'Title is required' });
  if (!req.file) return res.status(400).json({ message: 'Material file is required' });
  if (!department || !DEPARTMENTS.includes(department))
    return res.status(400).json({ message: 'Valid department is required' });

  const file_url = `uploads/${req.file.filename}`;
  try {
    const result = await pool.query(
      `INSERT INTO materials (title, description, file_url, department, teacher_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [title.trim(), description?.trim() || null, file_url, department, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get teacher's materials
const getTeacherMaterials = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM materials WHERE teacher_id=$1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Create a worksheet
const createWorksheet = async (req, res) => {
  const { title, course, department, description, answer_key, material_ids } = req.body;
  
  if (!title?.trim() || !course?.trim() || !description?.trim() || !answer_key?.trim())
    return res.status(400).json({ message: 'All fields are required' });
  if (!department || !DEPARTMENTS.includes(department))
    return res.status(400).json({ message: 'Valid department is required' });

  const file_url = req.file ? `uploads/${req.file.filename}` : null;
  let parsedMaterials = [];
  if (material_ids) {
    try {
      parsedMaterials = JSON.parse(material_ids);
    } catch {
      return res.status(400).json({ message: 'Invalid material_ids format' });
    }
  }

  try {
    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const wsResult = await client.query(
        `INSERT INTO worksheets (title, course, department, description, file_url, answer_key, teacher_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [title.trim(), course.trim(), department, description.trim(), file_url, answer_key.trim(), req.user.id]
      );
      const worksheet = wsResult.rows[0];

      for (const mId of parsedMaterials) {
        await client.query(
          `INSERT INTO worksheet_materials (worksheet_id, material_id) VALUES ($1, $2)`,
          [worksheet.id, mId]
        );
      }

      await client.query('COMMIT');
      res.status(201).json(worksheet);
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get teacher's worksheets
const getTeacherWorksheets = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT w.*, COUNT(s.id) as submission_count,
       (
         SELECT json_agg(json_build_object('id', m.id, 'title', m.title, 'file_url', m.file_url))
         FROM worksheet_materials wm
         JOIN materials m ON wm.material_id = m.id
         WHERE wm.worksheet_id = w.id
       ) as attached_materials
       FROM worksheets w
       LEFT JOIN worksheet_submissions s ON s.worksheet_id = w.id
       WHERE w.teacher_id=$1
       GROUP BY w.id
       ORDER BY w.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createAssignment, createAssignmentPdf, getAssignments, getAssignmentSubmissions, uploadBulkExam,
  getTeacherSubmissions, getStudents, getStudentsByDept, setAnswerKey,
  uploadMaterial, getTeacherMaterials, createWorksheet, getTeacherWorksheets
};
