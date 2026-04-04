const router = require('express').Router();
const { verifyToken, requireRole } = require('../middlewares/auth');
const { getAvailableAssignments, submitAssignment, getMySubmissions, getStats } = require('../controller/studentController');
const { getAnalysis } = require('../controller/aiController');

router.use(verifyToken, requireRole('student'));

router.get('/assignments', getAvailableAssignments);
router.post('/submit', submitAssignment);
router.get('/submissions', getMySubmissions);
router.get('/stats', getStats);
router.get('/analysis/:id', getAnalysis);

module.exports = router;
