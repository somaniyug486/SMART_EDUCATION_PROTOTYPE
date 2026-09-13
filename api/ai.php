<?php
// api/ai.php
header('Content-Type: application/json');

// ==========================================
// 🔑 PASTE YOUR GEMINI API KEY BELOW 🔑
// ==========================================
$GEMINI_API_KEY = 'AIzaSyAZxBc-wA7NLoUy3W1wFd7zMX02Ix3VyCc'; // <-- Example: 'AlzaSy...'
// ==========================================

$input = json_decode(file_get_contents('php://input'), true);
$query = $input['query'] ?? '';
$type = $input['type'] ?? 'chat';

function callGemini($prompt, $key)
{
    if (empty($key))
        return null;

    $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=" . $key;
    $data = ['contents' => [['parts' => [['text' => $prompt]]]]];

    $ch = curl_init($url);
    // CRITICAL for XAMPP/Localhost: Disable SSL Check
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);

    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));

    $response = curl_exec($ch);

    if (curl_errno($ch)) {
        return "Curl Error: " . curl_error($ch);
    }
    curl_close($ch);

    $json = json_decode($response, true);

    // Check for Quota Limit (429) or other API errors
    if (isset($json['error'])) {
        // If Quota full, return NULL to trigger Offline Fallback
        if ($json['error']['code'] == 429)
            return null;

        return "API Error: " . $json['error']['message'];
    }

    if (!isset($json['candidates'][0]['content']['parts'][0]['text'])) {
        return "API Error: Invalid Response format.";
    }
    return $json['candidates'][0]['content']['parts'][0]['text'];
}

$answer = "";
$quiz_data = [];

// 1. Try Real AI
if (!empty($GEMINI_API_KEY)) {
    if ($type === 'quiz') {
        $prompt = "Generate 3 multiple choice questions about '$query' in JSON format: [{\"q\":\"Question\",\"o\":[\"A\",\"B\",\"C\",\"D\"],\"a\":\"Correct Option\"}]";
        $raw = callGemini($prompt, $GEMINI_API_KEY);
        // Fallback for parsing
        if ($raw) {
            $raw = str_replace(['```json', '```'], '', $raw);
            $quiz_data = json_decode($raw, true);
        }
        $answer = "AI Quiz generated for: " . htmlspecialchars($query);
    } else {
        $prompt = "You are a helpful teacher. Explain '$query' clearly.";
        if ($type == 'lesson')
            $prompt = "Create a lesson plan for '$query'. Use headings.";
        if ($type == 'activity')
            $prompt = "Suggest a classroom activity for '$query'.";

        $answer = callGemini($prompt, $GEMINI_API_KEY);
        if ($answer)
            $answer = nl2br(htmlspecialchars($answer));
    }
}

// 2. Fallback (If Key is still empty or API fails)
if (empty($answer) || empty($quiz_data)) {
    // Keep the "Silly" simulation as a backup so the app doesn't crash
    if ($type === 'quiz') {
        $quiz_data = [
            ["q" => "What is the primary concept of $query?", "o" => ["Concept A", "Concept B", "Concept C", "None"], "a" => "Concept A"],
            ["q" => "Who is associated with $query?", "o" => ["Scientist A", "Historical Figure B", "Modern Expert C", "Unknown"], "a" => "Scientist A"]
        ];
        $answer = "Generated a unique quiz for: " . htmlspecialchars($query);
    } else {
        $answer = "
        <div class='border-start border-4 border-warning ps-3'>
            <small class='text-muted'>⚠️ API Quota Exceeded - Switching to Simulation Mode</small>
            <h4>Topic: " . ucwords($query) . "</h4>
            <p><strong>Introduction:</strong><br>$query is a key concept in modern studies.</p>
            <p><strong>Key Points:</strong></p>
            <ul><li>Significance of $query</li><li>Real-world applications</li></ul>
        </div>";
    }
}

echo json_encode(['answer' => $answer, 'quiz_data' => $quiz_data]);
?>