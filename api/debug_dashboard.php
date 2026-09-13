<?php
// api/debug_dashboard.php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require 'db.php';
session_start();

// MOCK SESSION for debugging if not logged in
if (!isset($_SESSION['user_id'])) {
    echo "No session found. Mocking User ID 1 (Rahul)...<br>";
    $_SESSION['user_id'] = 1;
    $_SESSION['role'] = 'student';
    $_SESSION['name'] = 'Rahul Debug';
}

echo "<h3>Debug Info</h3>";
echo "User ID: " . $_SESSION['user_id'] . "<br>";
echo "Role: " . $_SESSION['role'] . "<br>";
echo "Day: " . date('l') . "<br>";

try {
    $userId = $_SESSION['user_id'];
    $dayOfWeek = date('l');

    $sql = "
        SELECT t.*, s.name as subject_name, c.code as course_code 
        FROM timetable t
        JOIN enrollments e ON t.course_id = e.course_id
        JOIN subjects s ON t.subject_id = s.id
        JOIN courses c ON t.course_id = c.id
        WHERE e.user_id = ? AND t.day = ?
        ORDER BY t.start_time
    ";

    echo "<h4>Attempting Query:</h4>";
    echo "<pre>$sql</pre>";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([$userId, $dayOfWeek]);
    $result = $stmt->fetchAll();

    echo "<h4>Result:</h4>";
    echo "<pre>";
    print_r($result);
    echo "</pre>";

    echo "<h3 style='color:green'>SUCCESS: Query ran without fatal errors.</h3>";

} catch (Exception $e) {
    echo "<h3 style='color:red'>ERROR: " . $e->getMessage() . "</h3>";
    echo "<pre>" . $e->getTraceAsString() . "</pre>";
}
?>