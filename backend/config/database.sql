-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'teacher', 'admin')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Assignments created by teachers
CREATE TABLE assignments (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    answer_key TEXT,                               -- correct answers / marking scheme set by teacher
    teacher_id INT REFERENCES users(id) ON DELETE CASCADE,
    due_date TIMESTAMP,
    max_marks INT DEFAULT 100,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Submissions: teacher uploads 3 images (question, teacher answer, student answer)
CREATE TABLE submissions (
    id SERIAL PRIMARY KEY,
    student_id INT REFERENCES users(id) ON DELETE CASCADE,
    assignment_id INT REFERENCES assignments(id) ON DELETE CASCADE,
    submission_type VARCHAR(20) DEFAULT 'image',       -- 'image' | 'text'
    question_image_url TEXT,                           -- exam question image
    image_url TEXT,                                    -- student answer image
    teacher_answer_image_url TEXT,                     -- teacher correct answer image
    answer_text TEXT,                                  -- student typed answer (text flow)
    extracted_text TEXT,
    ai_feedback TEXT,
    ai_analysis JSONB,
    grade DECIMAL(5, 2),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'graded')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
