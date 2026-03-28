<?php
session_start([
    'cookie_httponly' => true,
    'cookie_secure' => true,
    'cookie_samesite' => 'Strict',
    'use_strict_mode' => true,
]);

require_once __DIR__ . '/../config/app.php';
require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/Auth.php';
require_once __DIR__ . '/Router.php';
require_once __DIR__ . '/controllers/AuthController.php';
require_once __DIR__ . '/controllers/LinkController.php';
require_once __DIR__ . '/controllers/FileController.php';
require_once __DIR__ . '/controllers/ObfuscatorController.php';
require_once __DIR__ . '/controllers/ToolController.php';
require_once __DIR__ . '/services/LinkService.php';
require_once __DIR__ . '/services/FileService.php';
require_once __DIR__ . '/services/JsObfuscator.php';
require_once __DIR__ . '/services/CssObfuscator.php';

// Initialize database on first run
Database::init();

// Ensure upload and CDN directories exist
foreach ([UPLOAD_DIR, CDN_DIR] as $dir) {
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
}

// Helper functions
function json_response(array $data, int $code = 200): void {
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

function require_auth(): void {
    if (!Auth::check()) {
        json_response(['error' => 'Unauthorized'], 401);
    }
}

function get_json_input(): array {
    $input = file_get_contents('php://input');
    return json_decode($input, true) ?? [];
}

function generate_token(int $length = 32): string {
    return bin2hex(random_bytes($length));
}

function generate_slug(int $length = 7): string {
    $chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    $slug = '';
    for ($i = 0; $i < $length; $i++) {
        $slug .= $chars[random_int(0, strlen($chars) - 1)];
    }
    return $slug;
}
