<?php

class LinkService {
    public static function generateUniqueSlug(int $length = 7): string {
        $maxAttempts = 10;
        for ($i = 0; $i < $maxAttempts; $i++) {
            $slug = generate_slug($length);
            $existing = Database::query('SELECT id FROM links WHERE slug = ?', [$slug])->fetch();
            if (!$existing) {
                return $slug;
            }
        }
        // Fallback: longer slug
        return generate_slug($length + 3);
    }
}
