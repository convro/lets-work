<?php

class FileService {
    private static array $allowedMimeTypes = [
        // Images
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/avif', 'image/bmp', 'image/ico',
        // Video
        'video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/quicktime',
        // Audio
        'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm', 'audio/flac',
        // Documents
        'application/pdf', 'application/json', 'text/plain', 'text/html', 'text/css',
        'application/javascript', 'text/javascript',
        // Archives
        'application/zip', 'application/gzip', 'application/x-tar',
        // Fonts
        'font/woff', 'font/woff2', 'font/ttf', 'font/otf', 'application/font-woff', 'application/font-woff2',
    ];

    public static function store(array $uploadedFile): array {
        $originalName = basename($uploadedFile['name']);
        $tmpPath = $uploadedFile['tmp_name'];

        // Validate MIME type using finfo (not user-supplied type)
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mimeType = $finfo->file($tmpPath);

        if (!in_array($mimeType, self::$allowedMimeTypes)) {
            json_response(['error' => 'File type not allowed: ' . $mimeType], 400);
        }

        // Generate secure filename
        $ext = pathinfo($originalName, PATHINFO_EXTENSION);
        $ext = preg_replace('/[^a-zA-Z0-9]/', '', $ext);
        $storedName = bin2hex(random_bytes(16)) . ($ext ? '.' . $ext : '');

        // Generate access token
        $accessToken = generate_token(16);

        // Move file
        if (!move_uploaded_file($tmpPath, UPLOAD_DIR . $storedName)) {
            json_response(['error' => 'Failed to store file'], 500);
        }

        $id = Database::insert('files', [
            'original_name' => $originalName,
            'stored_name' => $storedName,
            'mime_type' => $mimeType,
            'size_bytes' => $uploadedFile['size'],
            'access_token' => $accessToken,
        ]);

        return [
            'id' => $id,
            'original_name' => $originalName,
            'mime_type' => $mimeType,
            'size_bytes' => $uploadedFile['size'],
            'size_human' => self::humanSize($uploadedFile['size']),
            'url' => BASE_URL . '/cdn/f/' . $accessToken,
        ];
    }

    public static function humanSize(int $bytes): string {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $i = 0;
        $size = (float)$bytes;
        while ($size >= 1024 && $i < count($units) - 1) {
            $size /= 1024;
            $i++;
        }
        return round($size, 2) . ' ' . $units[$i];
    }
}
