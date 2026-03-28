<?php

class JsObfuscator {
    private static array $jsReserved = [
        'abstract','arguments','await','boolean','break','byte','case','catch','char','class',
        'const','continue','debugger','default','delete','do','double','else','enum','eval',
        'export','extends','false','final','finally','float','for','function','goto','if',
        'implements','import','in','instanceof','int','interface','let','long','native','new',
        'null','package','private','protected','public','return','short','static','super',
        'switch','synchronized','this','throw','throws','transient','true','try','typeof',
        'undefined','var','void','volatile','while','with','yield',
        // Built-in globals
        'window','document','console','navigator','location','history','localStorage',
        'sessionStorage','fetch','XMLHttpRequest','Promise','Array','Object','String',
        'Number','Boolean','Math','Date','RegExp','JSON','Map','Set','Symbol',
        'parseInt','parseFloat','setTimeout','setInterval','clearTimeout','clearInterval',
        'encodeURIComponent','decodeURIComponent','encodeURI','decodeURI','atob','btoa',
        'requestAnimationFrame','cancelAnimationFrame','alert','confirm','prompt',
        'Error','TypeError','RangeError','SyntaxError','ReferenceError',
        'Infinity','NaN','isNaN','isFinite','undefined','globalThis',
        'require','module','exports','__dirname','__filename',
        'addEventListener','removeEventListener','dispatchEvent',
        'createElement','getElementById','querySelector','querySelectorAll',
        'appendChild','removeChild','innerHTML','textContent','classList',
        'getAttribute','setAttribute','style','prototype','constructor',
        'apply','bind','call','toString','valueOf','hasOwnProperty',
        'length','push','pop','shift','unshift','splice','slice','concat',
        'forEach','map','filter','reduce','find','findIndex','some','every',
        'keys','values','entries','from','of','assign','freeze','defineProperty',
    ];

    public static function obfuscate(string $code, string $originalName = 'script.js'): array {
        $token = generate_token(16);
        $bundleDir = CDN_DIR . 'js/' . $token;
        mkdir($bundleDir, 0755, true);

        // Step 1: Extract and rename identifiers
        $identMap = [];
        $counter = 0;
        $processed = self::renameIdentifiers($code, $identMap, $counter);

        // Step 2: Encode string literals
        $strings = [];
        $processed = self::encodeStrings($processed, $strings);

        // Step 3: Add dead code / noise
        $processed = self::injectDeadCode($processed);

        // Step 4: Split into chunks (40+)
        $numChunks = max(40, (int)(strlen($processed) / 200));
        $chunks = self::splitIntoChunks($processed, $numChunks, $strings);

        // Step 5: Write chunk files
        $chunkFiles = [];
        foreach ($chunks as $i => $chunkCode) {
            $chunkName = '_c' . bin2hex(random_bytes(4)) . '.js';
            file_put_contents($bundleDir . '/' . $chunkName, $chunkCode);
            $chunkFiles[] = $chunkName;
        }

        // Step 6: Create loader
        $loader = self::createLoader($chunkFiles, $token, $strings);
        file_put_contents($bundleDir . '/loader.js', $loader);

        // Store record in DB
        $id = Database::insert('obfuscated', [
            'type' => 'js',
            'original_name' => $originalName,
            'bundle_path' => $bundleDir,
            'access_token' => $token,
        ]);

        $cdnBase = BASE_URL . '/cdn/ob/' . $token;

        return [
            'id' => $id,
            'token' => $token,
            'loader_url' => $cdnBase . '/loader.js',
            'chunks' => count($chunkFiles),
            'html_snippet' => '<script src="' . $cdnBase . '/loader.js" defer></script>',
            'cdn_base' => $cdnBase,
        ];
    }

    private static function renameIdentifiers(string $code, array &$map, int &$counter): string {
        // Find variable/function declarations
        $pattern = '/\b(var|let|const|function)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/';
        $code = preg_replace_callback($pattern, function($m) use (&$map, &$counter) {
            $name = $m[2];
            if (in_array($name, self::$jsReserved)) return $m[0];
            if (!isset($map[$name])) {
                $map[$name] = '_0x' . dechex(0xa000 + $counter++);
            }
            return $m[1] . ' ' . $map[$name];
        }, $code);

        // Replace usage of renamed identifiers
        foreach ($map as $original => $obfuscated) {
            $code = preg_replace('/\b' . preg_quote($original, '/') . '\b/', $obfuscated, $code);
        }

        return $code;
    }

