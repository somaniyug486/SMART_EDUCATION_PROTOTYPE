-- schema.sql
DROP TABLE IF EXISTS attendance;
DROP TABLE IF EXISTS timetable;
DROP TABLE IF EXISTS classroom_sessions;
DROP TABLE IF EXISTS documents;
DROP TABLE IF EXISTS assignments; -- New Table
DROP TABLE IF EXISTS enrollments;
DROP TABLE IF EXISTS subjects;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    password VARCHAR(255),
    role ENUM('student', 'teacher')
);

CREATE TABLE courses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    code VARCHAR(20)
);

CREATE TABLE subjects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT,
    name VARCHAR(100),
    teacher_id INT,
    FOREIGN KEY (course_id) REFERENCES courses(id),
    FOREIGN KEY (teacher_id) REFERENCES users(id)
);

CREATE TABLE enrollments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    course_id INT,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (course_id) REFERENCES courses(id)
);

CREATE TABLE timetable (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT,
    subject_id INT,
    day VARCHAR(20),
    start_time TIME,
    end_time TIME,
    FOREIGN KEY (course_id) REFERENCES courses(id),
    FOREIGN KEY (subject_id) REFERENCES subjects(id)
);

CREATE TABLE attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    subject_id INT,
    date DATE,
    status ENUM('present', 'absent', 'late'),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (subject_id) REFERENCES subjects(id)
);

CREATE TABLE classroom_sessions (
    subject_id INT PRIMARY KEY,
    is_active BOOLEAN DEFAULT 0,
    whiteboard_data JSON,
    chat_history JSON,
    FOREIGN KEY (subject_id) REFERENCES subjects(id)
);

CREATE TABLE documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subject_id INT,
    title VARCHAR(255),
    filename VARCHAR(255),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id)
);

CREATE TABLE assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subject_id INT,
    title VARCHAR(255),
    description TEXT,
    due_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id)
);
