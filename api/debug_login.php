<?php
// api/debug_login.php
ini_set('display_errors', 1);
error_reporting(E_ALL);

echo "<h3>Debug Login Test</h3>";
require 'db.php';
session_start();

$email = 'rahul@student.com';
$password = 'password123';

echo "Testing Creds: $email / $password <br>";

try {
    echo "Connecting to DB...<br>";
    if (!$pdo)
        die("PDO Object is null. Connection failed.");

    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    echo "Query Result: <pre>";
    print_r($user);
    echo "</pre>";

    if ($user && $user['password'] === $password) {
        echo "<h3 style='color:green'>SUCCESS: Login Logic Works.</h3>";
        $_SESSION['user_id'] = $user['id'];
        echo "Session ID set to: " . $_SESSION['user_id'];
    } else {
        echo "<h3 style='color:red'>FAILED: Invalid Credentials or User Not Found.</h3>";
    }
} catch (Exception $e) {
    echo "<h3 style='color:red'>EXCEPTION: " . $e->getMessage() . "</h3>";
}
?>