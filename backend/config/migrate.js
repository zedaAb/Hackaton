const pool = require('./db');

const migrate = async () => {
  try {
    await pool.query(`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS ai_analysis JSONB`);
    await pool.query(`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS answer_text TEXT`);
    await pool.query(`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS submission_type VARCHAR(20) DEFAULT 'image'`);
    await pool.query(`ALTER TABLE assignments ADD COLUMN IF NOT EXISTS due_date TIMESTAMP`);
    await pool.query(`ALTER TABLE assignments ADD COLUMN IF NOT EXISTS max_marks INT DEFAULT 100`);
    await pool.query(`ALTER TABLE assignments ADD COLUMN IF NOT EXISTS answer_key TEXT`);
    await pool.query(`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS question_image_url TEXT`);
    await pool.query(`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS teacher_answer_image_url TEXT`);
    // Ensure status constraint includes all valid values
    await pool.query(`ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submissions_status_check`);
    await pool.query(`ALTER TABLE submissions ADD CONSTRAINT submissions_status_check CHECK (status IN ('pending', 'submitted', 'graded'))`);
    console.log('Migrations complete');
  } catch (err) {
    console.error('Migration error:', err.message);
  }
};

module.exports = migrate;
