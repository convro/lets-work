<?php

class ToolController {
    // Base64 encode/decode
    public static function base64(): void {
        require_auth();
        $data = get_json_input();
        $action = $data['action'] ?? 'encode';
        $input = $data['input'] ?? '';

        if ($action === 'encode') {
            json_response(['result' => base64_encode($input)]);
        } else {
            $decoded = base64_decode($input, true);
            if ($decoded === false) {
                json_response(['error' => 'Invalid base64 input'], 400);
            }
            json_response(['result' => $decoded]);
        }
    }

    // Hash generator
    public static function hash(): void {
        require_auth();
        $data = get_json_input();
        $input = $data['input'] ?? '';
        $algo = $data['algorithm'] ?? 'sha256';

        $algos = ['md5', 'sha1', 'sha256', 'sha384', 'sha512'];
        if (!in_array($algo, $algos)) {
            json_response(['error' => 'Unsupported algorithm. Use: ' . implode(', ', $algos)], 400);
        }

        json_response([
            'result' => hash($algo, $input),
            'algorithm' => $algo,
        ]);
    }

    // URL encode/decode
    public static function urlEncode(): void {
        require_auth();
        $data = get_json_input();
        $action = $data['action'] ?? 'encode';
        $input = $data['input'] ?? '';

        if ($action === 'encode') {
            json_response(['result' => urlencode($input)]);
        } else {
            json_response(['result' => urldecode($input)]);
        }
    }

