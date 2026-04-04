const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/** Teacher may access if they own the assignment / bulk upload, or legacy row (no owner). */
const teacherMayAccessSubmission = (row, teacherId) => {
  const owner = row.assignment_teacher_id ?? row.owner_teacher_id;
  const legacy = row.assignment_id == null && row.owner_teacher_id == null;
  if (legacy) return true;
  return owner === teacherId;
};

const canViewAnalysis = (row, user) => {
  if (user.role === 'student') return row.student_id === user.id;
  if (user.role === 'teacher') return teacherMayAccessSubmission(row, user.id);
  return false;
};

const GRADING_PROMPT = `You are an expert academic grader. You will be given:
1. The EXAM QUESTION image
2. The TEACHER'S CORRECT ANSWER image (the marking scheme / model answer)
3. The STUDENT'S ANSWER image

Your grading rules:
- For factual/short-answer questions: award marks only if the student's answer matches the key facts in the teacher's answer.
- For explanation/essay questions: DO NOT require word-for-word matching. Award marks based on whether the student demonstrates understanding of the core concepts, even if phrased differently. Partial credit is allowed.
- For calculation questions: check method and final answer. Award partial marks for correct method even if the final answer is wrong.
- Compare the student's answer against the teacher's answer for each question and award marks fairly.

Return ONLY a valid JSON object — no markdown, no extra text:
{
  "extracted_text": "full text extracted from student answer",
  "overall_grade": 85,
  "grade_letter": "B",
  "performance_level": "Good",
  "summary": "Brief overall summary of student performance",
  "questions": [
    {
      "question_number": 1,
      "question_text": "the question as read from the exam",
      "question_type": "factual | explanation | calculation | other",
      "teacher_answer_summary": "brief summary of what the teacher's answer says",
      "student_answer": "what the student wrote",
      "marks_awarded": 8,
      "marks_total": 10,
      "score_percentage": 80,
      "grading_rationale": "Why these marks were awarded — reference both answers",
      "feedback": "Constructive feedback for the student",
      "correct_points": ["concept or fact the student got right"],
      "missed_points": ["concept or fact the student missed"]
    }
  ],
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "recommendations": [
    { "area": "Topic or skill area", "suggestion": "Specific actionable recommendation" }
  ],
  "study_resources": ["Topic to review 1", "Topic to review 2"]
}`;

const ASSIGNMENT_GRADING_PROMPT = `You are an expert academic grader. You will be given:
1. The ASSIGNMENT (questions/instructions) — as plain text and/or as a PDF
2. The TEACHER'S ANSWER KEY / marking scheme (plain text)
3. The STUDENT'S ANSWER — as plain text and/or as a PDF

Your grading rules:
- For factual/short-answer questions: award marks only if the student's answer matches the key facts in the teacher's answer key.
- For explanation/essay questions: DO NOT require word-for-word matching. Award partial credit when the student shows understanding.
- For calculation questions: check method and final answer; partial credit for correct method.
- Compare the student's work against the teacher's answer key and assignment fairly.

Return ONLY a valid JSON object — no markdown, no extra text (same schema as for image-based grading):
{
  "extracted_text": "full text taken from the student's answer (summarize if PDF)",
  "overall_grade": 85,
  "grade_letter": "B",
  "performance_level": "Good",
  "summary": "Brief overall summary of student performance",
  "questions": [
    {
      "question_number": 1,
      "question_text": "the question as inferred from the assignment",
      "question_type": "factual | explanation | calculation | other",
      "teacher_answer_summary": "brief summary of what the answer key expects",
      "student_answer": "what the student wrote or submitted",
      "marks_awarded": 8,
      "marks_total": 10,
      "score_percentage": 80,
      "grading_rationale": "Why these marks were awarded",
      "feedback": "Constructive feedback for the student",
      "correct_points": ["concept or fact the student got right"],
      "missed_points": ["concept or fact the student missed"]
    }
  ],
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "recommendations": [
    { "area": "Topic or skill area", "suggestion": "Specific actionable recommendation" }
  ],
  "study_resources": ["Topic to review 1", "Topic to review 2"]
}`;

const IDENTITY_PROMPT = `Look at this student exam paper image.
Extract the student's ID number and full name written on the paper (usually at the top).
Return ONLY a valid JSON object — no markdown, no extra text:
{
  "student_id": "the ID number found on the paper, or null if not found",
  "student_name": "the full name found on the paper, or null if not found"
}`;

const imageToInlineData = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  const mimeType = ext === '.png' ? 'image/png' : ext === '.pdf' ? 'application/pdf' : 'image/jpeg';
  const data = fs.readFileSync(filePath).toString('base64');
  return { inlineData: { data, mimeType } };
};

// Extract student identity from a paper image using AI
const extractIdentity = async (imagePath) => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent([IDENTITY_PROMPT, imageToInlineData(imagePath)]);
    const raw = result.response.text().replace(/```json|```/g, '').trim();
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return { student_id: null, student_name: null };
    return JSON.parse(match[0]);
  } catch {
    return { student_id: null, student_name: null };
  }
};

