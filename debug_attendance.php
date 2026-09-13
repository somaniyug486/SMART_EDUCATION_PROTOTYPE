<?php
// api/debug_attendance.php
ini_set('display_errors', 1);
error_reporting(E_ALL);
require 'db.php';
session_start();

// Mock session if missing
if (!isset($_SESSION['user_id'])) {
    $_SESSION['user_id'] = 1; // Rahul
    echo "Mocking Rahul (ID 1)<br>";
}

$userId = $_SESSION['user_id'];
echo "Fetching log for User $userId...<br>";

try {
    $sql = "SELECT a.date, a.status, s.name as subject_name 
            FROM attendance a 
            JOIN subjects s ON a.subject_id = s.id 
            WHERE a.user_id = ? 
            ORDER BY a.date DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([$userId]);
    $res = $stmt->fetchAll();

    echo "<pre>";
    print_r($res);
    echo "</pre>";

    if (count($res) == 0)
        echo "No attendance records found. Did the teacher submit any?";

} catch (Exception $e) {
    echo "SQL Error: " . $e->getMessage();
}
?>