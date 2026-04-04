const router = require('express').Router();
const { verifyToken, requireRole } = require('../middlewares/auth');
const { single, tripleExam } = require('../middlewares/upload');
const {
  createAssignment, getAssignments, uploadExam, getSubmissions, getStudents, setAnswerKey
} = require('../controller/teacherController');
const { gradeSubmission, getAnalysis } = require('../controller/aiController');

router.use(verifyToken, requireRole('teacher'));

router.get('/students', getStudents);
router.post('/assignments', createAssignment);
router.get('/assignments', getAssignments);
router.put('/assignments/:id/answer-key', setAnswerKey);
router.post('/upload-exam', tripleExam, uploadExam);
router.get('/submissions', getSubmissions);
router.post('/grade/:id', gradeSubmission);
router.get('/analysis/:id', getAnalysis);

module.exports = router;
