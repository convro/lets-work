<?php
/**
 * ConvroLabs Link Manager - Configuration
 */

// Load .env
$envFile = dirname(__DIR__) . '/.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        if (strpos($line, '=') === false) continue;
        [$key, $value] = explode('=', $line, 2);
        $_ENV[trim($key)] = trim($value);
        putenv(trim($key) . '=' . trim($value));
    }
}

define('APP_DOMAIN', $_ENV['APP_DOMAIN'] ?? 'localhost');
define('ADMIN_PASS_HASH', $_ENV['ADMIN_PASS_HASH'] ?? '');
define('APP_SECRET', $_ENV['APP_SECRET'] ?? 'dev-secret-change-me');
define('UPLOAD_MAX_SIZE', (int)($_ENV['UPLOAD_MAX_SIZE'] ?? 104857600));
define('DB_PATH', dirname(__DIR__) . '/data/app.db');
define('UPLOAD_DIR', dirname(__DIR__) . '/public/uploads/');
define('CDN_DIR', dirname(__DIR__) . '/public/cdn/');
define('BASE_URL', 'https://' . APP_DOMAIN);

// Logo URL
define('LOGO_URL', 'https://images.squarespace-cdn.com/content/v1/5ffe234606e5ec7bfc57a7a3/d9fe2ace-2d17-4886-a2e4-794fe080164c/Pen+Test+Icon%404x.png?format=500w');
