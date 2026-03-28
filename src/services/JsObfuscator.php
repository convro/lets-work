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
        'window','document','console','navigator','location','history','localStorage',
        'sessionStorage','fetch','XMLHttpRequest','Promise','Array','Object','String',
        'Number','Boolean','Math','Date','RegExp','JSON','Map','Set','Symbol',
        'parseInt','parseFloat','setTimeout','setInterval','clearTimeout','clearInterval',
        'encodeURIComponent','decodeURIComponent','encodeURI','decodeURI','atob','btoa',
        'requestAnimationFrame','cancelAnimationFrame','alert','confirm','prompt',
        'Error','TypeError','RangeError','SyntaxError','ReferenceError',
        'Infinity','NaN','isNaN','isFinite','globalThis',
        'require','module','exports','__dirname','__filename',
        'addEventListener','removeEventListener','dispatchEvent',
        'createElement','getElementById','querySelector','querySelectorAll',
        'appendChild','removeChild','innerHTML','textContent','classList',
        'getAttribute','setAttribute','style','prototype','constructor',
        'apply','bind','call','toString','valueOf','hasOwnProperty',
        'length','push','pop','shift','unshift','splice','slice','concat',
        'forEach','map','filter','reduce','find','findIndex','some','every',
        'keys','values','entries','from','of','assign','freeze','defineProperty',
        'performance','now','animate','onfinish','remove','getContext',
        'fillStyle','strokeStyle','lineWidth','beginPath','moveTo','lineTo',
        'arc','fill','stroke','clearRect','fillRect','fillText',
        'offsetWidth','offsetHeight','getBoundingClientRect',
        'clientX','clientY','left','top','right','bottom','width','height',
        'parentElement','scrollTop','scrollHeight','scrollTo',
        'trim','split','join','replace','match','test','search','substring','substr',
        'toLowerCase','toUpperCase','includes','startsWith','endsWith','indexOf',
        'charAt','charCodeAt','padStart','padEnd','repeat','toLocaleString',
        'floor','ceil','round','random','sqrt','pow','abs','min','max','sin','cos','tan',
        'PI','log','exp','sign',
        'parse','stringify',
        'observe','unobserve','disconnect','isIntersecting','target','threshold',
        'rootMargin','intersectionRatio',
        'cssText','className','dataset','id','src','href','type','value',
        'placeholder','autocomplete','checked','disabled','readonly',
        'onclick','onload','onerror','onchange','oninput','onsubmit',
        'onmousemove','onmouseenter','onmouseleave','onmousedown','onmouseup',
        'key','preventDefault','stopPropagation',
        'then','catch','finally','resolve','reject','all','race',
        'requestAnimationFrame','cancelAnimationFrame',
        'innerWidth','innerHeight','outerWidth','outerHeight',
        'scrollX','scrollY','pageXOffset','pageYOffset',
        'readyState','DOMContentLoaded','load','resize','scroll','click',
        'keydown','keyup','keypress','input','change','submit','focus','blur',
        'touchstart','touchend','touchmove',
        'getComputedStyle','setProperty','getPropertyValue',
        'content','transform','opacity','transition','animation',
        'display','visibility','position','overflow','zIndex',
        'color','background','border','margin','padding',
        'font','fontSize','fontWeight','fontFamily',
        'IntersectionObserver','MutationObserver','ResizeObserver',
        'HTMLElement','Node','Element','Event','CustomEvent',
        'FormData','URLSearchParams','URL','Blob','File','FileReader',
        'Image','Audio','Video','Canvas','CanvasRenderingContext2D',
    ];

    public static function obfuscate(string $code, string $originalName = 'script.js'): array {
        $token = generate_token(16);
        $bundleDir = CDN_DIR . 'js/' . $token;
        mkdir($bundleDir, 0755, true);

        // Step 1: Rename user-defined identifiers
        $identMap = [];
        $counter = 0;
        $processed = self::renameIdentifiers($code, $identMap, $counter);

        // Step 2: Minify (remove comments, extra whitespace)
        $processed = self::minify($processed);

        // Step 3: Encode the entire code as split hex chunks
        $encoded = self::hexEncode($processed);
        $hexParts = self::splitHex($encoded, 40);

        // Step 4: Generate decoy/noise chunk files
        $chunkFiles = [];
        $realChunkIndices = [];

        // Write hex data chunks (the real payload, split across files)
        foreach ($hexParts as $i => $hexPart) {
            $chunkName = '_c' . bin2hex(random_bytes(4)) . '.js';
            // Each real chunk registers its data fragment
            $chunkContent = "window._0xd=window._0xd||[];window._0xd[{$i}]='{$hexPart}';";
            file_put_contents($bundleDir . '/' . $chunkName, $chunkContent);
            $chunkFiles[] = $chunkName;
            $realChunkIndices[] = count($chunkFiles) - 1;
        }

        // Generate decoy chunks (harmless noise that does nothing)
        $totalDecoys = random_int(15, 25);
        for ($i = 0; $i < $totalDecoys; $i++) {
            $chunkName = '_c' . bin2hex(random_bytes(4)) . '.js';
            $decoyCode = self::generateDecoyChunk();
            file_put_contents($bundleDir . '/' . $chunkName, $decoyCode);
            $chunkFiles[] = $chunkName;
        }

        // Shuffle all chunks together
        $shuffledChunks = $chunkFiles;
        shuffle($shuffledChunks);

        // Step 5: Create loader that loads all chunks then assembles and executes
        $loader = self::createLoader($shuffledChunks, $token, count($hexParts));
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
            'chunks' => count($shuffledChunks),
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

        // Sort by length descending to avoid partial replacements
        uksort($map, function($a, $b) { return strlen($b) - strlen($a); });

        // Replace usage of renamed identifiers
        foreach ($map as $original => $obfuscated) {
            $code = preg_replace('/\b' . preg_quote($original, '/') . '\b/', $obfuscated, $code);
        }

        return $code;
    }

    private static function minify(string $code): string {
        // Remove single-line comments (but not URLs with //)
        $code = preg_replace('#(?<!:)//[^\n]*#', '', $code);
        // Remove multi-line comments
        $code = preg_replace('#/\*[\s\S]*?\*/#', '', $code);
        // Collapse multiple whitespace/newlines
        $code = preg_replace('/\s+/', ' ', $code);
        return trim($code);
    }

    private static function hexEncode(string $code): string {
        return bin2hex($code);
    }

    private static function splitHex(string $hex, int $numParts): array {
        $partLen = (int)ceil(strlen($hex) / $numParts);
        $parts = [];
        for ($i = 0; $i < strlen($hex); $i += $partLen) {
            $parts[] = substr($hex, $i, $partLen);
        }
        return $parts;
    }

    private static function generateDecoyChunk(): string {
        $decoys = [
            'void function(){var _0x%s=0x%x;if(_0x%s)void 0}();',
            '(function(){var _0x%s=[0x%x,0x%x];_0x%s.sort();void _0x%s})();',
            'void(typeof _0x%s!=="undefined"||void 0x%x);',
            '(function(){for(var _0x%s=0;_0x%s<0;_0x%s++){}})();',
            'var _0x%s=(function(){return 0x%x^0x%x})();',
        ];

        $template = $decoys[array_rand($decoys)];
        $args = [];
        $placeholders = substr_count($template, '%s') + substr_count($template, '%x');
        for ($i = 0; $i < $placeholders; $i++) {
            $args[] = bin2hex(random_bytes(3));
        }

        // Simple sprintf with mixed types
        $result = $template;
        foreach ($args as $arg) {
            $pos = strpos($result, '%s');
            $posX = strpos($result, '%x');
            if ($pos !== false && ($posX === false || $pos < $posX)) {
                $result = substr_replace($result, $arg, $pos, 2);
            } elseif ($posX !== false) {
                $result = substr_replace($result, dechex(random_int(100, 9999)), $posX, 2);
            }
        }

        return $result;
    }

    private static function createLoader(array $chunkFiles, string $token, int $realChunkCount): string {
        $cdnBase = BASE_URL . '/cdn/ob/' . $token;
        $chunksJson = json_encode($chunkFiles);

        // The loader: loads all chunks, then assembles hex data and executes
        $loader = <<<JS
(function(){
'use strict';
var _0xb='{$cdnBase}';
var _0xc={$chunksJson};
var _0xt={$realChunkCount};
var _0xl=0;
function _0xr(_0xi){
if(_0xi>=_0xc.length){
if(window._0xd&&window._0xd.length>=_0xt){
var _0xh='';
for(var _0xj=0;_0xj<_0xt;_0xj++){_0xh+=window._0xd[_0xj]||'';}
var _0xcode='';
for(var _0xk=0;_0xk<_0xh.length;_0xk+=2){_0xcode+=String.fromCharCode(parseInt(_0xh.substr(_0xk,2),16));}
try{var _0xf=new Function(_0xcode);_0xf();}catch(e){}
delete window._0xd;
}
return;
}
var _0xs=document.createElement('script');
_0xs.src=_0xb+'/'+_0xc[_0xi]+'?v='+Date.now();
_0xs.onload=function(){_0xr(_0xi+1)};
_0xs.onerror=function(){_0xr(_0xi+1)};
document.head.appendChild(_0xs);
}
if(document.readyState==='loading'){
document.addEventListener('DOMContentLoaded',function(){_0xr(0)});
}else{_0xr(0)}
})();
JS;

        return $loader;
    }
}
