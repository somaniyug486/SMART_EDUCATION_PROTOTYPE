<?php
// test_setup.php
ini_set('display_errors', 1);
error_reporting(E_ALL);

echo "<h1>Setup Check</h1>";

$files = [
    'api/db.php',
    'api/login.php',
    'api/student.php',
    'api/teacher.php',
    'index.html'
];

foreach ($files as $f) {
    if (file_exists($f)) {
        echo "<div style='color:green'>[OK] Found $f</div>";
    } else {
        echo "<div style='color:red'>[MISSING] Could not find $f</div>";
    }
}

echo "<h3>DB Connection Check:</h3>";
if (file_exists('api/db.php')) {
    require 'api/db.php';
    if (isset($pdo)) {
        echo "<div style='color:green'>[OK] Database connected!</div>";
    } else {
        echo "<div style='color:red'>[FAIL] PDO object missing.</div>";
    }
} else {
    echo "Skipping DB check (file missing).";
}
?>