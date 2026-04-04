const router = require('express').Router();
const { verifyToken, requireRole } = require('../middlewares/auth');
const { studentAnswerPdf } = require('../middlewares/upload');
const { 
  getAvailableAssignments, submitAssignment, getMySubmissions, getStats, getMaterials,
  getWorksheets, submitWorksheet, getMyWorksheetSubmissions,
  chatQA, evaluateQA, getQAHistory
} = require('../controller/studentController');
const { getAnalysis } = require('../controller/aiController');

router.use(verifyToken, requireRole('student'));

router.get('/assignments', getAvailableAssignments);
router.post('/submit', studentAnswerPdf, submitAssignment);
router.get('/submissions', getMySubmissions);
router.get('/stats', getStats);
router.get('/analysis/:id', getAnalysis);
router.get('/materials', getMaterials);

router.get('/worksheets', getWorksheets);
router.post('/worksheets/submit', submitWorksheet);
router.get('/worksheets/submissions', getMyWorksheetSubmissions);

router.post('/qa/chat', chatQA);
router.post('/qa/evaluate', evaluateQA);
router.get('/qa/history', getQAHistory);

module.exports = router;
