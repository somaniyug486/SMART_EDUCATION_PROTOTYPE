<?php
// api/debug_models.php
header('Content-Type: text/html');
ini_set('display_errors', 1);

$GEMINI_API_KEY = 'AIzaSyAZxBc-wA7NLoUy3W1wFd7zMX02Ix3VyCc'; // User's Key

$url = "https://generativelanguage.googleapis.com/v1beta/models?key=" . $GEMINI_API_KEY;

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
curl_close($ch);

$data = json_decode($response, true);

echo "<h2>Available Models for this Key:</h2>";
if (isset($data['models'])) {
    echo "<ul>";
    foreach ($data['models'] as $m) {
        if (strpos($m['name'], 'generateContent') !== false || strpos($m['name'], 'gemini') !== false) {
            echo "<li><strong>" . $m['name'] . "</strong><br>Methods: " . implode(', ', $m['supportedGenerationMethods']) . "</li><br>";
        }
    }
    echo "</ul>";
} else {
    echo "Error fetching models: <pre>" . htmlspecialchars($response) . "</pre>";
}
?>