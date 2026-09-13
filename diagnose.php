<?php
// diagnose.php
ini_set('display_errors', 1);
error_reporting(E_ALL);

echo "<h1>Smart Edu - Database Diagnostic</h1>";

$host = 'localhost';
$db = 'smart_edu_hack';
$user = 'root';
$pass = 'yugstudieswell';

echo "<h3>1. Configuration</h3>";
echo "Host: $host<br>";
echo "User: $user<br>";
echo "DB: $db<br>";
echo "Pass: (empty)<br>";

echo "<h3>2. Connection Attempt</h3>";

try {
    $dsn = "mysql:host=$host;charset=utf8mb4";
    $pdo = new PDO($dsn, $user, $pass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    echo "<span style='color:green'>[OK] Connected to MySQL Server!</span><br>";

    // Check Database
    try {
        $pdo->exec("USE `$db`");
        echo "<span style='color:green'>[OK] Database '$db' exists selected!</span><br>";

        // Check Users Table
        $stmt = $pdo->query("SELECT count(*) FROM users");
        $count = $stmt->fetchColumn();
        echo "<span style='color:green'>[OK] Table 'users' found. User count: $count</span><br>";

    } catch (Exception $e) {
        echo "<span style='color:red'>[FAIL] Could not find database '$db'. Did you import schema.sql?</span><br>";
        echo "Error: " . $e->getMessage();
    }

} catch (Exception $e) {
    echo "<span style='color:red'>[FAIL] Connection Refused.</span><br>";
    echo "<strong>Error details:</strong> " . $e->getMessage() . "<br><br>";
    echo "Common fixes:<br>";
    echo "1. Is XAMPP MySQL running?<br>";
    echo "2. Do you have a password set for root? (try 'root' or 'admin' in db.php)<br>";
    echo "3. Is the port 3306?<br>";
}
?>