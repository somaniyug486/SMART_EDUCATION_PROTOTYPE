<?php
// api/debug_ai_connection.php
ini_set('display_errors', 1);
error_reporting(E_ALL);

echo "<h3>AI Connection Debugger</h3>";

// 1. Check File Content Logic (Simulated)
$file = 'ai.php';
if (file_exists($file)) {
    echo "✅ ai.php found.<br>";
    $content = file_get_contents($file);
    if (strpos($content, 'AIzaSyAZ') !== false) {
        echo "✅ API Key appears to be present in the file code.<br>";
    } else {
        echo "❌ API Key NOT found in ai.php source.<br>";
    }
} else {
    echo "❌ ai.php NOT found.<br>";
}

// 2. Test Connection
$KEY = 'AIzaSyAZxBc-wA7NLoUy3W1wFd7zMX02Ix3VyCc'; // User's key
$url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" . $KEY;
$data = ['contents' => [['parts' => [['text' => 'Hello']]]]];

echo "Testing connection to Google...<br>";

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // Fix XAMPP SSL
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));

$response = curl_exec($ch);

if (curl_errno($ch)) {
    echo "❌ CURL Error: " . curl_error($ch) . "<br>";
} else {
    echo "✅ Connection Successful.<br>";
    echo "HTTP Code: " . curl_getinfo($ch, CURLINFO_HTTP_CODE) . "<br>";
    echo "Response: <pre>" . htmlspecialchars($response) . "</pre>";
}
curl_close($ch);
?>