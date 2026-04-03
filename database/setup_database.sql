-- setup_database.sql
-- Complete database setup script for Smart Edu Platform
-- Run this file to set up the database with all tables and SKIPS University data

-- ============================================
-- STEP 1: Create database if not exists
-- ============================================
CREATE DATABASE IF NOT EXISTS smart_edu_hack CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE smart_edu_hack;

-- ============================================
-- STEP 2: Drop existing tables (clean slate)
-- ============================================
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS live_sessions;
DROP TABLE IF EXISTS student_details;
DROP TABLE IF EXISTS university_info;
DROP TABLE IF EXISTS classroom_sessions;
DROP TABLE IF EXISTS documents;
DROP TABLE IF EXISTS assignments;
DROP TABLE IF EXISTS attendance;
DROP TABLE IF EXISTS timetable;
DROP TABLE IF EXISTS enrollments;
DROP TABLE IF EXISTS subjects;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- STEP 3: Create core tables (from schema.sql)
-- ============================================

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

-- ============================================
-- STEP 4: Create enhanced tables (new features)
-- ============================================

CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type ENUM('assignment_upload', 'due_date', 'class_starting', 'assignment_overdue', 'live_class_started') NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    related_id INT NULL,
    is_read BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_read (user_id, is_read),
    INDEX idx_created (created_at)
);

CREATE TABLE live_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subject_id INT NOT NULL,
    teacher_id INT NOT NULL,
    session_status ENUM('active', 'ended') DEFAULT 'active',
    peer_id VARCHAR(255) NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP NULL,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_subject_status (subject_id, session_status)
);

CREATE TABLE student_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    roll_no VARCHAR(20) UNIQUE,
    university VARCHAR(255),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE university_info (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    hod_name VARCHAR(100),
    hod_designation VARCHAR(100)
);

CREATE TABLE teacher_resources (
    id INT AUTO_INCREMENT PRIMARY KEY,
    teacher_id INT NOT NULL,
    subject_id INT NOT NULL,
    module_number INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_type VARCHAR(50),
    file_path VARCHAR(255) NOT NULL,
    upload_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    INDEX idx_teacher_subject (teacher_id, subject_id)
);


-- ============================================
-- STEP 4.1: Create Availability System Tables
-- ============================================

CREATE TABLE availability_slots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    teacher_id INT NOT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    mode ENUM('online', 'offline') NOT NULL DEFAULT 'online',
    max_students INT DEFAULT 1,
    status ENUM('open', 'closed') DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_teacher_date (teacher_id, date)
);

CREATE TABLE bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    slot_id INT NOT NULL,
    student_id INT NOT NULL,
    subject_id INT NOT NULL,
    topic VARCHAR(255) NOT NULL,
    description TEXT,
    status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
    teacher_notes TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (slot_id) REFERENCES availability_slots(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    INDEX idx_student_bookings (student_id, status)
);

CREATE TABLE booking_audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    action_type VARCHAR(50) NOT NULL,
    related_id INT,
    user_id INT,
    details TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- STEP 5: Insert SKIPS University data
-- ============================================

-- University metadata
INSERT INTO university_info (name, hod_name, hod_designation) VALUES
('SKIPS University', 'Dr. Rahul Vaghela', 'Head of Department');

-- Teachers/Faculty
INSERT INTO users (name, email, password, role) VALUES
('Shruti Malde', 'shruti.malde@skipsuniversity.edu.in', 'password123', 'teacher'),
('Chandrashekhar Kothari', 'chandrashekhar.kothari@skipsuniversity.edu.in', 'password123', 'teacher'),
('Nandini Vyas', 'nandini.vyas@skipsuniversity.edu.in', 'password123', 'teacher'),
('Anuradha Pandit', 'anuradha@skipsuniversity.edu.in', 'password123', 'teacher'),
('Nishith Parmar', 'Nishith@skipsuniversity.edu.in', 'password123', 'teacher'),
('Akshay Nagar', 'akshay.nagar@skipsuniversity.edu.in', 'password123', 'teacher'),
('Dhaval Vaja', 'dhaval.vaja@skipsuniversity.edu.in', 'password123', 'teacher'),
('Vivek Bhut', 'vivek.bhut@skipsuniversity.edu.in', 'password123', 'teacher');

