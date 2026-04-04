const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.fieldname}-${file.originalname}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.pdf'];
  const ext = path.extname(file.originalname).toLowerCase();
  allowed.includes(ext) ? cb(null, true) : cb(new Error('Invalid file type'));
};

const upload = multer({ storage, fileFilter });

// Single file (legacy)
const single = upload.single('exam');

// Bulk exam upload: 1 question + 1 teacher answer + many student answers
const bulkExam = upload.fields([
  { name: 'question_image', maxCount: 1 },
  { name: 'teacher_answer_image', maxCount: 1 },
  { name: 'student_answer_images', maxCount: 50 }, // multiple student papers
]);

const assignmentPdf = upload.single('assignment_pdf');
const studentAnswerPdf = upload.single('answer_pdf');
const materialFile = upload.single('material_file');
const worksheetFile = upload.single('worksheet_file');

module.exports = { single, bulkExam, assignmentPdf, studentAnswerPdf, materialFile, worksheetFile };
