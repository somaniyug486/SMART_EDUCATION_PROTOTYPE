<?php
// setup.php - Web-based Database Initializer
require_once 'api/db.php';

header('Content-Type: text/plain');

try {
    echo "Smart Edu - Database Setup\n";
    echo "============================\n\n";

    $sqlFile = 'setup_database.sql';
    if (!file_exists($sqlFile)) {
        die("Error: setup_database.sql not found!\n");
    }

    $sql = file_get_contents($sqlFile);

    // The script contains multiple queries, including CREATE DATABASE
    // We need to execute it carefully. Some PDO drivers don't support multi-query via exec().
    // We'll split by common delimiters or just try to run it.

    echo "Reading setup_database.sql...\n";

    // Special handling: Since setup_database.sql starts with CREATE DATABASE IF NOT EXISTS,
    // we need a connection that isn't bound to the DB yet if possible, or just use the existing one
    // if the DB already exists.

    // Let's try to execute the whole block. 
    // Most MySQL PDO drivers allow multi-query if configured or natively.

    echo "Executing setup script. This may take a moment...\n";

    // We use $pdo from db.php which is already connected.
    // However, setup_database.sql has 'USE smart_edu_hack;' which is good.

    $pdo->setAttribute(PDO::ATTR_EMULATE_PREPARES, 0);
    $pdo->exec($sql);

    echo "\nSUCCESS: Database 'smart_edu_hack' has been initialized with SKIPS University data!\n";
    echo "You can now log in using the credentials in the Setup Guide.\n\n";
    echo "Redirecting to home page in 5 seconds...";

    header("Refresh: 5; url=index.html");

} catch (PDOException $e) {
    echo "\nERROR: Database execution failed!\n";
    echo "Details: " . $e->getMessage() . "\n";
    echo "\nTroubleshooting Tip:\n";
    echo "1. Ensure MySQL is running in XAMPP Control Panel.\n";
    echo "2. Check if your root user needs a different password in api/db.php.\n";
}
?>