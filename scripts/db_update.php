<?php
// db_update.php
// Access this via browser: http://localhost/smart_edu_prototype/db_update.php
require 'api/db.php';

echo "<h1>Database Update Status</h1>";

try {
    // 1. Add visibility column to documents
    $stmt = $pdo->query("SHOW COLUMNS FROM documents LIKE 'visibility'");
    if ($stmt->fetch()) {
        echo "<p style='color:green'>&#10004; Column 'visibility' already exists in 'documents' table.</p>";
    } else {
        $pdo->exec("ALTER TABLE documents ADD COLUMN visibility ENUM('all', 'teacher_only') DEFAULT 'all'");
        echo "<p style='color:green'>&#10004; Successfully added 'visibility' column to 'documents' table.</p>";
    }

    // 3. Create teacher_resources if missing
    $pdo->exec("CREATE TABLE IF NOT EXISTS teacher_resources (
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
    )");
    echo "<p style='color:green'>&#10004; 'teacher_resources' table is ready.</p>";

    // 4. Create availability system tables if missing
    $pdo->exec("CREATE TABLE IF NOT EXISTS availability_slots (
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
    )");

    $pdo->exec("CREATE TABLE IF NOT EXISTS bookings (
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
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (slot_id) REFERENCES availability_slots(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
        INDEX idx_student_bookings (student_id, status)
    )");

    $pdo->exec("CREATE TABLE IF NOT EXISTS booking_audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        action_type VARCHAR(50) NOT NULL,
        related_id INT,
        user_id INT,
        details TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");
    echo "<p style='color:green'>&#10004; Availability & Booking system tables are ready.</p>";

    // 5. Add Saturday Demo Data
    $day = 'Saturday';
    // Clear existing Saturday entries to ensure a clean sync with the new demo data
    $pdo->prepare("DELETE FROM timetable WHERE day = ?")->execute([$day]);

    $pdo->exec("INSERT INTO timetable (course_id, subject_id, day, start_time, end_time) VALUES 
        (1, 9, 'Saturday', '08:00', '09:00'),
        (1, 1, 'Saturday', '09:00', '10:00'),
        (1, 2, 'Saturday', '10:00', '11:00'),
        (1, 3, 'Saturday', '11:00', '12:00'),
        (1, 6, 'Saturday', '12:00', '13:00'),
        (1, 7, 'Saturday', '13:00', '14:00'),
        (1, 4, 'Saturday', '14:00', '15:00'),
        (1, 5, 'Saturday', '15:00', '16:00')");
    echo "<p style='color:green'>&#10004; Updated full Saturday demo timetable entries.</p>";

    // 6. Ensure an active live session exists for today
    $checkLive = $pdo->query("SELECT COUNT(*) FROM live_sessions WHERE session_status = 'active'");
    if ($checkLive->fetchColumn() == 0) {
        $pdo->exec("INSERT INTO live_sessions (subject_id, teacher_id, session_status, peer_id, started_at) 
                   VALUES (1, 1, 'active', 'demo_peer_id', NOW())");
        echo "<p style='color:green'>&#10004; Started a demo live session for 'Prompt Engineering'.</p>";
    } else {
        echo "<p style='color:green'>&#10004; Active live session already exists.</p>";
    }

    echo "<h3>Update Complete! Demo data is now ready.</h3>";

} catch (PDOException $e) {
    echo "<p style='color:red'>&#10008; Error: " . htmlspecialchars($e->getMessage()) . "</p>";
}
?>