-- IMSCIT Students (16 students)
INSERT INTO users (name, email, password, role) VALUES
('Asmi Patel', 'asmi.imscit24@skipsuniversity.edu.in', 'password123', 'student'),
('Ayaan Shaikh', 'aayan.imscit24@skipsuniversity.edu.in', 'password123', 'student'),
('Daksh Chajjer', 'daksh.c.imscit24@skipsuniversity.edu.in', 'password123', 'student'),
('Dev Majithia', 'dev.imscit24@skipsuniversity.edu.in', 'password123', 'student'),
('Devarsh Nayak', 'devarsh.imscit24@skipsuniversity.edu.in', 'password123', 'student'),
('Harshil Dani', 'harshil.imscit24@skipsuniversity.edu.in', 'password123', 'student'),
('Hasya Patel', 'hasya.imscit24@skipsuniversity.edu.in', 'password123', 'student'),
('Honey Shah', 'honey.imscit24@skipsuniversity.edu.in', 'password123', 'student'),
('Armaan Kazi', 'armaan.imscit24@skipsuniversity.edu.in', 'password123', 'student'),
('Nandini Khetan', 'nandini.imscit24@skipsuniversity.edu.in', 'password123', 'student'),
('Peksha Mandaliya', 'peksha.imscit24@skipsuniversity.edu.in', 'password123', 'student'),
('Shreya Jain', 'shreya.imscit24@skipsuniversity.edu.in', 'password123', 'student'),
('Tisha Vira', 'tisha.imscit24@skipsuniversity.edu.in', 'password123', 'student'),
('Vishva Patel', 'vishva.imscit24@skipsuniversity.edu.in', 'password123', 'student'),
('Yashvi Patel', 'yashvi.imscit24@skipsuniversity.edu.in', 'password123', 'student'),
('Gaurav Patel', 'gaurav.imscit24@skipsuniversity.edu.in', 'password123', 'student');

-- BCA Students (8 students)
INSERT INTO users (name, email, password, role) VALUES
('Aryan Prajapati', 'aryan.bca24@skipsuniversity.edu.in', 'password123', 'student'),
('Chetu Saxena', 'chaitanya.bca24@skipsuniversity.edu.in', 'password123', 'student'),
('Diya Acharya', 'diya.bca24@skipsuniversity.edu.in', 'password123', 'student'),
('Hemangi Parekh', 'hemangi.bca24@skipsuniversity.edu.in', 'password123', 'student'),
('Priya Patel', 'priya.bca24@skipsuniversity.edu.in', 'password123', 'student'),
('Pushp Rajput', 'pushpedra.bca24@skipsuniversity.edu.in', 'password123', 'student'),
('Sarhan Jargela', 'sarhan.bca24@skipsuniversity.edu.in', 'password123', 'student'),
('Yug Somani', 'yug.bca24@skipsuniversity.edu.in', 'password123', 'student');

-- Courses (Merged into one common class path)
INSERT INTO courses (name, code) VALUES
('IMSCIT & BCA Combined', 'SKIPS-2024');

-- Merged Subjects (All 9 subjects for the same class)
INSERT INTO subjects (course_id, name, teacher_id) VALUES
(1, 'Prompt Engineering', 1),
(1, 'Database Management System', 1),
(1, 'MIC & AI', 2),
(1, 'Emotional Intelligence', 3),
(1, 'Professional Competence', 4),
(1, 'Advanced Data Structures', 5),
(1, 'Java Programming', 6),
(1, 'Object Oriented Analysis & Design', 7),
(1, 'Business Statistics', 8);

