const router = require('express').Router();
const { verifyToken, requireRole } = require('../middlewares/auth');
const { bulkExam, assignmentPdf } = require('../middlewares/upload');
const {
  createAssignment, createAssignmentPdf, getAssignments, getAssignmentSubmissions, uploadBulkExam,
  getTeacherSubmissions, getStudents, getStudentsByDept, setAnswerKey,
  uploadMaterial, getTeacherMaterials, createWorksheet, getTeacherWorksheets,
} = require('../controller/teacherController');
const { gradeSubmission, getAnalysis } = require('../controller/aiController');

router.use(verifyToken, requireRole('teacher'));

router.get('/students', getStudents);
router.get('/students/dept/:department', getStudentsByDept);
router.post('/assignments', createAssignment);
router.post('/assignments/pdf', assignmentPdf, createAssignmentPdf);
router.get('/assignments', getAssignments);
router.put('/assignments/:id/answer-key', setAnswerKey);
router.get('/assignments/:id/submissions', getAssignmentSubmissions);
router.post('/upload-exam', bulkExam, uploadBulkExam);
router.get('/submissions', getTeacherSubmissions);
router.post('/grade/:id', gradeSubmission);
router.get('/analysis/:id', getAnalysis);

// Materials
const { materialFile } = require('../middlewares/upload');
router.post('/materials', materialFile, uploadMaterial);
router.get('/materials', getTeacherMaterials);

// Worksheets
const { worksheetFile } = require('../middlewares/upload');
router.post('/worksheets', worksheetFile, createWorksheet);
router.get('/worksheets', getTeacherWorksheets);

module.exports = router;
