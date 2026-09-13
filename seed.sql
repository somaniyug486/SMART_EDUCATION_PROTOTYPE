-- seed.sql
INSERT INTO users (name, email, password, role) VALUES 
('Rahul Sharma', 'rahul@student.com', 'password123', 'student'),
('Priya Patel', 'priya@student.com', 'password123', 'student'),
('Amit Verma', 'amit@teacher.com', 'password123', 'teacher'), -- ID 3 (CSE Teacher)
('Suresh Raina', 'suresh@teacher.com', 'password123', 'teacher'), -- ID 4 (Physics Teacher)
('Anjali Gupta', 'anjali@teacher.com', 'password123', 'teacher'); -- ID 5 (Math Teacher)

INSERT INTO courses (name, code) VALUES 
('Computer Science', 'CSE-2024'),
('Mechanical Eng', 'ME-2024'),
('High School Sci', 'SCI-101');

INSERT INTO subjects (course_id, name, teacher_id) VALUES 
(1, 'Data Structures', 3),   -- Subj 1
(1, 'Web Development', 3),   -- Subj 2
(1, 'Database Systems', 3),  -- Subj 3
(3, 'Physics', 4),           -- Subj 4
(3, 'Mathematics', 5);       -- Subj 5

INSERT INTO enrollments (user_id, course_id) VALUES 
(1, 1), (1, 3), -- Rahul in CSE and High School (extra)
(2, 1);         -- Priya in CSE

-- Timetable (Populate ALL days to ensure visibility)
INSERT INTO timetable (course_id, subject_id, day, start_time, end_time) VALUES
(1, 1, 'Monday', '09:00', '10:00'), (1, 2, 'Monday', '11:00', '12:00'),
(1, 1, 'Tuesday', '09:00', '10:00'), (1, 3, 'Tuesday', '14:00', '15:00'),
(1, 2, 'Wednesday', '10:00', '11:00'), (1, 1, 'Wednesday', '12:00', '13:00'),
(1, 3, 'Thursday', '09:00', '10:00'), (1, 2, 'Thursday', '14:00', '15:00'),
(1, 1, 'Friday', '10:00', '11:00'), (1, 3, 'Friday', '15:00', '16:00'),
(3, 4, 'Monday', '08:00', '09:00'), (3, 5, 'Monday', '09:00', '10:00'); 

-- Dummy Assignments
INSERT INTO assignments (subject_id, title, description, due_date) VALUES
(1, 'Linked List Implementation', 'Implement a Doubly Linked List in C++.', '2025-01-15'),
(2, 'Personal Portfolio', 'Create a responsive portfolio using HTML/CSS.', '2025-01-20'),
(4, 'Motion Laws Essay', 'Write 500 words on Newton\'s 3rd Law.', '2025-01-10');

-- Init Classroom
INSERT INTO classroom_sessions (subject_id, is_active, whiteboard_data, chat_history) VALUES 
(1, 1, '[]', '[]'), (2, 0, '[]', '[]');