-- Student Details with Roll Numbers (IMSCIT)
INSERT INTO student_details (user_id, roll_no, university) VALUES
(9, '2429001', 'SKIPS University'), (10, '2429002', 'SKIPS University'),
(11, '2429004', 'SKIPS University'), (12, '2429006', 'SKIPS University'),
(13, '2429007', 'SKIPS University'), (14, '2429009', 'SKIPS University'),
(15, '2429010', 'SKIPS University'), (16, '2429011', 'SKIPS University'),
(17, '2429018', 'SKIPS University'), (18, '2429019', 'SKIPS University'),
(19, '2429024', 'SKIPS University'), (20, '2429025', 'SKIPS University'),
(21, '2429028', 'SKIPS University'), (22, '2429030', 'SKIPS University'),
(23, '2429032', 'SKIPS University'), (24, '2429033', 'SKIPS University');

-- Student Details with Roll Numbers (BCA)
INSERT INTO student_details (user_id, roll_no, university) VALUES
(25, '2428002', 'SKIPS University'), (26, '2428003', 'SKIPS University'),
(27, '2428005', 'SKIPS University'), (28, '2428006', 'SKIPS University'),
(29, '2428007', 'SKIPS University'), (30, '2428008', 'SKIPS University'),
(31, '2428009', 'SKIPS University'), (32, '2428010', 'SKIPS University');

-- Enrollments (All 24 students in the Combined Course)
INSERT INTO enrollments (user_id, course_id) VALUES
(9, 1), (10, 1), (11, 1), (12, 1), (13, 1), (14, 1), (15, 1), (16, 1),
(17, 1), (18, 1), (19, 1), (20, 1), (21, 1), (22, 1), (23, 1), (24, 1),
(25, 1), (26, 1), (27, 1), (28, 1), (29, 1), (30, 1), (31, 1), (32, 1);

-- Unified Timetable for IMSCIT & BCA Combined (All students follow this)
INSERT INTO timetable (course_id, subject_id, day, start_time, end_time) VALUES
-- Monday
(1, 9, 'Monday', '08:00', '09:00'), (1, 1, 'Monday', '09:00', '10:00'),
(1, 2, 'Monday', '10:00', '11:00'), (1, 3, 'Monday', '11:00', '12:00'),
(1, 6, 'Monday', '12:00', '13:00'), (1, 7, 'Monday', '13:00', '14:00'),
(1, 4, 'Monday', '14:00', '15:00'), (1, 5, 'Monday', '15:00', '16:00'),
(1, 8, 'Monday', '16:00', '17:00'),
-- Tuesday
(1, 7, 'Tuesday', '08:00', '09:00'), (1, 1, 'Tuesday', '09:00', '10:00'),
(1, 2, 'Tuesday', '10:00', '11:00'), (1, 3, 'Tuesday', '11:00', '12:00'),
(1, 6, 'Tuesday', '12:00', '13:00'), (1, 8, 'Tuesday', '13:00', '14:00'),
(1, 4, 'Tuesday', '14:00', '15:00'), (1, 4, 'Tuesday', '15:00', '16:00'),
(1, 5, 'Tuesday', '16:00', '17:00'), (1, 9, 'Tuesday', '17:00', '18:00'),
-- Wednesday
(1, 8, 'Wednesday', '08:00', '09:00'), (1, 1, 'Wednesday', '09:00', '10:00'),
(1, 2, 'Wednesday', '10:00', '11:00'), (1, 5, 'Wednesday', '11:00', '12:00'),
(1, 5, 'Wednesday', '12:00', '13:00'), (1, 7, 'Wednesday', '13:00', '14:00'),
(1, 3, 'Wednesday', '14:00', '15:00'), (1, 4, 'Wednesday', '15:00', '16:00'),
(1, 9, 'Wednesday', '16:00', '17:00'),
-- Thursday
(1, 6, 'Thursday', '09:00', '10:00'), (1, 2, 'Thursday', '10:00', '11:00'),
(1, 3, 'Thursday', '11:00', '12:00'), (1, 4, 'Thursday', '12:00', '13:00'),
(1, 7, 'Thursday', '13:00', '14:00'), (1, 9, 'Thursday', '14:00', '15:00'),
(1, 8, 'Thursday', '15:00', '16:00'), (1, 5, 'Thursday', '16:00', '17:00'),
-- Friday
(1, 9, 'Friday', '08:00', '09:00'), (1, 3, 'Friday', '09:00', '10:00'),
(1, 1, 'Friday', '10:00', '11:00'), (1, 6, 'Friday', '11:00', '12:00'),
(1, 3, 'Friday', '12:00', '13:00'), (1, 7, 'Friday', '14:00', '15:00'),
(1, 4, 'Friday', '15:00', '16:00'), (1, 5, 'Friday', '16:00', '17:00'),
(1, 8, 'Friday', '17:00', '18:00');

