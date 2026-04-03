<?php
require 'api/db.php';
$email = 'yug.bca24@skipsuniversity.edu.in';
$password = 'password123';

$stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
$stmt->execute([$email]);
$user = $stmt->fetch();

if ($user) {
    echo "User Found: " . $user['name'] . "\n";
    echo "Hash in DB: " . $user['password'] . "\n";
    if (password_verify($password, $user['password'])) {
        echo "Password matches (Hashed)\n";
    } elseif ($user['password'] === $password) {
        echo "Password matches (Plain)\n";
    } else {
        echo "Password DOES NOT match\n";
    }
} else {
    echo "User NOT FOUND\n";
}
?>