    private static function encodeStrings(string $code, array &$strings): string {
        // Extract string literals and replace with references
        $idx = 0;
        $code = preg_replace_callback('/(?<![\\\\])(["\'])(?:(?!\1|\\\\).|\\\\.)*\1/', function($m) use (&$strings, &$idx) {
            $strings[$idx] = $m[0];
            $ref = '_0xstr[' . $idx . ']';
            $idx++;
            return $ref;
        }, $code);

        return $code;
    }

    private static function injectDeadCode(string $code): string {
        $noise = [
            'void function(){var _0xdead=0x0;if(_0xdead)console.log(_0xdead)}();',
            'var _0xnull=typeof undefined!=="undefined"?null:void 0x0;',
            '(function(){var _0xtrap=[];for(var _0xi=0x0;_0xi<0x0;_0xi++){_0xtrap.push(_0xi)}})();',
            'void(typeof window!=="undefined"&&void 0x0);',
            'var _0xcheck=function(){return!0x1}();',
        ];

        $lines = explode("\n", $code);
        $result = [];
        $noiseIdx = 0;

        foreach ($lines as $i => $line) {
            $result[] = $line;
            // Insert noise every ~5 lines
            if ($i % 5 === 4 && $noiseIdx < count($noise)) {
                $result[] = $noise[$noiseIdx % count($noise)];
                $noiseIdx++;
            }
        }

        // Add more noise at random positions
        for ($i = 0; $i < 15; $i++) {
            $pos = random_int(0, count($result));
            $noiseCode = 'var _0x' . bin2hex(random_bytes(3)) . '=function(){return ' .
                '0x' . dechex(random_int(100, 9999)) . '^0x' . dechex(random_int(100, 9999)) . ';};';
            array_splice($result, $pos, 0, [$noiseCode]);
        }

        return implode("\n", $result);
    }

    private static function splitIntoChunks(string $code, int $numChunks, array $strings): array {
        $lines = explode("\n", $code);
        $totalLines = count($lines);
        $linesPerChunk = max(1, (int)ceil($totalLines / $numChunks));
        $chunks = [];

        for ($i = 0; $i < $totalLines; $i += $linesPerChunk) {
            $chunkLines = array_slice($lines, $i, $linesPerChunk);
            $chunkCode = implode("\n", $chunkLines);

            // Wrap each chunk in an IIFE with a unique identifier
            $chunkId = '_0xc' . bin2hex(random_bytes(3));
            $wrapped = "(function(){" .
                "/* " . bin2hex(random_bytes(8)) . " */" .
                $chunkCode .
                "})();";

            $chunks[] = $wrapped;
        }

        // Pad to ensure minimum 40 chunks
        while (count($chunks) < 40) {
            $fakeCode = 'void function(){var _0x' . bin2hex(random_bytes(3)) . '=' .
                random_int(1000, 9999) . ';if(typeof _0x' . bin2hex(random_bytes(3)) .
                '!=="undefined")void 0x0;}();';
            $chunks[] = "(function(){" . $fakeCode . "})();";
        }

        return $chunks;
    }

    private static function createLoader(array $chunkFiles, string $token, array $strings): string {
        $cdnBase = BASE_URL . '/cdn/ob/' . $token;

        // Create encoded strings array
        $strArray = '';
        foreach ($strings as $i => $str) {
            $encoded = base64_encode($str);
            $strArray .= "'" . $encoded . "',";
        }

        // Shuffle chunk order for loading but execute in correct order
        $order = range(0, count($chunkFiles) - 1);

        $chunksJson = json_encode($chunkFiles);

        $loader = <<<JS
(function(){
'use strict';
var _0xbase='{$cdnBase}';
var _0xchunks={$chunksJson};
var _0xstr=[{$strArray}].map(function(s){try{return atob(s)}catch(e){return s}});
var _0xloaded=0;
var _0xtotal=_0xchunks.length;
function _0xload(_0xi){
if(_0xi>=_0xtotal)return;
var _0xs=document.createElement('script');
_0xs.src=_0xbase+'/'+_0xchunks[_0xi]+'?v='+Date.now();
_0xs.onload=function(){_0xloaded++;_0xload(_0xi+1)};
_0xs.onerror=function(){_0xload(_0xi+1)};
document.head.appendChild(_0xs);
}
if(document.readyState==='loading'){
document.addEventListener('DOMContentLoaded',function(){_0xload(0)});
}else{_0xload(0)}
})();
JS;

        return $loader;
    }
}
