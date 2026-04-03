<?php
/**
 * STUDENT API
 * Purpose: This file handles everything a student needs, like viewing their timetable,
 * checking attendance logs, joining live classes, and booking doubt sessions.
 */

require 'db.php';
session_start();
ob_clean(); // Safety: make sure no extra characters are sent to the browser.
header('Content-Type: application/json');

$userId = $_SESSION['user_id'] ?? 0;
$action = $_GET['action'] ?? '';

try {
    // FUNCTIONALITY: Dashboard Overview
// This fetches everything the student sees first: today's classes and any current live sessions.
    if ($action === 'dashboard_stats') {
        $dayOfWeek = date('l');
        // Fetch ALL classes for today from all courses
        $stmt = $pdo->prepare("
SELECT t.*, s.name as subject_name
FROM timetable t
JOIN subjects s ON t.subject_id = s.id
WHERE t.day = ?
ORDER BY t.start_time
");
        $stmt->execute([$dayOfWeek]);
        $timetable = $stmt->fetchAll();

        // Also fetch any currently active live sessions
        $liveStmt = $pdo->prepare("
SELECT ls.*, s.name as subject_name, u.name as teacher_name
FROM live_sessions ls
JOIN subjects s ON ls.subject_id = s.id
JOIN users u ON ls.teacher_id = u.id
WHERE ls.session_status = 'active'
");
        $liveStmt->execute();
        $liveSessions = $liveStmt->fetchAll();

        echo json_encode([
            'name' => $_SESSION['name'] ?? 'Student',
            'classes' => $timetable,
            'live_sessions' => $liveSessions
        ]);

        // FUNCTIONALITY: Course List
// Fetches all the subjects available in the platform.
    } elseif ($action === 'courses') {
        // Fetch ALL subjects from ALL courses as requested
        $stmt = $pdo->prepare("
SELECT c.name as course_name, s.name as subject_name, s.id as subject_id
FROM subjects s
JOIN courses c ON s.course_id = c.id
ORDER BY c.name, s.name
");
        $stmt->execute();
        $rows = $stmt->fetchAll();
        $courses = [];
        foreach ($rows as $row) {
            $cname = $row['course_name'];
            if (!isset($courses[$cname]))
                $courses[$cname] = ['name' => $cname, 'subjects' => []];
            $courses[$cname]['subjects'][] = ['id' => $row['subject_id'], 'name' => $row['subject_name']];
        }
        echo json_encode(['courses' => array_values($courses)]);

        // FUNCTIONALITY: Assignments
// Lists all homework/tasks assigned to students across all subjects.
    } elseif ($action === 'assignments') {
        // Fetch ALL assignments since all students learn every subject
        $stmt = $pdo->prepare("
SELECT a.*, s.name as subject_name
FROM assignments a
JOIN subjects s ON a.subject_id = s.id
ORDER BY a.due_date ASC
");
        $stmt->execute();
        echo json_encode(['assignments' => $stmt->fetchAll()]);

    } elseif ($action === 'attendance_log') {
        $stmt = $pdo->prepare("SELECT a.date, a.status, s.name as subject_name FROM attendance a JOIN subjects s ON a.subject_id
= s.id WHERE a.user_id = ? ORDER BY a.date DESC");
        $stmt->execute([$userId]);
        echo json_encode(['log' => $stmt->fetchAll()]);

    } elseif ($action === 'get_materials') {
        $subjectId = $_GET['subject_id'] ?? 0;
        $stmt = $pdo->prepare("SELECT * FROM documents WHERE subject_id = ?");
        $stmt->execute([$subjectId]);
        echo json_encode(['files' => $stmt->fetchAll()]);

        // FUNCTIONALITY: Live Classroom & Chat
// 'get_classroom_state' fetches the current whiteboard drawing and chat messages.
    } elseif ($action === 'get_classroom_state') {
        $subjectId = $_GET['subject_id'] ?? 1;
        $stmt = $pdo->prepare("SELECT whiteboard_data, chat_history FROM classroom_sessions WHERE subject_id = ?");
        $stmt->execute([$subjectId]);
        $res = $stmt->fetch();

        $wb = isset($res['whiteboard_data']) ? $res['whiteboard_data'] : null;
        $chat = isset($res['chat_history']) ? json_decode($res['chat_history'], true) : [];

        echo json_encode(['whiteboard' => $wb, 'chat' => $chat]);

    } elseif ($action === 'send_chat') {
        $input = json_decode(file_get_contents('php://input'), true);
        $subjectId = $input['subject_id'] ?? 1;
        $msg = $input['message'] ?? '';
        $sender = $_SESSION['name'] ?? 'User';

        if (empty($msg))
            exit;

        // Fetch current history
        $stmt = $pdo->prepare("SELECT chat_history FROM classroom_sessions WHERE subject_id = ?");
        $stmt->execute([$subjectId]);
        $row = $stmt->fetch();

        $chat = isset($row['chat_history']) ? json_decode($row['chat_history'], true) : [];
        if (!is_array($chat))
            $chat = [];

        // Append new message
        $chat[] = ['sender' => $sender, 'text' => $msg, 'time' => date('H:i')];

        // Save back
        $up = $pdo->prepare("INSERT INTO classroom_sessions (subject_id, is_active, chat_history) VALUES (?, 1, ?) ON DUPLICATE
KEY UPDATE chat_history = ?");
        $jsonChat = json_encode($chat);
        $up->execute([$subjectId, $jsonChat, $jsonChat]);

        echo json_encode(['status' => 'ok']);

    } elseif ($action === 'get_live_session') {
        // Get active live session for a subject
        $subjectId = $_GET['subject_id'] ?? 1;
        $stmt = $pdo->prepare("
SELECT ls.*, u.name as teacher_name
FROM live_sessions ls
JOIN users u ON ls.teacher_id = u.id
WHERE ls.subject_id = ? AND ls.session_status = 'active'
ORDER BY ls.started_at DESC LIMIT 1
");
        $stmt->execute([$subjectId]);
        $session = $stmt->fetch();

        echo json_encode([
            'success' => true,
            'session' => $session,
            'is_live' => $session ? true : false
        ]);

    } elseif ($action === 'get_teachers') {
        // Get teachers for subjects the student is enrolled in (in this prototype, everyone is in course 1)
        $stmt = $pdo->prepare("
SELECT DISTINCT u.id, u.name, s.name as subject_name, s.id as subject_id
FROM users u
JOIN subjects s ON s.teacher_id = u.id
WHERE u.role = 'teacher'
ORDER BY u.name
");
        $stmt->execute();
        echo json_encode(['teachers' => $stmt->fetchAll()]);

    } elseif ($action === 'get_availability') {
        $teacherId = $_GET['teacher_id'] ?? 0;
        $stmt = $pdo->prepare("
SELECT s.*,
(SELECT COUNT(*) FROM bookings b WHERE b.slot_id = s.id AND b.status != 'rejected') as current_bookings
FROM availability_slots s
WHERE s.teacher_id = ? AND s.date >= CURDATE() AND s.status = 'open'
HAVING current_bookings < s.max_students ORDER BY s.date ASC, s.start_time ASC ");
        $stmt->execute([$teacherId]);
        echo json_encode(['slots' => $stmt->fetchAll()]);

        // This allows students to reserve a " Doubt Slot" from a teacher's schedule. 
    } elseif ($action === 'book_slot') {
        $postData = json_decode(file_get_contents('php://input'), true);
        $slotId = $postData['slot_id'];
        $subjectId = $postData['subject_id'];
        $topic = $postData['topic'];
        $desc = $postData['description'];
        if (
            strlen($desc) <
            20
        ) {
            echo json_encode(['success' => false, 'message' => 'Description must be at least 20 characters.']);
            exit;
        }

        // Check if slot still has space
        $stmt = $pdo->prepare("
    SELECT s.*,
    (SELECT COUNT(*) FROM bookings b WHERE b.slot_id = s.id AND b.status != 'rejected') as current_bookings
    FROM availability_slots s WHERE s.id = ?
    ");
        $stmt->execute([$slotId]);
        $slot = $stmt->fetch();

        if (!$slot || $slot['current_bookings'] >= $slot['max_students'] || $slot['status'] !== 'open') {
            echo json_encode(['success' => false, 'message' => 'This slot is no longer available.']);
            exit;
        }

        // Check for overlapping bookings for this student
        $stmt = $pdo->prepare("
    SELECT COUNT(*) FROM bookings b
    JOIN availability_slots s ON b.slot_id = s.id
    WHERE b.student_id = ? AND b.status != 'rejected'
    AND s.date = ?
    AND s.start_time < ? AND s.end_time> ?
        ");
        $stmt->execute([$userId, $slot['date'], $slot['end_time'], $slot['start_time']]);

        if ($stmt->fetchColumn() > 0) {
            echo json_encode(['success' => false, 'message' => 'You already have another booking during this time.']);
            exit;
        }

        $stmt = $pdo->prepare("INSERT INTO bookings (slot_id, student_id, subject_id, topic, description) VALUES (?, ?,
        ?, ?, ?)");
        $stmt->execute([$slotId, $userId, $subjectId, $topic, $desc]);
        $bookingId = $pdo->lastInsertId();

        // Notify teacher
        $notifStmt = $pdo->prepare("INSERT INTO notifications (user_id, type, title, message, related_id) VALUES (?,
        'assignment_upload', ?, ?, ?)");
        $notifTitle = "New Doubt Session Booking";
        $notifMsg = "A student has booked a doubt session for topic: $topic";
        $notifStmt->execute([$slot['teacher_id'], $notifTitle, $notifMsg, $bookingId]);

        // Log action
        $logStmt = $pdo->prepare("INSERT INTO booking_audit_logs (action_type, related_id, user_id, details) VALUES
        ('booking_requested', ?, ?, ?)");
        $logStmt->execute([$bookingId, $userId, "Booking requested for slot $slotId"]);

        echo json_encode(['success' => true]);

    } elseif ($action === 'get_my_bookings') {
        $stmt = $pdo->prepare("
        SELECT b.*, s.date, s.start_time, s.end_time, s.mode, u.name as teacher_name, subj.name as subject_name
        FROM bookings b
        JOIN availability_slots s ON b.slot_id = s.id
        JOIN users u ON s.teacher_id = u.id
        JOIN subjects subj ON b.subject_id = subj.id
        WHERE b.student_id = ?
        ORDER BY s.date DESC, s.start_time DESC
        ");
        $stmt->execute([$userId]);
        echo json_encode(['bookings' => $stmt->fetchAll()]);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>