    // JSON formatter/validator
    public static function jsonFormat(): void {
        require_auth();
        $data = get_json_input();
        $input = $data['input'] ?? '';

        $decoded = json_decode($input);
        if (json_last_error() !== JSON_ERROR_NONE) {
            json_response([
                'valid' => false,
                'error' => json_last_error_msg(),
            ]);
        }

        json_response([
            'valid' => true,
            'formatted' => json_encode($decoded, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
            'minified' => json_encode($decoded, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
        ]);
    }

    // Password/token generator
    public static function generatePassword(): void {
        require_auth();
        $data = get_json_input();
        $length = min(128, max(8, (int)($data['length'] ?? 32)));
        $type = $data['type'] ?? 'mixed';

        $charsets = [
            'alpha' => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
            'numeric' => '0123456789',
            'mixed' => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*',
            'hex' => '0123456789abcdef',
        ];

        $chars = $charsets[$type] ?? $charsets['mixed'];
        $result = '';
        for ($i = 0; $i < $length; $i++) {
            $result .= $chars[random_int(0, strlen($chars) - 1)];
        }

        json_response(['result' => $result]);
    }

    // JWT decoder (decode only, no verification)
    public static function jwtDecode(): void {
        require_auth();
        $data = get_json_input();
        $token = $data['token'] ?? '';

        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            json_response(['error' => 'Invalid JWT format'], 400);
        }

        $header = json_decode(base64_decode(strtr($parts[0], '-_', '+/')), true);
        $payload = json_decode(base64_decode(strtr($parts[1], '-_', '+/')), true);

        if (!$header || !$payload) {
            json_response(['error' => 'Could not decode JWT'], 400);
        }

        json_response([
            'header' => $header,
            'payload' => $payload,
            'signature' => $parts[2],
        ]);
    }

    // HTML entity encode/decode
    public static function htmlEntities(): void {
        require_auth();
        $data = get_json_input();
        $action = $data['action'] ?? 'encode';
        $input = $data['input'] ?? '';

        if ($action === 'encode') {
            json_response(['result' => htmlspecialchars($input, ENT_QUOTES | ENT_HTML5, 'UTF-8')]);
        } else {
            json_response(['result' => html_entity_decode($input, ENT_QUOTES | ENT_HTML5, 'UTF-8')]);
        }
    }

    // Snippet/pastebin creator
    public static function createSnippet(): void {
        require_auth();
        $data = get_json_input();
        $content = $data['content'] ?? '';
        $title = $data['title'] ?? 'Untitled';
        $language = $data['language'] ?? 'text';
        $expiresAt = $data['expires_at'] ?? null;

        if (empty($content)) {
            json_response(['error' => 'Content is required'], 400);
        }

        $slug = generate_slug(8);
        $token = generate_token(16);

        $id = Database::insert('snippets', [
            'slug' => $slug,
            'title' => $title,
            'language' => $language,
            'content' => $content,
            'access_token' => $token,
            'expires_at' => $expiresAt,
        ]);

        json_response([
            'success' => true,
            'snippet' => [
                'id' => $id,
                'slug' => $slug,
                'url' => BASE_URL . '/p/' . $slug,
                'title' => $title,
            ],
        ], 201);
    }

    public static function listSnippets(): void {
        require_auth();
        $snippets = Database::query(
            'SELECT id, slug, title, language, views, created_at, expires_at FROM snippets ORDER BY created_at DESC LIMIT 50'
        )->fetchAll();

        foreach ($snippets as &$s) {
            $s['url'] = BASE_URL . '/p/' . $s['slug'];
        }

        json_response(['snippets' => $snippets]);
    }

    public static function viewSnippet(array $params): void {
        $slug = $params['slug'] ?? '';
        $snippet = Database::query('SELECT * FROM snippets WHERE slug = ?', [$slug])->fetch();

        if (!$snippet) {
            http_response_code(404);
            echo 'Snippet not found';
            exit;
        }

        if ($snippet['expires_at'] && strtotime($snippet['expires_at']) < time()) {
            http_response_code(410);
            echo 'This snippet has expired';
            exit;
        }

        Database::query('UPDATE snippets SET views = views + 1 WHERE id = ?', [$snippet['id']]);

        // Return raw content if ?raw=1
        if (isset($_GET['raw'])) {
            header('Content-Type: text/plain');
            echo $snippet['content'];
            exit;
        }

        // Return JSON for API calls
        if (strpos($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json') !== false) {
            json_response($snippet);
        }

        // Simple HTML view for browser
        $title = htmlspecialchars($snippet['title']);
        $content = htmlspecialchars($snippet['content']);
        $lang = htmlspecialchars($snippet['language']);
        echo <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{$title} - ConvroLabs</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0a1a;color:#e0e0ff;font-family:'Courier New',monospace;padding:2rem}
.header{margin-bottom:1rem;display:flex;justify-content:space-between;align-items:center}
h1{font-size:1.2rem;color:#0ff;text-shadow:0 0 10px rgba(0,255,255,0.5)}
.meta{color:#888;font-size:0.8rem}
pre{background:#12122a;border:1px solid rgba(0,255,255,0.15);border-radius:8px;padding:1.5rem;overflow-x:auto;line-height:1.6;font-size:0.9rem}
a{color:#f0f;text-decoration:none}
a:hover{text-shadow:0 0 8px rgba(255,0,255,0.5)}
</style>
</head>
<body>
<div class="header">
<h1>{$title}</h1>
<span class="meta">{$lang} &middot; <a href="?raw=1">raw</a></span>
</div>
<pre><code>{$content}</code></pre>
</body>
</html>
HTML;
        exit;
    }

    // Dashboard stats
    public static function stats(): void {
        require_auth();

        $linkCount = Database::query('SELECT COUNT(*) as c FROM links')->fetch()['c'];
        $fileCount = Database::query('SELECT COUNT(*) as c FROM files')->fetch()['c'];
        $snippetCount = Database::query('SELECT COUNT(*) as c FROM snippets')->fetch()['c'];
        $obfuscatedCount = Database::query('SELECT COUNT(*) as c FROM obfuscated')->fetch()['c'];
        $totalClicks = Database::query('SELECT COALESCE(SUM(clicks),0) as c FROM links')->fetch()['c'];
        $totalDownloads = Database::query('SELECT COALESCE(SUM(downloads),0) as c FROM files')->fetch()['c'];

        $recentLinks = Database::query(
            'SELECT slug, title, target_url, clicks, created_at FROM links ORDER BY created_at DESC LIMIT 5'
        )->fetchAll();

        $recentFiles = Database::query(
            'SELECT original_name, mime_type, size_bytes, downloads, created_at FROM files ORDER BY created_at DESC LIMIT 5'
        )->fetchAll();

        json_response([
            'links' => (int)$linkCount,
            'files' => (int)$fileCount,
            'snippets' => (int)$snippetCount,
            'obfuscated' => (int)$obfuscatedCount,
            'total_clicks' => (int)$totalClicks,
            'total_downloads' => (int)$totalDownloads,
            'recent_links' => $recentLinks,
            'recent_files' => $recentFiles,
        ]);
    }

    public static function deleteSnippet(array $params): void {
        require_auth();
        $id = $params['id'] ?? 0;
        Database::query('DELETE FROM snippets WHERE id = ?', [$id]);
        json_response(['success' => true]);
    }
}
