<?php

class ObfuscatorController {
    public static function obfuscateJs(): void {
        require_auth();

        $code = '';
        if (!empty($_FILES['file'])) {
            $code = file_get_contents($_FILES['file']['tmp_name']);
        } else {
            $data = get_json_input();
            $code = $data['code'] ?? '';
        }

        if (empty($code)) {
            json_response(['error' => 'No JS code provided'], 400);
        }

        $originalName = $_FILES['file']['name'] ?? 'script.js';
        $result = JsObfuscator::obfuscate($code, $originalName);

        json_response([
            'success' => true,
            'result' => $result,
        ]);
    }

    public static function obfuscateCss(): void {
        require_auth();

        $code = '';
        if (!empty($_FILES['file'])) {
            $code = file_get_contents($_FILES['file']['tmp_name']);
        } else {
            $data = get_json_input();
            $code = $data['code'] ?? '';
        }

        if (empty($code)) {
            json_response(['error' => 'No CSS code provided'], 400);
        }

        $originalName = $_FILES['file']['name'] ?? 'style.css';
        $result = CssObfuscator::obfuscate($code, $originalName);

        json_response([
            'success' => true,
            'result' => $result,
        ]);
    }

    public static function serveBundle(array $params): void {
        $token = $params['token'] ?? '';
        $file = $params['file'] ?? '';

        $record = Database::query(
            'SELECT * FROM obfuscated WHERE access_token = ?',
            [$token]
        )->fetch();

        if (!$record) {
            http_response_code(404);
            echo 'Not found';
            exit;
        }

        $bundlePath = $record['bundle_path'];
        $filePath = $bundlePath . '/' . basename($file);

        if (!file_exists($filePath)) {
            http_response_code(404);
            echo 'Chunk not found';
            exit;
        }

        $ext = pathinfo($file, PATHINFO_EXTENSION);
        $mimeTypes = ['js' => 'application/javascript', 'css' => 'text/css'];
        $mime = $mimeTypes[$ext] ?? 'application/octet-stream';

        header('Content-Type: ' . $mime);
        header('Cache-Control: public, max-age=31536000, immutable');
        readfile($filePath);
        exit;
    }
}
