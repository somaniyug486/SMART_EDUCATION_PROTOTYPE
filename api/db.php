<?php
// api/db.php
error_reporting(E_ALL);
ini_set('display_errors', 1);

$host = 'localhost';
$db = 'smart_edu_hack';
$user = 'root';
$pass = 'yugstudieswell';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'DB Connection Failed: ' . $e->getMessage()]);
    exit;
}
?>