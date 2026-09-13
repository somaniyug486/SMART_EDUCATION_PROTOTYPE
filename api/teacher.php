<?php
// api/teacher.php
require 'db.php';
session_start();
header('Content-Type: application/json');

$userId = $_SESSION['user_id'] ?? 0;
$action = $_GET['action'] ?? '';

// Helper to get raw POST
$postData = json_decode(file_get_contents('php://input'), true);

try {
    if ($action === 'my_schedule') {
        $stmt = $pdo->prepare("SELECT t.*, s.name as subject_name FROM timetable t JOIN subjects s ON t.subject_id = s.id WHERE s.teacher_id = ? ORDER BY t.day, t.start_time");
        $stmt->execute([$userId]);
        echo json_encode(['schedule' => $stmt->fetchAll()]);

    } elseif ($action === 'get_students_for_attendance') {
        // Get all students enrolled in a course taught by this teacher
        // LIMITATION: Demo assumes Teacher teaches Subject 1 (CSE).
        $subjectId = $_GET['subject_id'];

        $stmt = $pdo->prepare("
            SELECT u.id, u.name 
            FROM users u 
            JOIN enrollments e ON u.id = e.user_id 
            JOIN subjects s ON e.course_id = s.course_id 
            WHERE s.id = ? AND u.role = 'student'
        ");
        $stmt->execute([$subjectId]);
        echo json_encode(['students' => $stmt->fetchAll()]);

    } elseif ($action === 'submit_attendance') {
        $subjectId = $postData['subject_id'];
        $date = date('Y-m-d');
        $attendanceData = $postData['attendance']; // Array of {user_id: 1, status: 'present'}

        $sql = "INSERT INTO attendance (user_id, subject_id, date, status) VALUES (?, ?, ?, ?)";
        $stmt = $pdo->prepare($sql);

        foreach ($attendanceData as $rec) {
            $stmt->execute([$rec['user_id'], $subjectId, $date, $rec['status']]);
        }
        echo json_encode(['success' => true]);

    } elseif ($action === 'create_assignment') {
        $subjectId = $postData['subject_id'];
        $title = $postData['title'];
        $desc = $postData['description'];
        $due = $postData['due_date'];

        $stmt = $pdo->prepare("INSERT INTO assignments (subject_id, title, description, due_date) VALUES (?, ?, ?, ?)");
        $stmt->execute([$subjectId, $title, $desc, $due]);
        echo json_encode(['success' => true]);

    } elseif ($action === 'update_classroom') {
        // ... (Existing whiteboard logic) ...
        $sid = $postData['subject_id'] ?? 1;
        $wb = json_encode($postData['whiteboard']);
        $pdo->prepare("INSERT INTO classroom_sessions (subject_id, whiteboard_data) VALUES (?, ?) ON DUPLICATE KEY UPDATE whiteboard_data = ?")->execute([$sid, $wb, $wb]);
        echo json_encode(['success' => true]);
    }

    // ... File upload remains same ...

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>