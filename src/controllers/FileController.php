<?php

class FileController {
    public static function upload(): void {
        require_auth();

        if (empty($_FILES['file'])) {
            json_response(['error' => 'No file uploaded'], 400);
        }

        $file = $_FILES['file'];
        if ($file['error'] !== UPLOAD_ERR_OK) {
            json_response(['error' => 'Upload failed with error code: ' . $file['error']], 400);
        }

        if ($file['size'] > UPLOAD_MAX_SIZE) {
            json_response(['error' => 'File too large. Max: ' . round(UPLOAD_MAX_SIZE / 1048576) . 'MB'], 400);
        }

        $result = FileService::store($file);

        json_response([
            'success' => true,
            'file' => $result,
        ], 201);
    }

    public static function list(): void {
        require_auth();
        $page = max(1, (int)($_GET['page'] ?? 1));
        $limit = min(100, max(1, (int)($_GET['limit'] ?? 50)));
        $offset = ($page - 1) * $limit;

        $files = Database::query(
            'SELECT * FROM files ORDER BY created_at DESC LIMIT ? OFFSET ?',
            [$limit, $offset]
        )->fetchAll();

        $total = Database::query('SELECT COUNT(*) as count FROM files')->fetch()['count'];

        foreach ($files as &$f) {
            $f['url'] = BASE_URL . '/cdn/f/' . $f['access_token'];
            $f['size_human'] = FileService::humanSize($f['size_bytes']);
        }

        json_response([
            'files' => $files,
            'total' => (int)$total,
            'page' => $page,
            'pages' => ceil($total / $limit),
        ]);
    }

    public static function serve(array $params): void {
        $token = $params['token'] ?? '';

        $file = Database::query(
            'SELECT * FROM files WHERE access_token = ?',
            [$token]
        )->fetch();

        if (!$file) {
            http_response_code(404);
            echo 'File not found';
            exit;
        }

        $path = UPLOAD_DIR . $file['stored_name'];
        if (!file_exists($path)) {
            http_response_code(404);
            echo 'File missing from storage';
            exit;
        }

        // Increment download counter
        Database::query('UPDATE files SET downloads = downloads + 1 WHERE id = ?', [$file['id']]);

        // Serve file
        header('Content-Type: ' . $file['mime_type']);
        header('Content-Length: ' . $file['size_bytes']);
        header('Content-Disposition: inline; filename="' . $file['original_name'] . '"');
        header('Cache-Control: public, max-age=31536000, immutable');
        header('X-Content-Type-Options: nosniff');

        readfile($path);
        exit;
    }

    public static function delete(array $params): void {
        require_auth();
        $id = $params['id'] ?? 0;

        $file = Database::query('SELECT * FROM files WHERE id = ?', [$id])->fetch();
        if (!$file) {
            json_response(['error' => 'File not found'], 404);
        }

        // Delete physical file
        $path = UPLOAD_DIR . $file['stored_name'];
        if (file_exists($path)) {
            unlink($path);
        }

        Database::query('DELETE FROM files WHERE id = ?', [$id]);
        json_response(['success' => true]);
    }
}
