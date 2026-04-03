<?php
/**
 * LOGIN SYSTEM
 * Purpose: This file checks if the user's email and password are correct.
 * It's like a security guard checking an ID card.
 */

ob_start(); // Prevent any accidental output before headers.
require 'db.php'; // Include the database bridge we created in db.php.

// 1. Session Start: This tells the server to start "remembering" this specific visitor.
// Without this, the server forgets who you are as soon as you move to another page.
session_start();
ob_end_clean(); // Clean any whitespace from includes to avoid JSON errors.

header('Content-Type: application/json'); // Tell the browser we are sending data in JSON format.

// 2. Reading Input: Get the email and password sent by the frontend (Javascript).
$input = json_decode(file_get_contents('php://input'), true);

// 3. Validation: Check if both email and password were actually sent.
if (!isset($input['email']) || !isset($input['password'])) {
    http_response_code(400); // 400 means "Bad Request" (Client's fault).
    echo json_encode(['success' => false, 'message' => 'Email and password required']);
    exit;
}

$email = $input['email'];
$password = $input['password'];

try {
    // 4. Searching for User: Ask the database "Do we have a user with this email?".
    // We use a "?" (placeholder) to prevent SQL Injection (hacking).
    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch(); // Pull the user's data from the database.

    // 5. Checking Credentials: If user exists, check if the password matches.
    // We check both plain text (for very old data) and hashed (for secure/new data).
    $password_matched = false;
    if ($user) {
        if (password_verify($password, $user['password'])) {
            $password_matched = true;
        } elseif ($user['password'] === $password) {
            $password_matched = true;
        }
    }

    if ($password_matched) {
        // 6. Storing Session Data: Save important info in the "$_SESSION" variable.
        // This stays active on the server as long as the user is logged in.
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['role'] = $user['role']; // e.g., 'teacher' or 'student'
        $_SESSION['name'] = $user['name'];

        // Send a success message back to the website.
        echo json_encode([
            'success' => true,
            'role' => $user['role'],
            'message' => 'Login successful'
        ]);
    } else {
        // 7. Invalid Login: If email or password is wrong.
        http_response_code(401); // 401 means "Unauthorized".
        echo json_encode(['success' => false, 'message' => 'Invalid credentials']);
    }
} catch (Exception $e) {
    // 8. Error Handling: If the database crashes or something else goes wrong.
    http_response_code(500); // 500 means "Internal Server Error".
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>