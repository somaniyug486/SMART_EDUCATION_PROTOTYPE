<?php
// api/notifications.php
require 'db.php';
session_start();
header('Content-Type: application/json');

$userId = $_SESSION['user_id'] ?? 0;
$action = $_GET['action'] ?? '';

$postData = json_decode(file_get_contents('php://input'), true);

try {
    if ($action === 'get_notifications') {
        $limit = (int) ($_GET['limit'] ?? 50);
        $stmt = $pdo->prepare("
            SELECT * FROM notifications 
            WHERE user_id = ? 
            ORDER BY created_at DESC 
            LIMIT $limit
        ");
        $stmt->execute([$userId]);
        $notifications = $stmt->fetchAll();

        // Count unread
        $unreadStmt = $pdo->prepare("SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0");
        $unreadStmt->execute([$userId]);
        $unreadCount = $unreadStmt->fetch()['count'];

        echo json_encode([
            'success' => true,
            'notifications' => $notifications,
            'unread_count' => $unreadCount
        ]);

    } elseif ($action === 'mark_read') {
        $notificationId = $postData['notification_id'] ?? 0;
        $stmt = $pdo->prepare("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?");
        $stmt->execute([$notificationId, $userId]);
        echo json_encode(['success' => true]);

    } elseif ($action === 'mark_all_read') {
        $stmt = $pdo->prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ?");
        $stmt->execute([$userId]);
        echo json_encode(['success' => true]);

    } elseif ($action === 'create_notification') {
        // Helper endpoint for manual notification creation (admin/teacher use)
        $targetUserId = $postData['user_id'];
        $type = $postData['type'];
        $title = $postData['title'];
        $message = $postData['message'];
        $relatedId = $postData['related_id'] ?? null;

        $stmt = $pdo->prepare("
            INSERT INTO notifications (user_id, type, title, message, related_id) 
            VALUES (?, ?, ?, ?, ?)
        ");
        $stmt->execute([$targetUserId, $type, $title, $message, $relatedId]);
        echo json_encode(['success' => true, 'notification_id' => $pdo->lastInsertId()]);

    } elseif ($action === 'check_upcoming_classes') {
        // Auto-generate notifications for classes starting within 15 minutes
        // Get current time + 15 minutes window
        $now = date('H:i:s');
        $nowPlus15 = date('H:i:s', strtotime('+15 minutes'));
        $today = date('l'); // Day name (Monday, Tuesday, etc.)

        // Find classes starting soon
        $stmt = $pdo->prepare("
            SELECT t.*, s.name as subject_name, s.course_id
            FROM timetable t
            JOIN subjects s ON t.subject_id = s.id
            WHERE t.day = ? AND t.start_time BETWEEN ? AND ?
        ");
        $stmt->execute([$today, $now, $nowPlus15]);
        $upcomingClasses = $stmt->fetchAll();

        $notificationsCreated = 0;
        foreach ($upcomingClasses as $class) {
            // Get all students enrolled in this course
            $enrollStmt = $pdo->prepare("SELECT user_id FROM enrollments WHERE course_id = ?");
            $enrollStmt->execute([$class['course_id']]);
            $students = $enrollStmt->fetchAll();

            foreach ($students as $student) {
                // Check if notification already exists for today
                $checkStmt = $pdo->prepare("
                    SELECT id FROM notifications 
                    WHERE user_id = ? AND type = 'class_starting' 
                    AND related_id = ? AND DATE(created_at) = CURDATE()
                ");
                $checkStmt->execute([$student['user_id'], $class['subject_id']]);

                if (!$checkStmt->fetch()) {
                    // Create notification
                    $notifStmt = $pdo->prepare("
                        INSERT INTO notifications (user_id, type, title, message, related_id) 
                        VALUES (?, 'class_starting', ?, ?, ?)
                    ");
                    $title = "Class Starting Soon!";
                    $message = "{$class['subject_name']} class starts at {$class['start_time']}";
                    $notifStmt->execute([$student['user_id'], $title, $message, $class['subject_id']]);
                    $notificationsCreated++;
                }
            }
        }

        echo json_encode(['success' => true, 'notifications_created' => $notificationsCreated]);

    } elseif ($action === 'check_due_assignments') {
        // Auto-generate notifications for assignments due within 24 hours
        $tomorrow = date('Y-m-d', strtotime('+1 day'));
        $today = date('Y-m-d');

        $stmt = $pdo->prepare("
            SELECT a.*, s.course_id, s.name as subject_name
            FROM assignments a
            JOIN subjects s ON a.subject_id = s.id
            WHERE a.due_date BETWEEN ? AND ?
        ");
        $stmt->execute([$today, $tomorrow]);
        $dueAssignments = $stmt->fetchAll();

        $notificationsCreated = 0;
        foreach ($dueAssignments as $assignment) {
            // Get all students enrolled in this course
            $enrollStmt = $pdo->prepare("SELECT user_id FROM enrollments WHERE course_id = ?");
            $enrollStmt->execute([$assignment['course_id']]);
            $students = $enrollStmt->fetchAll();

            foreach ($students as $student) {
                // Check if notification already exists
                $checkStmt = $pdo->prepare("
                    SELECT id FROM notifications 
                    WHERE user_id = ? AND type = 'due_date' 
                    AND related_id = ? AND DATE(created_at) = CURDATE()
                ");
                $checkStmt->execute([$student['user_id'], $assignment['id']]);

                if (!$checkStmt->fetch()) {
                    // Create notification
                    $notifStmt = $pdo->prepare("
                        INSERT INTO notifications (user_id, type, title, message, related_id) 
                        VALUES (?, 'due_date', ?, ?, ?)
                    ");
                    $title = "Assignment Due Soon!";
                    $message = "{$assignment['title']} ({$assignment['subject_name']}) is due on {$assignment['due_date']}";
                    $notifStmt->execute([$student['user_id'], $title, $message, $assignment['id']]);
                    $notificationsCreated++;
                }
            }
        }

        echo json_encode(['success' => true, 'notifications_created' => $notificationsCreated]);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>