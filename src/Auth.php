<?php

class Auth {
    public static function check(): bool {
        return isset($_SESSION['authenticated']) && $_SESSION['authenticated'] === true;
    }

    public static function login(string $password): bool {
        if (password_verify($password, ADMIN_PASS_HASH)) {
            $_SESSION['authenticated'] = true;
            $_SESSION['login_time'] = time();
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
            return true;
        }
        return false;
    }

    public static function logout(): void {
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $p = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000,
                $p['path'], $p['domain'], $p['secure'], $p['httponly']
            );
        }
        session_destroy();
    }

    public static function csrfToken(): string {
        return $_SESSION['csrf_token'] ?? '';
    }

    public static function verifyCsrf(string $token): bool {
        return hash_equals(self::csrfToken(), $token);
    }
}
