<?php

class LinkController {
    public static function create(): void {
        require_auth();
        $data = get_json_input();
        $url = $data['url'] ?? '';
        $title = $data['title'] ?? '';
        $customSlug = $data['slug'] ?? '';
        $expiresAt = $data['expires_at'] ?? null;

        if (empty($url)) {
            json_response(['error' => 'URL is required'], 400);
        }

        if (!filter_var($url, FILTER_VALIDATE_URL)) {
            json_response(['error' => 'Invalid URL'], 400);
        }

        $slug = !empty($customSlug) ? $customSlug : LinkService::generateUniqueSlug();

        // Check slug uniqueness
        $existing = Database::query('SELECT id FROM links WHERE slug = ?', [$slug])->fetch();
        if ($existing) {
            json_response(['error' => 'Slug already taken'], 409);
        }

        $id = Database::insert('links', [
            'slug' => $slug,
            'target_url' => $url,
            'title' => $title,
            'expires_at' => $expiresAt,
        ]);

        json_response([
            'success' => true,
            'link' => [
                'id' => $id,
                'slug' => $slug,
                'short_url' => BASE_URL . '/s/' . $slug,
                'target_url' => $url,
                'title' => $title,
            ],
        ], 201);
    }

    public static function list(): void {
        require_auth();
        $page = max(1, (int)($_GET['page'] ?? 1));
        $limit = min(100, max(1, (int)($_GET['limit'] ?? 50)));
        $offset = ($page - 1) * $limit;

        $links = Database::query(
            'SELECT * FROM links ORDER BY created_at DESC LIMIT ? OFFSET ?',
            [$limit, $offset]
        )->fetchAll();

        $total = Database::query('SELECT COUNT(*) as count FROM links')->fetch()['count'];

        // Add full short URL to each link
        foreach ($links as &$link) {
            $link['short_url'] = BASE_URL . '/s/' . $link['slug'];
        }

        json_response([
            'links' => $links,
            'total' => (int)$total,
            'page' => $page,
            'pages' => ceil($total / $limit),
        ]);
    }

    public static function delete(array $params): void {
        require_auth();
        $id = $params['id'] ?? 0;

        $result = Database::query('DELETE FROM links WHERE id = ?', [$id]);
        if ($result->rowCount() === 0) {
            json_response(['error' => 'Link not found'], 404);
        }

        json_response(['success' => true]);
    }

    public static function redirect(array $params): void {
        $slug = $params['slug'] ?? '';

        $link = Database::query('SELECT * FROM links WHERE slug = ?', [$slug])->fetch();
        if (!$link) {
            http_response_code(404);
            echo '<!DOCTYPE html><html><head><title>Not Found</title></head><body style="background:#0a0a1a;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:monospace"><h1>Link not found</h1></body></html>';
            exit;
        }

        // Check expiry
        if ($link['expires_at'] && strtotime($link['expires_at']) < time()) {
            http_response_code(410);
            echo '<!DOCTYPE html><html><head><title>Expired</title></head><body style="background:#0a0a1a;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:monospace"><h1>This link has expired</h1></body></html>';
            exit;
        }

        // Increment click counter
        Database::query('UPDATE links SET clicks = clicks + 1 WHERE id = ?', [$link['id']]);

        header('Location: ' . $link['target_url'], true, 302);
        exit;
    }
}
