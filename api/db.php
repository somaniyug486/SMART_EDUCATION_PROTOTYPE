<?php
/**
 * DATABASE CONNECTION FILE
 * Purpose: This file connects our PHP code to the MySQL database.
 * Think of this as the "bridge" between your website and your data storage.
 */
// to Create a safe, reusable connection between PHP and MySQL.
// “The official gate between code and database.”

// 1. Error Reporting: This helps us see errors if something goes wrong during development.
error_reporting(E_ALL);
ini_set('display_errors', 1);

// 2. Database Credentials: The "address" and "ID cards" needed to enter the database.
$host = 'localhost';        // The server where the database lives (here, it's our own computer).
$db = 'smart_edu_hack';   // The name of our specific database project.
$user = 'root';             // The default username for XAMPP.
$pass = 'yugstudieswell';    // The password to access the database.
$charset = 'utf8mb4';       // The type of characters we use (supports emojis and many languages).

// 3. Connection String (DSN -data source name): A formatted string that tells PHP how to connect.
$dsn = "mysql:host=$host;dbname=$db;charset=$charset";

// 4. Configuration Options: Extra rules for our connection.
$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, // If there's an error, throw an "Exception" (stop and tell us why).
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,       // Pull data as an "Associative Array" (like a dictionary).You get:["name"] => "Yug", ["email"] => "yug@skipsuniversity.edu.in"]
    PDO::ATTR_EMULATE_PREPARES => false,                  // Use real prepared statements for better security.
];

// 5. Establishing the Connection: The actual attempt to connect.
try {
    // We create a new "PDO" object (a PHP tool for database interaction).
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
    // If connection fails, this "catch" block catches the error and tells us what happened.
    echo json_encode(['success' => false, 'message' => 'DB Connection Failed: ' . $e->getMessage()]);
    exit; // Stop everything if we can't connect to the database.
}
?>