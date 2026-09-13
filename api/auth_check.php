<?php
// api/auth_check.php
ob_start();
session_start();
ob_end_clean();

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['logged_in' => false]);
    exit;
}

echo json_encode([
    'logged_in' => true,
    'user_id' => $_SESSION['user_id'],
    'role' => $_SESSION['role'],
    'name' => $_SESSION['name']
]);
?>