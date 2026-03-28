<?php

class Router {
    private array $routes = [];
    private $notFoundHandler = null;

    public function get(string $path, callable $handler): self {
        $this->routes['GET'][$path] = $handler;
        return $this;
    }

    public function post(string $path, callable $handler): self {
        $this->routes['POST'][$path] = $handler;
        return $this;
    }

    public function delete(string $path, callable $handler): self {
        $this->routes['DELETE'][$path] = $handler;
        return $this;
    }

    public function notFound(callable $handler): self {
        $this->notFoundHandler = $handler;
        return $this;
    }

    public function dispatch(): void {
        $method = $_SERVER['REQUEST_METHOD'];
        $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        $uri = rtrim($uri, '/') ?: '/';

        // Exact match first
        if (isset($this->routes[$method][$uri])) {
            ($this->routes[$method][$uri])();
            return;
        }

        // Pattern matching (e.g., /api/links/{id})
        foreach ($this->routes[$method] ?? [] as $pattern => $handler) {
            $regex = preg_replace('#\{(\w+)\}#', '(?P<$1>[^/]+)', $pattern);
            if (preg_match('#^' . $regex . '$#', $uri, $matches)) {
                $params = array_filter($matches, 'is_string', ARRAY_FILTER_USE_KEY);
                ($handler)($params);
                return;
            }
        }

        // Not found
        if ($this->notFoundHandler) {
            ($this->notFoundHandler)();
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Not found']);
        }
    }
}
