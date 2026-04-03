<?php
// api/set_lang.php
session_start();
header('Content-Type: application/json');

$input = json_decode(file_get_contents('php://input'), true);
$lang = $input['lang'] ?? 'en';

if (in_array($lang, ['en', 'hi', 'gu'])) {
    $_SESSION['app_lang'] = $lang;
    echo json_encode(['success' => true, 'lang' => $lang]);
} else {
    echo json_encode(['success' => false, 'message' => 'Invalid language']);
}
?>