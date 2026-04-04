const pool = require('./config/db');

async function migrate() {
    try {
        await pool.query('DROP TABLE IF EXISTS practice_sessions CASCADE;');
        await pool.query(`
            CREATE TABLE ai_qa_sessions (
                id SERIAL PRIMARY KEY,
                student_id INT REFERENCES users(id) ON DELETE CASCADE,
                material_id INT REFERENCES materials(id) ON DELETE CASCADE,
                chat_history JSONB DEFAULT '[]'::jsonb,
                grade DECIMAL(5, 2),
                ai_feedback TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Successfully created ai_qa_sessions schema');
        process.exit(0);
    } catch (err) {
        console.error('Error creating table:', err.message);
        process.exit(1);
    }
}

migrate();
