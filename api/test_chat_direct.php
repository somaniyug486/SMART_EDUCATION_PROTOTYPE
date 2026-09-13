<?php
// api/test_chat_direct.php
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<h3>Testing Chat API</h3>";

// 1. Mock Session
session_start();
$_SESSION['user_id'] = 1;
$_SESSION['name'] = 'TestUser';
session_write_close(); // <--- RELEASE LOCK to prevent Deadlock
echo "✅ Session Mocked: TestUser<br>";

// 2. Mock POST Request for Chat
$_POST['subject_id'] = 1;
$_POST['message'] = "Test Message from Debug Script " . time();

// We need to trick the Code which reads mock php://input
// Alternatively, we can just use CURL to call the actual endpoint
$url = "http://localhost/smart_edu_prototype/api/student.php?action=send_chat";
$data = json_encode(['subject_id' => 1, 'message' => 'Hello World ' . time()]);

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json', 'Cookie: PHPSESSID=' . session_id()]);

echo "Sending Request to $url...<br>";
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP Code: $httpCode<br>";
echo "Response: <pre>" . htmlspecialchars($response) . "</pre>";

if ($httpCode == 200 && strpos($response, '"status":"ok"') !== false) {
    echo "<h2 style='color:green'>SUCCESS: API is working!</h2>";
} else {
    echo "<h2 style='color:red'>FAILURE: API is broken.</h2>";
}
?>