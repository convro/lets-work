<?php
require_once __DIR__ . '/../src/bootstrap.php';

$router = new Router();

// ====== AUTH ROUTES ======
$router->post('/api/auth/login', [AuthController::class, 'login']);
$router->post('/api/auth/logout', [AuthController::class, 'logout']);
$router->get('/api/auth/status', [AuthController::class, 'status']);

// ====== DASHBOARD ======
$router->get('/api/stats', [ToolController::class, 'stats']);

// ====== LINK ROUTES ======
$router->post('/api/links', [LinkController::class, 'create']);
$router->get('/api/links', [LinkController::class, 'list']);
$router->delete('/api/links/{id}', [LinkController::class, 'delete']);

// ====== FILE ROUTES ======
$router->post('/api/files', [FileController::class, 'upload']);
$router->get('/api/files', [FileController::class, 'list']);
$router->delete('/api/files/{id}', [FileController::class, 'delete']);

// ====== OBFUSCATOR ROUTES ======
$router->post('/api/obfuscate/js', [ObfuscatorController::class, 'obfuscateJs']);
$router->post('/api/obfuscate/css', [ObfuscatorController::class, 'obfuscateCss']);

// ====== TOOL ROUTES ======
$router->post('/api/tools/base64', [ToolController::class, 'base64']);
$router->post('/api/tools/hash', [ToolController::class, 'hash']);
$router->post('/api/tools/url-encode', [ToolController::class, 'urlEncode']);
$router->post('/api/tools/json-format', [ToolController::class, 'jsonFormat']);
$router->post('/api/tools/password', [ToolController::class, 'generatePassword']);
$router->post('/api/tools/jwt-decode', [ToolController::class, 'jwtDecode']);
$router->post('/api/tools/html-entities', [ToolController::class, 'htmlEntities']);

// ====== SNIPPET ROUTES ======
$router->post('/api/snippets', [ToolController::class, 'createSnippet']);
$router->get('/api/snippets', [ToolController::class, 'listSnippets']);
$router->delete('/api/snippets/{id}', [ToolController::class, 'deleteSnippet']);

// ====== PUBLIC ROUTES ======
$router->get('/s/{slug}', [LinkController::class, 'redirect']);
$router->get('/p/{slug}', [ToolController::class, 'viewSnippet']);
$router->get('/cdn/f/{token}', [FileController::class, 'serve']);
$router->get('/cdn/ob/{token}/{file}', [ObfuscatorController::class, 'serveBundle']);

// ====== FRONTEND (SPA) ======
$router->notFound(function() {
    $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

    // If it's an API route that wasn't matched, return 404 JSON
    if (strpos($uri, '/api/') === 0) {
        json_response(['error' => 'Endpoint not found'], 404);
    }

    // Serve the SPA
    require __DIR__ . '/app.html';
});

$router->dispatch();
