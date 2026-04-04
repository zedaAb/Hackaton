const router = require('express').Router();
const { verifyToken, requireRole } = require('../middlewares/auth');
const { bulkExam } = require('../middlewares/upload');
const {
  createAssignment, getAssignments, uploadBulkExam,
  getTeacherSubmissions, getStudents, getStudentsByDept, setAnswerKey,
} = require('../controller/teacherController');
const { gradeSubmission, getAnalysis } = require('../controller/aiController');

router.use(verifyToken, requireRole('teacher'));

router.get('/students', getStudents);
router.get('/students/dept/:department', getStudentsByDept);
router.post('/assignments', createAssignment);
router.get('/assignments', getAssignments);
router.put('/assignments/:id/answer-key', setAnswerKey);
router.post('/upload-exam', bulkExam, uploadBulkExam);
router.get('/submissions', getTeacherSubmissions);
router.post('/grade/:id', gradeSubmission);
router.get('/analysis/:id', getAnalysis);

module.exports = router;
