/**
 * ConvroLabs - Dev Tools & Snippets View
 */

// ====== SNIPPETS VIEW ======
App.registerView('snippets', {
    async render(container) {
        container.innerHTML = `
            <div class="view-header">
                <h1 class="view-title">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                    Snippets / Pastebin
                </h1>
                <button class="btn btn-primary" id="new-snippet-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    New Snippet
                </button>
            </div>

            <!-- Create Snippet Form -->
            <div class="card" id="snippet-form-card" style="display:none;margin-bottom:1.5rem">
                <h3 class="card-title" style="margin-bottom:1rem">Create Snippet</h3>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Title</label>
                        <input type="text" class="input" id="snippet-title" placeholder="My snippet">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Language</label>
                        <select class="input" id="snippet-lang">
                            <option value="text">Plain text</option>
                            <option value="javascript">JavaScript</option>
                            <option value="css">CSS</option>
                            <option value="html">HTML</option>
                            <option value="php">PHP</option>
                            <option value="python">Python</option>
                            <option value="json">JSON</option>
                            <option value="sql">SQL</option>
                            <option value="bash">Bash</option>
                            <option value="markdown">Markdown</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Content *</label>
                    <textarea class="input" id="snippet-content" rows="10" placeholder="Paste your code or text here..."></textarea>
                </div>
                <div style="display:flex;gap:0.5rem">
                    <button class="btn btn-primary" id="create-snippet-btn">Create</button>
                    <button class="btn btn-ghost" id="cancel-snippet-btn">Cancel</button>
                </div>
            </div>

            <!-- Result -->
            <div class="card" id="snippet-result-card" style="display:none;margin-bottom:1.5rem">
                <h3 class="card-title text-glow-green" style="margin-bottom:1rem">Snippet Created!</h3>
                <div class="code-block" id="snippet-result-url"></div>
                <div style="margin-top:0.8rem;display:flex;gap:0.5rem">
                    <button class="btn btn-primary btn-sm" id="copy-snippet-url-btn">Copy URL</button>
                    <button class="btn btn-ghost btn-sm" onclick="document.getElementById('snippet-result-card').style.display='none'">Dismiss</button>
                </div>
            </div>

            <!-- Snippets List -->
            <div class="card">
                <div id="snippets-list-container">
                    <div class="shimmer" style="height:200px;border-radius:8px"></div>
                </div>
            </div>
        `;

        const formCard = document.getElementById('snippet-form-card');
        document.getElementById('new-snippet-btn').addEventListener('click', () => {
            formCard.style.display = formCard.style.display === 'none' ? 'block' : 'none';
        });
        document.getElementById('cancel-snippet-btn').addEventListener('click', () => {
            formCard.style.display = 'none';
        });

        document.getElementById('create-snippet-btn').addEventListener('click', async () => {
            const content = document.getElementById('snippet-content').value;
            if (!content) { Toast.error('Content is required'); return; }

            const btn = document.getElementById('create-snippet-btn');
            btn.classList.add('loading');

            const result = await App.api('POST', '/api/snippets', {
                title: document.getElementById('snippet-title').value,
                language: document.getElementById('snippet-lang').value,
                content,
            });

            btn.classList.remove('loading');

            if (result && result.success) {
                Toast.success('Snippet created!');
                formCard.style.display = 'none';

                const resultCard = document.getElementById('snippet-result-card');
                resultCard.style.display = 'block';
                document.getElementById('snippet-result-url').textContent = result.snippet.url;
                document.getElementById('copy-snippet-url-btn').onclick = () => copyToClipboard(result.snippet.url);

                document.getElementById('snippet-title').value = '';
                document.getElementById('snippet-content').value = '';
                this.loadSnippets();
            } else {
                Toast.error(result?.error || 'Failed to create snippet');
            }
        });

        this.loadSnippets();
    },

    async loadSnippets() {
        const data = await App.api('GET', '/api/snippets');
        const container = document.getElementById('snippets-list-container');

        if (!data || data.snippets.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-text">No snippets yet</div>
                    <div class="empty-state-hint">Share code snippets with secure links</div>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="table-wrapper">
                <table>
                    <thead><tr><th>Title</th><th>Language</th><th>Views</th><th>Created</th><th>Actions</th></tr></thead>
                    <tbody>
                        ${data.snippets.map(s => `
                            <tr>
                                <td><a href="${escapeHtml(s.url)}" target="_blank">${escapeHtml(s.title || s.slug)}</a></td>
                                <td><span class="badge badge-purple">${escapeHtml(s.language)}</span></td>
                                <td>${s.views}</td>
                                <td>${timeAgo(s.created_at)}</td>
                                <td>
                                    <div style="display:flex;gap:0.3rem">
                                        <button class="copy-btn" onclick="copyToClipboard('${escapeHtml(s.url)}', this)">Copy URL</button>
                                        <button class="btn btn-danger btn-sm btn-icon" onclick="App.views.snippets.deleteSnippet(${s.id})" title="Delete">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    async deleteSnippet(id) {
        if (!confirm('Delete this snippet?')) return;
        const result = await App.api('DELETE', `/api/snippets/${id}`);
        if (result && result.success) {
            Toast.success('Snippet deleted');
            this.loadSnippets();
        }
    }
});

// ====== DEV TOOLS VIEW ======
App.registerView('tools', {
    async render(container) {
        container.innerHTML = `
            <div class="view-header">
                <h1 class="view-title">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>
                    Dev Tools
                </h1>
            </div>

            <div class="tool-grid">
                <!-- Base64 -->
                <div class="tool-card">
                    <div class="tool-card-title">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--neon-cyan)" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 9h6v6H9z"/></svg>
                        Base64 Encoder/Decoder
                    </div>
                    <div class="tool-card-desc">Encode or decode Base64 strings</div>
                    <div class="form-group">
                        <textarea class="input" id="base64-input" rows="3" placeholder="Enter text..."></textarea>
                    </div>
                    <div style="display:flex;gap:0.5rem">
                        <button class="btn btn-primary btn-sm" onclick="DevTools.base64('encode')">Encode</button>
                        <button class="btn btn-ghost btn-sm" onclick="DevTools.base64('decode')">Decode</button>
                    </div>
                    <div class="result-box" id="base64-result" style="display:none"></div>
                </div>

                <!-- Hash Generator -->
                <div class="tool-card">
                    <div class="tool-card-title">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--neon-pink)" stroke-width="2"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>
                        Hash Generator
                    </div>
                    <div class="tool-card-desc">Generate MD5, SHA-1, SHA-256, SHA-512 hashes</div>
                    <div class="form-group">
                        <input type="text" class="input" id="hash-input" placeholder="Enter text to hash...">
                    </div>
                    <div class="form-group">
                        <select class="input" id="hash-algo">
                            <option value="md5">MD5</option>
                            <option value="sha1">SHA-1</option>
                            <option value="sha256" selected>SHA-256</option>
                            <option value="sha384">SHA-384</option>
                            <option value="sha512">SHA-512</option>
                        </select>
                    </div>
                    <button class="btn btn-primary btn-sm" onclick="DevTools.hash()">Generate Hash</button>
                    <div class="result-box" id="hash-result" style="display:none"></div>
                </div>

                <!-- URL Encoder -->
                <div class="tool-card">
                    <div class="tool-card-title">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--neon-purple)" stroke-width="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
                        URL Encoder/Decoder
                    </div>
                    <div class="tool-card-desc">Encode or decode URL components</div>
                    <div class="form-group">
                        <textarea class="input" id="url-enc-input" rows="3" placeholder="Enter URL or text..."></textarea>
                    </div>
                    <div style="display:flex;gap:0.5rem">
                        <button class="btn btn-primary btn-sm" onclick="DevTools.urlEncode('encode')">Encode</button>
                        <button class="btn btn-ghost btn-sm" onclick="DevTools.urlEncode('decode')">Decode</button>
                    </div>
                    <div class="result-box" id="url-enc-result" style="display:none"></div>
                </div>

                <!-- JSON Formatter -->
                <div class="tool-card">
                    <div class="tool-card-title">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--neon-green)" stroke-width="2"><path d="M4 7h16M4 12h10M4 17h16"/></svg>
                        JSON Formatter
                    </div>
                    <div class="tool-card-desc">Validate, format, and minify JSON</div>
                    <div class="form-group">
                        <textarea class="input" id="json-input" rows="4" placeholder='{"key": "value"}'></textarea>
                    </div>
                    <div style="display:flex;gap:0.5rem">
                        <button class="btn btn-primary btn-sm" onclick="DevTools.jsonFormat()">Format</button>
                    </div>
                    <div class="result-box" id="json-result" style="display:none"></div>
                </div>

                <!-- Password Generator -->
                <div class="tool-card">
                    <div class="tool-card-title">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--neon-orange)" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                        Password Generator
                    </div>
                    <div class="tool-card-desc">Generate secure random passwords and tokens</div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Length</label>
                            <input type="number" class="input" id="pass-length" value="32" min="8" max="128">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Type</label>
                            <select class="input" id="pass-type">
                                <option value="mixed">Mixed (letters, numbers, symbols)</option>
                                <option value="alpha">Alphabetic only</option>
                                <option value="numeric">Numeric only</option>
                                <option value="hex">Hexadecimal</option>
                            </select>
                        </div>
                    </div>
                    <button class="btn btn-primary btn-sm" onclick="DevTools.password()">Generate</button>
                    <div class="result-box" id="pass-result" style="display:none"></div>
                </div>

                <!-- JWT Decoder -->
                <div class="tool-card">
                    <div class="tool-card-title">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--neon-yellow)" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                        JWT Decoder
                    </div>
                    <div class="tool-card-desc">Decode JWT tokens and inspect header/payload</div>
                    <div class="form-group">
                        <textarea class="input" id="jwt-input" rows="3" placeholder="eyJhbGciOiJIUzI1NiIs..."></textarea>
                    </div>
                    <button class="btn btn-primary btn-sm" onclick="DevTools.jwtDecode()">Decode</button>
                    <div class="result-box" id="jwt-result" style="display:none"></div>
                </div>

                <!-- HTML Entities -->
                <div class="tool-card">
                    <div class="tool-card-title">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--neon-cyan)" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                        HTML Entity Encoder
                    </div>
                    <div class="tool-card-desc">Encode or decode HTML entities for safe embedding</div>
                    <div class="form-group">
                        <textarea class="input" id="html-ent-input" rows="3" placeholder='<script>alert("xss")</script>'></textarea>
                    </div>
                    <div style="display:flex;gap:0.5rem">
                        <button class="btn btn-primary btn-sm" onclick="DevTools.htmlEntities('encode')">Encode</button>
                        <button class="btn btn-ghost btn-sm" onclick="DevTools.htmlEntities('decode')">Decode</button>
                    </div>
                    <div class="result-box" id="html-ent-result" style="display:none"></div>
                </div>

                <!-- Timestamp Converter -->
                <div class="tool-card">
                    <div class="tool-card-title">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--neon-pink)" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        Timestamp Converter
                    </div>
                    <div class="tool-card-desc">Convert between Unix timestamps and human dates</div>
                    <div class="form-group">
                        <input type="text" class="input" id="timestamp-input" placeholder="Unix timestamp or date string">
                    </div>
                    <button class="btn btn-primary btn-sm" onclick="DevTools.timestamp()">Convert</button>
                    <div class="result-box" id="timestamp-result" style="display:none"></div>
                </div>

                <!-- Color Converter -->
                <div class="tool-card">
                    <div class="tool-card-title">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--neon-green)" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
                        Color Converter
                    </div>
                    <div class="tool-card-desc">Convert between HEX, RGB, and HSL color formats</div>
                    <div class="form-group">
                        <input type="text" class="input" id="color-input" placeholder="#ff00e5 or rgb(255,0,229)">
                    </div>
                    <button class="btn btn-primary btn-sm" onclick="DevTools.color()">Convert</button>
                    <div class="result-box" id="color-result" style="display:none"></div>
                </div>
            </div>
        `;
    }
});

// ====== DEV TOOLS LOGIC ======
const DevTools = {
    async base64(action) {
        const input = document.getElementById('base64-input').value;
        if (!input) { Toast.error('Input is required'); return; }
        const result = await App.api('POST', '/api/tools/base64', { action, input });
        this.showResult('base64-result', result);
    },

    async hash() {
        const input = document.getElementById('hash-input').value;
        const algo = document.getElementById('hash-algo').value;
        if (!input) { Toast.error('Input is required'); return; }
        const result = await App.api('POST', '/api/tools/hash', { input, algorithm: algo });
        this.showResult('hash-result', result);
    },

    async urlEncode(action) {
        const input = document.getElementById('url-enc-input').value;
        if (!input) { Toast.error('Input is required'); return; }
        const result = await App.api('POST', '/api/tools/url-encode', { action, input });
        this.showResult('url-enc-result', result);
    },

    async jsonFormat() {
        const input = document.getElementById('json-input').value;
        if (!input) { Toast.error('Input is required'); return; }
        const result = await App.api('POST', '/api/tools/json-format', { input });
        const el = document.getElementById('json-result');
        el.style.display = 'block';
        if (result && result.valid) {
            el.innerHTML = `<span class="text-glow-green">Valid JSON</span><br><br><pre style="margin:0;white-space:pre-wrap">${escapeHtml(result.formatted)}</pre>`;
        } else {
            el.innerHTML = `<span style="color:#ff4466">Invalid: ${escapeHtml(result?.error || 'Unknown error')}</span>`;
        }
        this.addCopyBtn(el, result?.formatted || result?.minified || '');
    },

    async password() {
        const length = parseInt(document.getElementById('pass-length').value);
        const type = document.getElementById('pass-type').value;
        const result = await App.api('POST', '/api/tools/password', { length, type });
        this.showResult('pass-result', result);
    },

    async jwtDecode() {
        const token = document.getElementById('jwt-input').value;
        if (!token) { Toast.error('JWT token is required'); return; }
        const result = await App.api('POST', '/api/tools/jwt-decode', { token });
        const el = document.getElementById('jwt-result');
        el.style.display = 'block';
        if (result && !result.error) {
            el.innerHTML = `
                <div style="margin-bottom:0.5rem"><span class="badge badge-cyan">Header</span></div>
                <pre style="margin:0 0 1rem 0;white-space:pre-wrap">${escapeHtml(JSON.stringify(result.header, null, 2))}</pre>
                <div style="margin-bottom:0.5rem"><span class="badge badge-pink">Payload</span></div>
                <pre style="margin:0;white-space:pre-wrap">${escapeHtml(JSON.stringify(result.payload, null, 2))}</pre>
            `;
        } else {
            el.innerHTML = `<span style="color:#ff4466">${escapeHtml(result?.error || 'Decode failed')}</span>`;
        }
    },

    async htmlEntities(action) {
        const input = document.getElementById('html-ent-input').value;
        if (!input) { Toast.error('Input is required'); return; }
        const result = await App.api('POST', '/api/tools/html-entities', { action, input });
        this.showResult('html-ent-result', result);
    },

    timestamp() {
        const input = document.getElementById('timestamp-input').value.trim();
        const el = document.getElementById('timestamp-result');
        el.style.display = 'block';

        if (!input) {
            // Show current timestamp
            const now = new Date();
            el.innerHTML = `
                <div>Unix: <strong>${Math.floor(now.getTime() / 1000)}</strong></div>
                <div>ISO: <strong>${now.toISOString()}</strong></div>
                <div>Local: <strong>${now.toLocaleString()}</strong></div>
            `;
            return;
        }

        // Try as Unix timestamp
        if (/^\d{10,13}$/.test(input)) {
            const ts = input.length === 13 ? parseInt(input) : parseInt(input) * 1000;
            const date = new Date(ts);
            el.innerHTML = `
                <div>ISO: <strong>${date.toISOString()}</strong></div>
                <div>Local: <strong>${date.toLocaleString()}</strong></div>
                <div>UTC: <strong>${date.toUTCString()}</strong></div>
            `;
        } else {
            // Try as date string
            const date = new Date(input);
            if (isNaN(date.getTime())) {
                el.innerHTML = '<span style="color:#ff4466">Invalid date/timestamp</span>';
            } else {
                el.innerHTML = `
                    <div>Unix (s): <strong>${Math.floor(date.getTime() / 1000)}</strong></div>
                    <div>Unix (ms): <strong>${date.getTime()}</strong></div>
                    <div>ISO: <strong>${date.toISOString()}</strong></div>
                `;
            }
        }
    },

    color() {
        const input = document.getElementById('color-input').value.trim();
        const el = document.getElementById('color-result');
        el.style.display = 'block';

        if (!input) { el.innerHTML = '<span style="color:#ff4466">Enter a color value</span>'; return; }

        let r, g, b;

        // Parse hex
        const hexMatch = input.match(/^#?([0-9a-f]{3,8})$/i);
        if (hexMatch) {
            let hex = hexMatch[1];
            if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
            r = parseInt(hex.substring(0,2), 16);
            g = parseInt(hex.substring(2,4), 16);
            b = parseInt(hex.substring(4,6), 16);
        }

        // Parse rgb
        const rgbMatch = input.match(/rgb\(?\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
        if (rgbMatch) {
            r = parseInt(rgbMatch[1]);
            g = parseInt(rgbMatch[2]);
            b = parseInt(rgbMatch[3]);
        }

        if (r === undefined) {
            el.innerHTML = '<span style="color:#ff4466">Could not parse color</span>';
            return;
        }

        // Convert to HSL
        const rn = r/255, gn = g/255, bn = b/255;
        const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch(max) {
                case rn: h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6; break;
                case gn: h = ((bn - rn) / d + 2) / 6; break;
                case bn: h = ((rn - gn) / d + 4) / 6; break;
            }
        }

        const hex = '#' + [r,g,b].map(x => x.toString(16).padStart(2,'0')).join('');

        el.innerHTML = `
            <div style="display:flex;align-items:center;gap:1rem;margin-bottom:0.5rem">
                <div style="width:40px;height:40px;border-radius:8px;background:${hex};border:1px solid var(--border-subtle)"></div>
                <div>
                    <div>HEX: <strong>${hex}</strong></div>
                    <div>RGB: <strong>rgb(${r}, ${g}, ${b})</strong></div>
                    <div>HSL: <strong>hsl(${Math.round(h*360)}, ${Math.round(s*100)}%, ${Math.round(l*100)}%)</strong></div>
                </div>
            </div>
        `;
    },

    showResult(elementId, result) {
        const el = document.getElementById(elementId);
        el.style.display = 'block';
        if (result && result.result !== undefined) {
            el.textContent = result.result;
            this.addCopyBtn(el, result.result);
        } else if (result && result.error) {
            el.innerHTML = `<span style="color:#ff4466">${escapeHtml(result.error)}</span>`;
        }
    },

    addCopyBtn(el, text) {
        // Remove existing copy btn
        const existing = el.querySelector('.copy-btn');
        if (existing) existing.remove();

        const btn = document.createElement('button');
        btn.className = 'copy-btn';
        btn.textContent = 'Copy';
        btn.style.cssText = 'position:absolute;top:0.5rem;right:0.5rem';
        btn.onclick = () => copyToClipboard(text, btn);
        el.style.position = 'relative';
        el.appendChild(btn);
    }
};
