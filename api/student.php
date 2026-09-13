<?php
// api/student.php
require 'db.php';
session_start();
ob_clean(); // Safety
header('Content-Type: application/json');

$userId = $_SESSION['user_id'] ?? 0;
$action = $_GET['action'] ?? '';

try {
    if ($action === 'dashboard_stats') {
        $dayOfWeek = date('l');
        $stmt = $pdo->prepare("SELECT t.*, s.name as subject_name FROM timetable t JOIN enrollments e ON t.course_id = e.course_id JOIN subjects s ON t.subject_id = s.id WHERE e.user_id = ? AND t.day = ? ORDER BY t.start_time");
        $stmt->execute([$userId, $dayOfWeek]);
        echo json_encode(['name' => $_SESSION['name'], 'classes' => $stmt->fetchAll()]);

    } elseif ($action === 'courses') {
        // ... (Keep existing course logic) ...
        $stmt = $pdo->prepare("SELECT c.id as course_id, c.name as course_name, s.name as subject_name, s.id as subject_id FROM enrollments e JOIN courses c ON e.course_id = c.id JOIN subjects s ON c.id = s.course_id WHERE e.user_id = ?");
        $stmt->execute([$userId]);
        $rows = $stmt->fetchAll();
        $courses = [];
        foreach ($rows as $row) {
            $cid = $row['course_id'];
            if (!isset($courses[$cid]))
                $courses[$cid] = ['name' => $row['course_name'], 'subjects' => []];
            $courses[$cid]['subjects'][] = ['id' => $row['subject_id'], 'name' => $row['subject_name']];
        }
        echo json_encode(['courses' => array_values($courses)]);

    } elseif ($action === 'assignments') {
        // Fetch assignments for student's enrolled subjects
        $stmt = $pdo->prepare("
            SELECT a.*, s.name as subject_name 
            FROM assignments a 
            JOIN subjects s ON a.subject_id = s.id 
            JOIN enrollments e ON s.course_id = e.course_id 
            WHERE e.user_id = ?
            ORDER BY a.due_date ASC
        ");
        $stmt->execute([$userId]);
        echo json_encode(['assignments' => $stmt->fetchAll()]);

    } elseif ($action === 'attendance_log') {
        $stmt = $pdo->prepare("SELECT a.date, a.status, s.name as subject_name FROM attendance a JOIN subjects s ON a.subject_id = s.id WHERE a.user_id = ? ORDER BY a.date DESC");
        $stmt->execute([$userId]);
        echo json_encode(['log' => $stmt->fetchAll()]);

    } elseif ($action === 'get_materials') {
        $subjectId = $_GET['subject_id'] ?? 0;
        $stmt = $pdo->prepare("SELECT * FROM materials WHERE subject_id = ?");
        $stmt->execute([$subjectId]);
        echo json_encode(['files' => $stmt->fetchAll()]);

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
        $up = $pdo->prepare("INSERT INTO classroom_sessions (subject_id, is_active, chat_history) VALUES (?, 1, ?) ON DUPLICATE KEY UPDATE chat_history = ?");
        $jsonChat = json_encode($chat);
        $up->execute([$subjectId, $jsonChat, $jsonChat]);

        echo json_encode(['status' => 'ok']);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>