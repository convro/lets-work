<?php

class CssObfuscator {
    public static function obfuscate(string $code, string $originalName = 'style.css'): array {
        $token = generate_token(16);
        $bundleDir = CDN_DIR . 'css/' . $token;
        mkdir($bundleDir, 0755, true);

        // Step 1: Parse and rename classes
        $classMap = [];
        $processed = self::renameClasses($code, $classMap);

        // Step 2: Rename IDs
        $idMap = [];
        $processed = self::renameIds($processed, $idMap);

        // Step 3: Obfuscate values (colors -> alternate forms, etc.)
        $processed = self::obfuscateValues($processed);

        // Step 4: Inject decoy rules
        $processed = self::injectDecoyRules($processed);

        // Step 5: Minify
        $processed = self::minify($processed);

        // Step 6: Split into multiple files
        $numChunks = max(8, (int)(strlen($processed) / 500));
        $chunks = self::splitCSS($processed, $numChunks);

        $chunkFiles = [];
        foreach ($chunks as $i => $chunkCode) {
            $chunkName = '_s' . bin2hex(random_bytes(4)) . '.css';
            file_put_contents($bundleDir . '/' . $chunkName, $chunkCode);
            $chunkFiles[] = $chunkName;
        }

        // Create loader CSS that imports all chunks
        $loaderContent = '';
        $cdnBase = BASE_URL . '/cdn/ob/' . $token;
        foreach ($chunkFiles as $f) {
            $loaderContent .= '@import url("' . $cdnBase . '/' . $f . '");' . "\n";
        }
        file_put_contents($bundleDir . '/loader.css', $loaderContent);

        // Store record
        $id = Database::insert('obfuscated', [
            'type' => 'css',
            'original_name' => $originalName,
            'bundle_path' => $bundleDir,
            'access_token' => $token,
        ]);

        return [
            'id' => $id,
            'token' => $token,
            'loader_url' => $cdnBase . '/loader.css',
            'chunks' => count($chunkFiles),
            'html_snippet' => '<link rel="stylesheet" href="' . $cdnBase . '/loader.css">',
            'cdn_base' => $cdnBase,
            'class_map' => $classMap,
            'id_map' => $idMap,
        ];
    }

    private static function renameClasses(string $css, array &$map): string {
        // Find class selectors
        return preg_replace_callback('/\.([a-zA-Z_-][a-zA-Z0-9_-]*)/', function($m) use (&$map) {
            $name = $m[1];
            // Skip common framework classes and pseudo-elements
            if (in_array($name, ['clearfix', 'container', 'row', 'col', 'active', 'hidden', 'visible', 'disabled'])) {
                return $m[0];
            }
            if (!isset($map[$name])) {
                $map[$name] = '_x' . substr(md5($name . random_int(0, 9999)), 0, 8);
            }
            return '.' . $map[$name];
        }, $css);
    }

    private static function renameIds(string $css, array &$map): string {
        return preg_replace_callback('/#([a-zA-Z_-][a-zA-Z0-9_-]*)/', function($m) use (&$map) {
            $name = $m[1];
            if (!isset($map[$name])) {
                $map[$name] = '_i' . substr(md5($name . random_int(0, 9999)), 0, 8);
            }
            return '#' . $map[$name];
        }, $css);
    }

    private static function obfuscateValues(string $css): string {
        // Convert hex colors to rgb/hsl alternates
        $css = preg_replace_callback('/#([0-9a-fA-F]{6})\b/', function($m) {
            $hex = $m[1];
            $r = hexdec(substr($hex, 0, 2));
            $g = hexdec(substr($hex, 2, 2));
            $b = hexdec(substr($hex, 4, 2));
            // Randomly choose rgb or original
            return random_int(0, 1) ? "rgb({$r},{$g},{$b})" : $m[0];
        }, $css);

        // Convert 3-char hex to 6-char
        $css = preg_replace_callback('/#([0-9a-fA-F]{3})\b/', function($m) {
            $h = $m[1];
            return '#' . $h[0] . $h[0] . $h[1] . $h[1] . $h[2] . $h[2];
        }, $css);

        // Convert px values to equivalent calc() expressions
        $css = preg_replace_callback('/:\s*(\d+)px/', function($m) {
            $val = (int)$m[1];
            if ($val > 10 && random_int(0, 1)) {
                $a = random_int(1, $val - 1);
                $b = $val - $a;
                return ':calc(' . $a . 'px + ' . $b . 'px)';
            }
            return $m[0];
        }, $css);

        return $css;
    }

    private static function injectDecoyRules(string $css): string {
        $decoys = [];
        for ($i = 0; $i < 20; $i++) {
            $className = '._d' . bin2hex(random_bytes(3));
            $props = [
                'display:none',
                'visibility:hidden',
                'opacity:0',
                'position:absolute',
                'left:-9999px',
                'width:0',
                'height:0',
                'overflow:hidden',
                'clip:rect(0,0,0,0)',
            ];
            shuffle($props);
            $numProps = random_int(1, 3);
            $ruleProps = implode(';', array_slice($props, 0, $numProps));
            $decoys[] = $className . '{' . $ruleProps . '}';
        }

        // Interleave decoys with real CSS
        $lines = explode('}', $css);
        $result = [];
        $decoyIdx = 0;

        foreach ($lines as $i => $line) {
            $result[] = $line . '}';
            if ($i % 3 === 2 && $decoyIdx < count($decoys)) {
                $result[] = $decoys[$decoyIdx++];
            }
        }

        // Add remaining decoys at end
        while ($decoyIdx < count($decoys)) {
            $result[] = $decoys[$decoyIdx++];
        }

        return implode("\n", $result);
    }

    private static function minify(string $css): string {
        // Remove comments
        $css = preg_replace('/\/\*[\s\S]*?\*\//', '', $css);
        // Remove excess whitespace
        $css = preg_replace('/\s+/', ' ', $css);
        // Remove spaces around special chars
        $css = preg_replace('/\s*([{}:;,>~+])\s*/', '$1', $css);
        // Remove trailing semicolons before }
        $css = str_replace(';}', '}', $css);
        return trim($css);
    }

    private static function splitCSS(string $css, int $numChunks): array {
        // Split by rule blocks
        preg_match_all('/[^{}]+\{[^{}]*\}/', $css, $matches);
        $rules = $matches[0] ?? [$css];

        $rulesPerChunk = max(1, (int)ceil(count($rules) / $numChunks));
        $chunks = [];

        for ($i = 0; $i < count($rules); $i += $rulesPerChunk) {
            $chunk = implode("\n", array_slice($rules, $i, $rulesPerChunk));
            $chunks[] = $chunk;
        }

        // Ensure minimum chunks
        while (count($chunks) < 8) {
            $fakeClass = '._d' . bin2hex(random_bytes(3));
            $chunks[] = $fakeClass . '{position:absolute;left:-9999px;visibility:hidden}';
        }

        return $chunks;
    }
}
