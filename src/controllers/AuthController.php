<?php

class AuthController {
    public static function login(): void {
        $data = get_json_input();
        $password = $data['password'] ?? '';

        if (empty($password)) {
            json_response(['error' => 'Password required'], 400);
        }

        if (Auth::login($password)) {
            json_response([
                'success' => true,
                'csrf_token' => Auth::csrfToken(),
            ]);
        }

        // Rate limit: simple delay on failed attempt
        usleep(500000);
        json_response(['error' => 'Invalid password'], 401);
    }

    public static function logout(): void {
        Auth::logout();
        json_response(['success' => true]);
    }

    public static function status(): void {
        json_response([
            'authenticated' => Auth::check(),
            'csrf_token' => Auth::check() ? Auth::csrfToken() : null,
        ]);
    }
}
