const pool = require('./config/db');

async function migrate() {
    try {
        await pool.query(`
            CREATE TABLE practice_sessions (
                id SERIAL PRIMARY KEY,
                student_id INT REFERENCES users(id) ON DELETE CASCADE,
                material_id INT REFERENCES materials(id) ON DELETE CASCADE,
                question_text TEXT NOT NULL,
                answer_text TEXT,
                grade DECIMAL(5, 2),
                ai_feedback TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Successfully created practice_sessions table');
        process.exit(0);
    } catch (err) {
        console.error('Error creating table:', err.message);
        process.exit(1);
    }
}

migrate();
