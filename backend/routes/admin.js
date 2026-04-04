const router = require('express').Router();
const { verifyToken, requireRole } = require('../middlewares/auth');
const { getAllUsers, deleteUser, getStats, getAllSubmissions, registerTeacher } = require('../controller/adminController');

router.use(verifyToken, requireRole('admin'));

router.get('/users', getAllUsers);
router.delete('/users/:id', deleteUser);
router.get('/stats', getStats);
router.get('/submissions', getAllSubmissions);
router.post('/register-teacher', registerTeacher);

module.exports = router;
