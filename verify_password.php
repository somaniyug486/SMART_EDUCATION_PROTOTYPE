<?php
$hash = '$2y$10$kXordOmLd8eDDg4PgkVwenenoUpz8tiirSRBdbpjlPxlPSVb.6hH7y';
$password = 'password123';
if (password_verify($password, $hash)) {
    echo "VERIFICATION SUCCESS: Password matches hash.\n";
} else {
    echo "VERIFICATION FAILED: Password does not match hash.\n";
}
?>