// Grade a single submission
const gradeSubmission = async (req, res) => {
  const { id } = req.params;
  try {
    const sub = await pool.query(
      `SELECT s.*, a.answer_key, a.title as assignment_title, a.max_marks,
              a.teacher_id as assignment_teacher_id,
              a.description as assignment_description,
              a.assignment_format, a.assignment_pdf_url
       FROM submissions s
       LEFT JOIN assignments a ON s.assignment_id = a.id
       WHERE s.id=$1`,
      [id]
    );
    if (!sub.rows[0]) return res.status(404).json({ message: 'Submission not found' });

    const submission = sub.rows[0];
    if (!teacherMayAccessSubmission(submission, req.user.id))
      return res.status(403).json({ message: 'Access denied' });
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    let contentParts = [];

    if (submission.submission_type === 'image') {
      if (!submission.question_image_url)
        return res.status(400).json({ message: 'Exam question image is missing' });
      if (!submission.teacher_answer_image_url)
        return res.status(400).json({ message: 'Teacher answer image is missing' });
      if (!submission.image_url)
        return res.status(400).json({ message: 'Student answer image is missing' });

      const questionPath = path.join(__dirname, '..', submission.question_image_url);
      const teacherPath  = path.join(__dirname, '..', submission.teacher_answer_image_url);
      const studentPath  = path.join(__dirname, '..', submission.image_url);

      for (const p of [questionPath, teacherPath, studentPath]) {
        if (!fs.existsSync(p)) return res.status(404).json({ message: `File not found: ${p}` });
      }

      contentParts = [
        GRADING_PROMPT,
        '\n\n=== IMAGE 1: EXAM QUESTION ===',
        imageToInlineData(questionPath),
        '\n\n=== IMAGE 2: TEACHER\'S CORRECT ANSWER ===',
        imageToInlineData(teacherPath),
        '\n\n=== IMAGE 3: STUDENT\'S ANSWER ===',
        imageToInlineData(studentPath),
      ];
    } else {
      if (!submission.answer_key)
        return res.status(400).json({ message: 'No answer key set for this assignment' });

      const hasTextAnswer = submission.answer_text?.trim();
      const hasPdfAnswer = submission.answer_pdf_url;
      if (!hasTextAnswer && !hasPdfAnswer)
        return res.status(400).json({ message: 'No student answer (text or PDF) found' });

      const fmt = submission.assignment_format || 'text';
      const parts = [ASSIGNMENT_GRADING_PROMPT, '\n\n=== TEACHER ANSWER KEY ===\n', submission.answer_key];

      if (fmt === 'pdf' && submission.assignment_pdf_url) {
        const ap = path.join(__dirname, '..', submission.assignment_pdf_url);
        if (!fs.existsSync(ap)) return res.status(404).json({ message: 'Assignment PDF not found on server' });
        parts.push('\n\n=== ASSIGNMENT (PDF) ===');
        parts.push(imageToInlineData(ap));
      } else {
        parts.push('\n\n=== ASSIGNMENT (TEXT) ===\n');
        parts.push(submission.assignment_description || '');
      }

      if (submission.submission_type === 'pdf' && submission.answer_pdf_url) {
        const sp = path.join(__dirname, '..', submission.answer_pdf_url);
        if (!fs.existsSync(sp)) return res.status(404).json({ message: 'Student answer PDF not found on server' });
        parts.push('\n\n=== STUDENT ANSWER (PDF) ===');
        parts.push(imageToInlineData(sp));
      } else {
        parts.push('\n\n=== STUDENT ANSWER (TEXT) ===\n');
        parts.push(submission.answer_text || '');
      }

      contentParts = parts;
    }

    const aiResult = await model.generateContent(contentParts);
    const rawText = aiResult.response.text();
    const cleaned = rawText.replace(/```json|```/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI did not return valid JSON');

    const analysis = JSON.parse(jsonMatch[0]);

    await pool.query(
      `UPDATE submissions
       SET grade=$1, ai_feedback=$2, extracted_text=$3, ai_analysis=$4, status='graded'
       WHERE id=$5`,
      [
        analysis.overall_grade,
        analysis.summary || '',
        analysis.extracted_text || submission.answer_text || '',
        JSON.stringify(analysis),
        id,
      ]
    );

    res.json({ success: true, analysis });
  } catch (err) {
    console.error('AI grading error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

const getAnalysis = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT s.*, COALESCE(a.title,'General Exam') as assignment_title, u.name as student_name,
              a.teacher_id as assignment_teacher_id
       FROM submissions s
       LEFT JOIN assignments a ON s.assignment_id = a.id
       JOIN users u ON s.student_id = u.id
       WHERE s.id=$1`,
      [id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: 'Not found' });
    const row = result.rows[0];
    if (!canViewAnalysis(row, req.user))
      return res.status(403).json({ message: 'Access denied' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const autoGradeText = async (description, fileUrl, answerKey, studentAnswer) => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const contentParts = [
      ASSIGNMENT_GRADING_PROMPT,
      '\n\n=== TEACHER ANSWER KEY ===\n', answerKey,
      '\n\n=== ASSIGNMENT (TEXT) ===\n', description,
      '\n\n=== STUDENT ANSWER (TEXT) ===\n', studentAnswer
    ];

    if (fileUrl) {
      const filePath = path.join(__dirname, '..', fileUrl);
      if (fs.existsSync(filePath)) {
        contentParts.push('\n\n=== ASSIGNMENT / WORKSHEET DOCUMENT ===');
        contentParts.push(imageToInlineData(filePath));
      }
    }

    const aiResult = await model.generateContent(contentParts);
    const cleaned = aiResult.response.text().replace(/```json|```/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI did not return valid JSON');
    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error('autoGradeText error:', err.message);
    throw err;
  }
};

module.exports = { gradeSubmission, getAnalysis, extractIdentity, autoGradeText };
