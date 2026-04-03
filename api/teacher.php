<?php
/**
 * TEACHER API
 * Purpose: This file handles all actions a teacher can perform, like marking attendance,
 * uploading assignments, and starting live classes.
 */

session_start();
require 'db.php';
header('Content-Type: application/json');

// Get the Teacher's ID from the session (remembering who is logged in).
$userId = $_SESSION['user_id'] ?? 0;

// The "action" tells us what specific job the teacher wants to do (e.g., 'submit_attendance').
$action = $_GET['action'] ?? '';

// Helper to get raw data (JSON) sent by the frontend's Javascript.
$postData = json_decode(file_get_contents('php://input'), true);

try {
    // FUNCTIONALITY: View Timetable
// This allows the teacher to see their scheduled classes.
    if ($action === 'my_schedule') {
        $stmt = $pdo->prepare("SELECT t.*, s.name as subject_name FROM timetable t JOIN subjects s ON t.subject_id = s.id WHERE
s.teacher_id = ? ORDER BY t.day, t.start_time");
        $stmt->execute([$userId]);
        echo json_encode(['schedule' => $stmt->fetchAll()]);

        // FUNCTIONALITY: Attendance Management
// 'get_students_for_attendance' fetching the list of students to show in the UI.
    } elseif ($action === 'get_students_for_attendance') {
        // Return ALL students in the system so the teacher can mark their attendance.
        $stmt = $pdo->prepare("SELECT id, name FROM users WHERE role = 'student' ORDER BY name ASC");
        $stmt->execute();
        echo json_encode(['students' => $stmt->fetchAll()]);

        // 'submit_attendance' saves the attendance data sent from the teacher dashboard.
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

        // FUNCTIONALITY: Assignments
// This allows teachers to post new tasks for students.
    } elseif ($action === 'create_assignment') {
        $subjectId = $postData['subject_id'];
        $title = $postData['title'];
        $desc = $postData['description'];
        $due = $postData['due_date'];

        $stmt = $pdo->prepare("INSERT INTO assignments (subject_id, title, description, due_date) VALUES (?, ?, ?, ?)");
        $stmt->execute([$subjectId, $title, $desc, $due]);
        $assignmentId = $pdo->lastInsertId();

        // AUTO-GENERATE NOTIFICATIONS for all enrolled students
        $courseStmt = $pdo->prepare("SELECT course_id FROM subjects WHERE id = ?");
        $courseStmt->execute([$subjectId]);
        $courseId = $courseStmt->fetch()['course_id'];

        $enrollStmt = $pdo->prepare("SELECT user_id FROM enrollments WHERE course_id = ?");
        $enrollStmt->execute([$courseId]);
        $students = $enrollStmt->fetchAll();

        $notifStmt = $pdo->prepare("
INSERT INTO notifications (user_id, type, title, message, related_id)
VALUES (?, 'assignment_upload', ?, ?, ?)
");

        foreach ($students as $student) {
            $notifTitle = "New Assignment Posted!";
            $notifMessage = "Your teacher has posted a new assignment: {$title}. Due date: {$due}";
            $notifStmt->execute([$student['user_id'], $notifTitle, $notifMessage, $assignmentId]);
        }

        echo json_encode(['success' => true]);

        // FUNCTIONALITY: Live Classroom
// This starts a live session using WebRTC (Real-Time Communication).
    } elseif ($action === 'start_live_session') {
        // Start a live video broadcast session.
        $subjectId = $postData['subject_id'] ?? 1;
        $peerId = $postData['peer_id'] ?? null; // A unique ID needed for the video connection.

        // End any existing active sessions for this subject first
        $endStmt = $pdo->prepare("
UPDATE live_sessions SET session_status = 'ended', ended_at = NOW()
WHERE subject_id = ? AND session_status = 'active'
");
        $endStmt->execute([$subjectId]);

        // Create new session
        $stmt = $pdo->prepare("
INSERT INTO live_sessions (subject_id, teacher_id, peer_id, session_status)
VALUES (?, ?, ?, 'active')
");
        $stmt->execute([$subjectId, $userId, $peerId]);
        $sessionId = $pdo->lastInsertId();

        // NOTIFY STUDENTS that class is LIVE
        $subjStmt = $pdo->prepare("SELECT s.name as subject_name, s.course_id, u.name as teacher_name FROM subjects s JOIN users
u ON s.teacher_id = u.id WHERE s.id = ?");
        $subjStmt->execute([$subjectId]);
        $subjData = $subjStmt->fetch();

        $enrollStmt = $pdo->prepare("SELECT user_id FROM enrollments WHERE course_id = ?");
        $enrollStmt->execute([$subjData['course_id']]);
        $students = $enrollStmt->fetchAll();

        $notifStmt = $pdo->prepare("INSERT INTO notifications (user_id, type, title, message, related_id) VALUES (?,
'live_class_started', ?, ?, ?)");
        foreach ($students as $student) {
            $title = "Class is LIVE!";
            $msg = "Prof. {$subjData['teacher_name']} has started the live lecture for {$subjData['subject_name']}. Join now!";
            $notifStmt->execute([$student['user_id'], $title, $msg, $sessionId]);
        }

        echo json_encode(['success' => true, 'session_id' => $sessionId]);

    } elseif ($action === 'end_live_session') {
        // End active session
        $subjectId = $postData['subject_id'] ?? 1;

        $stmt = $pdo->prepare("
UPDATE live_sessions SET session_status = 'ended', ended_at = NOW()
WHERE subject_id = ? AND teacher_id = ? AND session_status = 'active'
");
        $stmt->execute([$subjectId, $userId]);

        echo json_encode(['success' => true]);

    } elseif ($action === 'get_my_subjects') {
        $stmt = $pdo->prepare("SELECT id, name FROM subjects WHERE teacher_id = ?");
        $stmt->execute([$userId]);
        echo json_encode(['subjects' => $stmt->fetchAll()]);

        // FUNCTIONALITY: Resource Upload
// This allows teachers to upload PDFs, Images, or PPTs for their subjects.
    } elseif ($action === 'upload_material') {
        if (!isset($_FILES['file'])) {
            throw new Exception("No file uploaded");
        }
        $subjectId = $_POST['subject_id'];
        $title = $_POST['title'];
        $file = $_FILES['file'];

        $filename = time() . '_' . basename($file['name']);
        $targetPath = "../uploads/docs/" . $filename;

        if (move_uploaded_file($file['tmp_name'], $targetPath)) {
            $stmt = $pdo->prepare("INSERT INTO documents (subject_id, title, filename) VALUES (?, ?, ?)");
            $stmt->execute([$subjectId, $title, $filename]);
            echo json_encode(['success' => true]);
        } else {
            throw new Exception("Failed to save file.");
        }

    } elseif ($action === 'upload_resource') {
        if (!isset($_FILES['file']))
            throw new Exception("No file uploaded");

        $subjectId = $_POST['subject_id'];
        $module = intval($_POST['module']);
        $title = $_POST['title'];
        $desc = $_POST['description'] ?? '';
        $file = $_FILES['file'];

        $filename = time() . '_mod' . $module . '_' . basename($file['name']);
        $targetDir = "../uploads/resources/";
        if (!is_dir($targetDir))
            mkdir($targetDir, 0777, true);

        $targetPath = $targetDir . $filename;

        if (move_uploaded_file($file['tmp_name'], $targetPath)) {
            $stmt = $pdo->prepare("
INSERT INTO teacher_resources
(teacher_id, subject_id, module_number, title, description, file_path, file_type)
VALUES (?, ?, ?, ?, ?, ?, ?)
");
            $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
            $stmt->execute([$userId, $subjectId, $module, $title, $desc, $filename, $ext]);
            echo json_encode(['success' => true]);
        } else {
            throw new Exception("Failed to save file.");
        }

    } elseif ($action === 'get_teacher_resources') {
        $subjectId = $_GET['subject_id'] ?? 0;

        $stmt = $pdo->prepare("
SELECT * FROM teacher_resources
WHERE teacher_id = ? AND subject_id = ?
ORDER BY module_number ASC, upload_timestamp DESC
");
        $stmt->execute([$userId, $subjectId]);
        $resources = $stmt->fetchAll();

        // Group by module
        $grouped = [];
        foreach ($resources as $res) {
            $mod = $res['module_number'];
            if (!isset($grouped[$mod]))
                $grouped[$mod] = [];
            $grouped[$mod][] = $res;
        }

        echo json_encode(['resources' => $resources, 'grouped' => $grouped]);

    } elseif ($action === 'delete_resource') {
        $resId = $postData['resource_id'];

        // Verify ownership
        $stmt = $pdo->prepare("SELECT file_path FROM teacher_resources WHERE id = ? AND teacher_id = ?");
        $stmt->execute([$resId, $userId]);
        $file = $stmt->fetch();

        if ($file) {
            $path = "../uploads/resources/" . $file['file_path'];
            if (file_exists($path))
                unlink($path);

            $delStmt = $pdo->prepare("DELETE FROM teacher_resources WHERE id = ?");
            $delStmt->execute([$resId]);
            echo json_encode(['success' => true]);
        } else {
            throw new Exception("Resource not found or access denied.");
        }
    } elseif ($action === 'update_resource_meta') { // Update metadata
        $resId = $postData['resource_id'];
        $module = intval($postData['module']);
        $title = $postData['title'];
        $desc = $postData['description'];

        $stmt = $pdo->prepare("UPDATE teacher_resources SET module_number = ?, title = ?, description = ? WHERE id = ? AND
teacher_id = ?");
        $stmt->execute([$module, $title, $desc, $resId, $userId]);
        echo json_encode(['success' => true]);


    } elseif ($action === 'get_templates') {
        $stmt = $pdo->prepare("SELECT * FROM availability_templates WHERE teacher_id = ? ORDER BY day_of_week ASC, start_time
ASC");
        $stmt->execute([$userId]);
        echo json_encode(['templates' => $stmt->fetchAll()]);

    } elseif ($action === 'save_template') {
        $id = $postData['id'] ?? null;
        $dayOfWeek = $postData['day_of_week'];
        $startTime = $postData['start_time'];
        $endTime = $postData['end_time'];
        $mode = $postData['mode'];
        $maxStudents = $postData['max_students'] ?? 1;
        $label = $postData['label'] ?? '';

        if ($id) {
            $stmt = $pdo->prepare("UPDATE availability_templates SET day_of_week = ?, start_time = ?, end_time = ?, mode = ?,
max_students = ?, label = ? WHERE id = ? AND teacher_id = ?");
            $stmt->execute([$dayOfWeek, $startTime, $endTime, $mode, $maxStudents, $label, $id, $userId]);
        } else {
            $stmt = $pdo->prepare("INSERT INTO availability_templates (teacher_id, day_of_week, start_time, end_time, mode,
max_students, label) VALUES (?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([$userId, $dayOfWeek, $startTime, $endTime, $mode, $maxStudents, $label]);
            $id = $pdo->lastInsertId();
        }
        echo json_encode(['success' => true, 'template_id' => $id]);

    } elseif ($action === 'delete_template') {
        $id = $postData['id'];
        $stmt = $pdo->prepare("DELETE FROM availability_templates WHERE id = ? AND teacher_id = ?");
        $stmt->execute([$id, $userId]);
        echo json_encode(['success' => true]);

    } elseif ($action === 'generate_slots_from_templates') {
        $weekStartDate = $postData['week_start_date']; // Expecting 'YYYY-MM-DD' (Sunday)
        $selectedTemplateIds = $postData['template_ids'] ?? []; // Array of IDs
        $adHocSlots = $postData['ad_hoc_slots'] ?? []; // Array of {day_of_week, start_time, end_time, mode, max_students}

        if (empty($selectedTemplateIds) && empty($adHocSlots)) {
            echo json_encode(['success' => false, 'message' => 'No slots selected.']);
            exit;
        }

        $generatedCount = 0;

        // Process templates
        if (!empty($selectedTemplateIds)) {
            $inQuery = implode(',', array_fill(0, count($selectedTemplateIds), '?'));
            $stmt = $pdo->prepare("SELECT * FROM availability_templates WHERE teacher_id = ? AND id IN ($inQuery) AND is_active =
1");
            $stmt->execute(array_merge([$userId], $selectedTemplateIds));
            $templates = $stmt->fetchAll();
            foreach ($templates as $tmpl) {
                $date = date('Y-m-d', strtotime("$weekStartDate +{$tmpl['day_of_week']} days"));

                $checkStmt = $pdo->prepare("SELECT id FROM availability_slots WHERE teacher_id = ? AND date = ? AND start_time = ?");
                $checkStmt->execute([$userId, $date, $tmpl['start_time']]);
                if ($checkStmt->fetch())
                    continue;

                $insertStmt = $pdo->prepare("INSERT INTO availability_slots (teacher_id, date, start_time, end_time, mode, max_students,
source_template_id) VALUES (?, ?, ?, ?, ?, ?, ?)");
                $insertStmt->execute([
                    $userId,
                    $date,
                    $tmpl['start_time'],
                    $tmpl['end_time'],
                    $tmpl['mode'],
                    $tmpl['max_students'],
                    $tmpl['id']
                ]);
                $generatedCount++;
            }
        }

        // Process ad-hoc slots
        foreach ($adHocSlots as $slot) {
            $date = date('Y-m-d', strtotime("$weekStartDate +{$slot['day_of_week']} days"));

            $checkStmt = $pdo->prepare("SELECT id FROM availability_slots WHERE teacher_id = ? AND date = ? AND start_time = ?");
            $checkStmt->execute([$userId, $date, $slot['start_time']]);
            if ($checkStmt->fetch())
                continue;

            $insertStmt = $pdo->prepare("INSERT INTO availability_slots (teacher_id, date, start_time, end_time, mode, max_students)
VALUES (?, ?, ?, ?, ?, ?)");
            $insertStmt->execute([$userId, $date, $slot['start_time'], $slot['end_time'], $slot['mode'], $slot['max_students']]);
            $generatedCount++;
        }

        echo json_encode(['success' => true, 'generated_count' => $generatedCount]);

    } elseif ($action === 'get_past_slots') {
        $weekStart = $_GET['week_start_date'];
        $weekEnd = date('Y-m-d', strtotime("$weekStart +6 days"));
        $stmt = $pdo->prepare("SELECT *, (DAYOFWEEK(date) - 1) as day_of_week FROM availability_slots WHERE teacher_id = ? AND
date BETWEEN ? AND ? ORDER BY date ASC, start_time ASC");
        $stmt->execute([$userId, $weekStart, $weekEnd]);
        echo json_encode(['slots' => $stmt->fetchAll()]);

    } elseif ($action === 'create_slot') {
        $date = $postData['date'];
        $startTime = $postData['start_time'];
        $endTime = $postData['end_time'];
        $mode = $postData['mode'];
        $maxStudents = $postData['max_students'] ?? 1;

        $stmt = $pdo->prepare("INSERT INTO availability_slots (teacher_id, date, start_time, end_time, mode, max_students)
VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$userId, $date, $startTime, $endTime, $mode, $maxStudents]);
        $slotId = $pdo->lastInsertId();

        // Log action
        $logStmt = $pdo->prepare("INSERT INTO booking_audit_logs (action_type, related_id, user_id, details) VALUES
('slot_created', ?, ?, ?)");
        $logStmt->execute([$slotId, $userId, "Slot created for $date $startTime-$endTime ($mode)"]);

        echo json_encode(['success' => true, 'slot_id' => $slotId]);

    } elseif ($action === 'get_my_slots') {
        // Teacher sees all upcoming slots
        $stmt = $pdo->prepare("
SELECT s.*,
(SELECT COUNT(*) FROM bookings b WHERE b.slot_id = s.id AND b.status != 'rejected') as current_bookings
FROM availability_slots s
WHERE s.teacher_id = ? AND s.date >= CURDATE()
ORDER BY s.date ASC, s.start_time ASC
");
        $stmt->execute([$userId]);
        echo json_encode(['slots' => $stmt->fetchAll()]);

    } elseif ($action === 'delete_slot') {
        $slotId = $postData['slot_id'];

        // Check if slot has bookings
        $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM bookings WHERE slot_id = ? AND status != 'rejected'");
        $stmt->execute([$slotId]);
        if ($stmt->fetch()['count'] > 0) {
            echo json_encode([
                'success' => false,
                'message' => 'Cannot delete slot with active bookings. Please close it
instead.'
            ]);
            exit;
        }

        $stmt = $pdo->prepare("DELETE FROM availability_slots WHERE id = ? AND teacher_id = ?");
        $stmt->execute([$slotId, $userId]);

        $logStmt = $pdo->prepare("INSERT INTO booking_audit_logs (action_type, related_id, user_id, details) VALUES
('slot_deleted', ?, ?, ?)");
        $logStmt->execute([$slotId, $userId, "Slot deleted"]);

        echo json_encode(['success' => true]);

    } elseif ($action === 'close_slot') {
        $slotId = $postData['slot_id'];
        $stmt = $pdo->prepare("UPDATE availability_slots SET status = 'closed' WHERE id = ? AND teacher_id = ?");
        $stmt->execute([$slotId, $userId]);
        echo json_encode(['success' => true]);

    } elseif ($action === 'get_slot_bookings') {
        $slotId = $_GET['slot_id'] ?? 0;
        $stmt = $pdo->prepare("
SELECT b.*, u.name as student_name, s.name as subject_name
FROM bookings b
JOIN users u ON b.student_id = u.id
JOIN subjects s ON b.subject_id = s.id
WHERE b.slot_id = ?
");
        $stmt->execute([$slotId]);
        echo json_encode(['bookings' => $stmt->fetchAll()]);

    } elseif ($action === 'respond_to_booking') {
        $bookingId = $postData['booking_id'];
        $status = $postData['status']; // 'accepted' or 'rejected'
        $notes = $postData['notes'] ?? ''; // used for message/reason

        if ($status === 'accepted') {
            $stmt = $pdo->prepare("UPDATE bookings SET status = 'accepted', teacher_notes = ? WHERE id = ?");
            $stmt->execute([$notes, $bookingId]);
            $actionType = 'booking_accepted';
        } else {
            if (empty($notes)) {
                echo json_encode(['success' => false, 'message' => 'Rejection reason is mandatory.']);
                exit;
            }
            $stmt = $pdo->prepare("UPDATE bookings SET status = 'rejected', rejection_reason = ? WHERE id = ?");
            $stmt->execute([$notes, $bookingId]);
            $actionType = 'booking_rejected';
        }

        // Get details for notification
        $stmt = $pdo->prepare("
SELECT b.student_id, b.slot_id, s.date, s.start_time, sbj.name as subject_name
FROM bookings b
JOIN availability_slots s ON b.slot_id = s.id
JOIN subjects sbj ON b.subject_id = sbj.id
WHERE b.id = ?
");
        $stmt->execute([$bookingId]);
        $booking = $stmt->fetch();

        // Notify student
        $notifTitle = "Booking Update: " . ucfirst($status);
        $notifMsg = "Your booking for {$booking['subject_name']} on {$booking['date']} at {$booking['start_time']} has been " .
            $status . ".";
        if ($notes)
            $notifMsg .= ($status === 'accepted' ? " Notes: " : " Reason: ") . $notes;

        $notifStmt = $pdo->prepare("INSERT INTO notifications (user_id, type, title, message, related_id) VALUES (?, ?, ?, ?,
?)");
        $notifStmt->execute([$booking['student_id'], 'assignment_upload', $notifTitle, $notifMsg, $bookingId]);

        // Log action
        $logStmt = $pdo->prepare("INSERT INTO booking_audit_logs (action_type, related_id, user_id, details) VALUES (?, ?, ?,
?)");
        $logStmt->execute([$actionType, $bookingId, $userId, "Booking $status. Details: $notes"]);

        echo json_encode(['success' => true]);
    } elseif ($action === 'setup_resources') {
        // Fallback to create table if CLI update failed
        try {
            $sql = "
CREATE TABLE IF NOT EXISTS teacher_resources (
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
)";
            $pdo->exec($sql);
            echo json_encode(['success' => true, 'message' => 'Table teacher_resources created successfully']);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>