-- Dummy Assignments
INSERT INTO assignments (subject_id, title, description, due_date) VALUES
(1, 'AI Prompt Design Project', 'Create 10 effective prompts for various AI scenarios.', '2025-12-30'),
(2, 'Database Normalization Exercise', 'Normalize the given database schema to 3NF.', '2025-12-28'),
(3, 'AI Ethics Essay', 'Write 1000 words on ethical implications of AI in healthcare.', '2026-01-05'),
(7, 'Java OOP Assignment', 'Implement a student management system using Java OOP concepts.', '2025-12-29'),
(9, 'Statistical Analysis Report', 'Analyze the given dataset and prepare a report.', '2026-01-10');

-- Initialize Classroom Sessions
INSERT INTO classroom_sessions (subject_id, is_active, whiteboard_data, chat_history) VALUES
(1, 0, '[]', '[]'), (2, 0, '[]', '[]'),
(3, 0, '[]', '[]'), (7, 0, '[]', '[]');

-- Dummy Documents for Courses
INSERT INTO documents (subject_id, title, filename) VALUES
-- IMSCIT Documents (Subject IDs 1, 2, 3)
(1, 'Course Introduction & Syllabus', 'syllabus.pdf'),
(1, 'Lecture 1: Basics of Prompt Engineering', 'lecture1.pdf'),
(2, 'Normalization Reference Guide', 'reference.pdf'),
(3, 'AI Ethics and Policies', 'ai_ethics.pdf'),
-- BCA Documents (Subject IDs 7, 8, 9)
(7, 'Java Object Oriented Concepts', 'java_guide.pdf'),
(7, 'Advanced Java Study Material', 'reference.pdf'),
(8, 'OOAD Design Patterns', 'lecture1.pdf'),
(9, 'Statistical Data Sets', 'db_template.pdf');

-- Initial Welcome Notifications for Students (IDs 9, 10, 25)
INSERT INTO notifications (user_id, type, title, message) VALUES
(9, 'assignment_upload', 'Welcome to IMSCIT!', 'Your semester 1 materials are now available in the Courses section.'),
(9, 'due_date', 'Profile Update', 'Please complete your student profile in the dashboard.'),
(10, 'assignment_upload', 'Welcome to IMSCIT!', 'Your semester 1 materials are now available in the Courses section.'),
(25, 'assignment_upload', 'Welcome to BCA!', 'Java Programming materials have been uploaded.');

-- ============================================
-- STEP 6: Success message
-- ============================================
SELECT 'Database setup complete! SKIPS University data loaded successfully.' AS Status;
SELECT COUNT(*) AS 'Total Students' FROM users WHERE role = 'student';
SELECT COUNT(*) AS 'Total Teachers' FROM users WHERE role = 'teacher';
SELECT COUNT(*) AS 'Total Subjects' FROM subjects;
SELECT COUNT(*) AS 'Total Assignments' FROM assignments;
