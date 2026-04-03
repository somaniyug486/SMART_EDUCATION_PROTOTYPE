<?php
// api/ai.php
header('Content-Type: application/json');
require_once 'db.php'; // Database Connection

// ==========================================
// 🔑 GEMINI API KEY 🔑
// ==========================================
$GEMINI_API_KEY = 'AIzaSyDWEx9oSUtZRKR0Q87DdwyoXmpnOq3sMXo';
// ==========================================

$input = json_decode(file_get_contents('php://input'), true);
$query = $input['query'] ?? '';
$type = $input['type'] ?? 'chat';

// --- RAG: Get Context from Database ---
function getDbContext($pdo, $userQuery)
{
    if (!$pdo)
        return "";

    $context = [];
    $q = strtolower($userQuery);

    try {
        // 1. Teacher Resources
        if (str_contains($q, 'upload') || str_contains($q, 'material') || str_contains($q, 'ppt') || str_contains($q, 'notes') || str_contains($q, 'resource') || str_contains($q, 'shruti') || str_contains($q, 'file')) {
            $stmt = $pdo->prepare("
                SELECT u.name as teacher, tr.title, tr.module_number, tr.description 
                FROM teacher_resources tr 
                JOIN users u ON tr.teacher_id = u.id 
                WHERE tr.title LIKE ? OR u.name LIKE ? OR tr.description LIKE ?
                LIMIT 5
            ");
            $stmt->execute(["%$userQuery%", "%$userQuery%", "%$userQuery%"]);
            $rows = $stmt->fetchAll();
            if ($rows) {
                $txt = "Resources in DB:\n";
                foreach ($rows as $r)
                    $txt .= "- " . $r['teacher'] . " uploaded '" . $r['title'] . "' (Module " . $r['module_number'] . ")\n";
                $context[] = $txt;
            }
        }

        // 2. Subjects & Teachers
        if (str_contains($q, 'teach') || str_contains($q, 'subject') || str_contains($q, 'class') || str_contains($q, 'faculty') || str_contains($q, 'who')) {
            $stmt = $pdo->query("SELECT s.name as subject, u.name as teacher FROM subjects s JOIN users u ON s.teacher_id = u.id");
            $rows = $stmt->fetchAll();
            if ($rows) {
                $txt = "Subject-Teacher List:\n";
                foreach ($rows as $r)
                    $txt .= "- " . $r['subject'] . " (Teacher: " . $r['teacher'] . ")\n";
                $context[] = $txt;
            }
        }

        // 3. User Counts
        if (str_contains($q, 'how many') || str_contains($q, 'count')) {
            $stmt = $pdo->query("SELECT role, COUNT(*) as c FROM users GROUP BY role");
            $rows = $stmt->fetchAll();
            $txt = "University Member Counts:\n";
            foreach ($rows as $r)
                $txt .= "- " . ucfirst($r['role']) . "s: " . $r['c'] . "\n";
            $context[] = $txt;
        }

        // 4. Assignments
        if (str_contains($q, 'assignment') || str_contains($q, 'homework') || str_contains($q, 'due')) {
            $stmt = $pdo->query("SELECT title, due_date FROM assignments WHERE due_date >= CURDATE() ORDER BY due_date ASC LIMIT 5");
            $rows = $stmt->fetchAll();
            if ($rows) {
                $txt = "Upcoming Assignments:\n";
                foreach ($rows as $r)
                    $txt .= "- '" . $r['title'] . "' is due on " . $r['due_date'] . "\n";
                $context[] = $txt;
            }
        }

        // 5. Timetable / Schedule (The missing piece)
        if (str_contains($q, 'time') || str_contains($q, 'schedule') || str_contains($q, 'today') || str_contains($q, 'tomorrow') || str_contains($q, 'lecture') || str_contains($q, 'session')) {
            $today = date('l');
            $context[] = "Current Server Time: " . date('Y-m-d H:i') . " ($today)";

            $stmt = $pdo->query("
                SELECT t.day, t.start_time, t.end_time, s.name as subject, u.name as teacher 
                FROM timetable t 
                JOIN subjects s ON t.subject_id = s.id 
                JOIN users u ON s.teacher_id = u.id
                ORDER BY FIELD(t.day, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'), t.start_time
            ");
            $rows = $stmt->fetchAll();
            if ($rows) {
                $txt = "University Weekly Schedule:\n";
                foreach ($rows as $r) {
                    $st = substr($r['start_time'], 0, 5);
                    $et = substr($r['end_time'], 0, 5);
                    $txt .= "- " . $r['day'] . " at $st to $et: " . $r['subject'] . " (Faculty: " . $r['teacher'] . ")\n";
                }
                $context[] = $txt;
            }
        }

    } catch (Exception $e) {
        // Log error silently
    }

    return implode("\n\n", $context);
}

function callGemini($prompt, $key)
{
    if (empty($key))
        return null;
    // Use the 2.0-flash model confirmed from listModels
    $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" . $key;
    $data = ['contents' => [['parts' => [['text' => $prompt]]]]];

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    if (curl_errno($ch)) {
        return "CURL Error: " . curl_error($ch);
    }
    curl_close($ch);

    $json = json_decode($response, true);

    if (isset($json['candidates'][0]['content']['parts'][0]['text'])) {
        return $json['candidates'][0]['content']['parts'][0]['text'];
    }

    if (isset($json['error']['message'])) {
        return "Gemini API Error: " . $json['error']['message'];
    }

    return null;
}

$dbContext = getDbContext($pdo, $query);
$answer = "";

if (!empty($GEMINI_API_KEY)) {
    if ($type === 'chat') {
        // SYSTEM PROMPT FORCING DATA USAGE
        $prompt = "You are 'AI Tutor', a personalized assistant for Smart Edu Platform students.
        
IMPORTANT RULES:
1. You have access to the university database. If the data is provided in the 'Context' below, you MUST use it to answer.
2. If the user asks for their schedule, look at the 'Weekly Schedule' in the context and match it to 'Today'.
3. Never say 'I don't have access to your schedule' if you see data in the context.
4. Be friendly and professional.

Context from University Database:
$dbContext

User Question: $query
Answer:";

        $answer = callGemini($prompt, $GEMINI_API_KEY);
    } else if ($type === 'quiz') {
        // (Quiz logic here if needed)
        $answer = callGemini("Generate 3 MCQs about $query in JSON.", $GEMINI_API_KEY);
    }
}

if (empty($answer)) {
    $answer = "I'm sorry, I'm currently unable to access the AI brain (Gemini returned an empty response). Please check your API key and connection.";
}

echo json_encode([
    'answer' => nl2br(htmlspecialchars($answer)),
    'quiz_data' => []
]);
?>