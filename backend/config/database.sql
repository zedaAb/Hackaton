-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'teacher', 'admin')),
    student_id VARCHAR(50) UNIQUE,        -- university student ID (students only)
    department VARCHAR(50),               -- IS, IT, CS, Cyber, Software (students only)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Assignments created by teachers
CREATE TABLE assignments (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    answer_key TEXT,                               -- correct answers / marking scheme set by teacher
    assignment_format VARCHAR(20) DEFAULT 'text',   -- 'text' | 'pdf' — how the task was given to students
    assignment_pdf_url TEXT,                      -- when assignment_format is 'pdf'
    teacher_id INT REFERENCES users(id) ON DELETE CASCADE,
    department VARCHAR(50),                       -- Added field for department filtering
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
    answer_pdf_url TEXT,                               -- student submitted answer as PDF
    extracted_text TEXT,
    ai_feedback TEXT,
    ai_analysis JSONB,
    grade DECIMAL(5, 2),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'graded')),
    owner_teacher_id INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reading Materials uploaded by teachers
CREATE TABLE materials (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    department VARCHAR(50) NOT NULL,
    teacher_id INT REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Worksheets (auto-graded interactive tasks)
CREATE TABLE worksheets (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    course VARCHAR(100) NOT NULL,
    department VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    file_url TEXT,
    answer_key TEXT NOT NULL,
    teacher_id INT REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Worksheet submissions (auto-graded immediately)
CREATE TABLE worksheet_submissions (
    id SERIAL PRIMARY KEY,
    student_id INT REFERENCES users(id) ON DELETE CASCADE,
    worksheet_id INT REFERENCES worksheets(id) ON DELETE CASCADE,
    answer_text TEXT NOT NULL,
    grade DECIMAL(5, 2),
    ai_feedback TEXT,
    ai_analysis JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mapping relation between worksheets and materials
CREATE TABLE worksheet_materials (
    worksheet_id INT REFERENCES worksheets(id) ON DELETE CASCADE,
    material_id INT REFERENCES materials(id) ON DELETE CASCADE,
    PRIMARY KEY (worksheet_id, material_id)
);

-- AI QA Sessions (Conversational tutor based on materials)
CREATE TABLE ai_qa_sessions (
    id SERIAL PRIMARY KEY,
    student_id INT REFERENCES users(id) ON DELETE CASCADE,
    material_id INT REFERENCES materials(id) ON DELETE CASCADE,
    chat_history JSONB DEFAULT '[]'::jsonb,
    grade DECIMAL(5, 2),
    ai_feedback TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
