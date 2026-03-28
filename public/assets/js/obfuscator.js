/**
 * ConvroLabs - JS & CSS Obfuscator
 */

App.registerView('obfuscator', {
    currentTab: 'js',

    async render(container) {
        container.innerHTML = `
            <div class="view-header">
                <h1 class="view-title">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 18l6-6-6-6"/><path d="M8 6l-6 6 6 6"/><line x1="14" y1="4" x2="10" y2="20"/></svg>
                    Code Obfuscator
                </h1>
            </div>

            <div class="tabs">
                <button class="tab active" data-tab="js">JavaScript</button>
                <button class="tab" data-tab="css">CSS</button>
            </div>

            <!-- JS Obfuscator -->
            <div class="card" id="tab-js">
                <h3 class="card-title" style="margin-bottom:0.5rem">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--neon-yellow)" stroke-width="2"><path d="M16 18l6-6-6-6"/><path d="M8 6l-6 6 6 6"/></svg>
                    JavaScript Obfuscator
                </h3>
                <p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:1rem">
                    Paste your JS code or upload a file. It will be split into 40+ obfuscated chunks with renamed variables, encoded strings, and injected dead code.
                </p>

                <div class="form-group">
                    <label class="form-label">Upload JS file</label>
                    <div class="dropzone" id="js-dropzone" style="padding:1.5rem">
                        <div class="dropzone-text" style="font-size:0.85rem">Drop .js file here or click</div>
                        <input type="file" id="js-file-input" accept=".js" style="display:none">
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">Or paste code directly</label>
                    <textarea class="input" id="js-code-input" rows="10" placeholder="// Paste your JavaScript code here..."></textarea>
                </div>

                <button class="btn btn-primary" id="obfuscate-js-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    Obfuscate JavaScript
                </button>

                <div id="js-result" style="display:none;margin-top:1.5rem">
                    <hr class="neon-divider">
                    <h4 class="text-glow-green" style="margin-bottom:1rem">Obfuscation Complete</h4>
                    <div id="js-result-stats" style="margin-bottom:1rem"></div>
                    <div class="form-group">
                        <label class="form-label">HTML Snippet - Add this to your page</label>
                        <div class="code-block" id="js-html-snippet"></div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Loader URL</label>
                        <div class="code-block" id="js-loader-url"></div>
                    </div>
                    <button class="btn btn-primary btn-sm" id="copy-js-snippet-btn">Copy HTML Snippet</button>
                </div>
            </div>

            <!-- CSS Obfuscator -->
            <div class="card" id="tab-css" style="display:none">
                <h3 class="card-title" style="margin-bottom:0.5rem">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--neon-cyan)" stroke-width="2"><path d="M4 7h16M4 12h16M4 17h10"/></svg>
                    CSS Obfuscator
                </h3>
                <p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:1rem">
                    Rename classes/IDs, obfuscate color values, inject decoy rules, split into multiple files. Returns a class mapping JSON.
                </p>

                <div class="form-group">
                    <label class="form-label">Upload CSS file</label>
                    <div class="dropzone" id="css-dropzone" style="padding:1.5rem">
                        <div class="dropzone-text" style="font-size:0.85rem">Drop .css file here or click</div>
                        <input type="file" id="css-file-input" accept=".css" style="display:none">
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">Or paste code directly</label>
                    <textarea class="input" id="css-code-input" rows="10" placeholder="/* Paste your CSS code here... */"></textarea>
                </div>

                <button class="btn btn-secondary" id="obfuscate-css-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    Obfuscate CSS
                </button>

                <div id="css-result" style="display:none;margin-top:1.5rem">
                    <hr class="neon-divider">
                    <h4 class="text-glow-green" style="margin-bottom:1rem">Obfuscation Complete</h4>
                    <div id="css-result-stats" style="margin-bottom:1rem"></div>
                    <div class="form-group">
                        <label class="form-label">HTML Snippet</label>
                        <div class="code-block" id="css-html-snippet"></div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Loader URL</label>
                        <div class="code-block" id="css-loader-url"></div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Class Name Mapping (update your HTML with these)</label>
                        <div class="code-block" id="css-class-map" style="max-height:200px;overflow-y:auto"></div>
                    </div>
                    <button class="btn btn-secondary btn-sm" id="copy-css-snippet-btn">Copy HTML Snippet</button>
                </div>
            </div>
        `;

        // Tab switching
        container.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                container.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const tabName = tab.dataset.tab;
                document.getElementById('tab-js').style.display = tabName === 'js' ? 'block' : 'none';
                document.getElementById('tab-css').style.display = tabName === 'css' ? 'block' : 'none';
            });
        });

        // JS dropzone
        this.bindDropzone('js-dropzone', 'js-file-input', 'js-code-input');
        this.bindDropzone('css-dropzone', 'css-file-input', 'css-code-input');

        // JS obfuscate
        document.getElementById('obfuscate-js-btn').addEventListener('click', () => this.obfuscateJs());
        document.getElementById('obfuscate-css-btn').addEventListener('click', () => this.obfuscateCss());
    },

    bindDropzone(dropzoneId, inputId, textareaId) {
        const dz = document.getElementById(dropzoneId);
        const input = document.getElementById(inputId);
        const textarea = document.getElementById(textareaId);

        dz.addEventListener('click', () => input.click());
        dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('dragover'); });
        dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));

        dz.addEventListener('drop', (e) => {
            e.preventDefault();
            dz.classList.remove('dragover');
            if (e.dataTransfer.files.length) {
                this.readFileToTextarea(e.dataTransfer.files[0], textarea, dz);
            }
        });

        input.addEventListener('change', () => {
            if (input.files.length) {
                this.readFileToTextarea(input.files[0], textarea, dz);
            }
        });
    },

    readFileToTextarea(file, textarea, dz) {
        const reader = new FileReader();
        reader.onload = (e) => {
            textarea.value = e.target.result;
            dz.querySelector('.dropzone-text').textContent = file.name + ' loaded';
            Toast.info('File loaded: ' + file.name);
        };
        reader.readAsText(file);
    },

    async obfuscateJs() {
        const code = document.getElementById('js-code-input').value;
        const fileInput = document.getElementById('js-file-input');
        const btn = document.getElementById('obfuscate-js-btn');

        let result;
        btn.classList.add('loading');

        if (fileInput.files.length && !code) {
            // Upload file directly
            const formData = new FormData();
            formData.append('file', fileInput.files[0]);
            result = await App.api('POST', '/api/obfuscate/js', formData, true);
        } else if (code) {
            result = await App.api('POST', '/api/obfuscate/js', { code });
        } else {
            Toast.error('Please provide JS code or upload a file');
            btn.classList.remove('loading');
            return;
        }

        btn.classList.remove('loading');

        if (result && result.success) {
            const r = result.result;
            document.getElementById('js-result').style.display = 'block';
            document.getElementById('js-result-stats').innerHTML = `
                <div class="pill-list">
                    <span class="pill">Chunks: ${r.chunks}</span>
                    <span class="pill">Token: ${r.token.substring(0, 12)}...</span>
                </div>
            `;
            document.getElementById('js-html-snippet').textContent = r.html_snippet;
            document.getElementById('js-loader-url').textContent = r.loader_url;

            document.getElementById('copy-js-snippet-btn').onclick = () => {
                copyToClipboard(r.html_snippet);
            };

            Toast.success('JS obfuscated into ' + r.chunks + ' chunks!');
        } else {
            Toast.error(result?.error || 'Obfuscation failed');
        }
    },

    async obfuscateCss() {
        const code = document.getElementById('css-code-input').value;
        const fileInput = document.getElementById('css-file-input');
        const btn = document.getElementById('obfuscate-css-btn');

        let result;
        btn.classList.add('loading');

        if (fileInput.files.length && !code) {
            const formData = new FormData();
            formData.append('file', fileInput.files[0]);
            result = await App.api('POST', '/api/obfuscate/css', formData, true);
        } else if (code) {
            result = await App.api('POST', '/api/obfuscate/css', { code });
        } else {
            Toast.error('Please provide CSS code or upload a file');
            btn.classList.remove('loading');
            return;
        }

        btn.classList.remove('loading');

        if (result && result.success) {
            const r = result.result;
            document.getElementById('css-result').style.display = 'block';
            document.getElementById('css-result-stats').innerHTML = `
                <div class="pill-list">
                    <span class="pill">Chunks: ${r.chunks}</span>
                    <span class="pill">Classes renamed: ${Object.keys(r.class_map || {}).length}</span>
                    <span class="pill">IDs renamed: ${Object.keys(r.id_map || {}).length}</span>
                </div>
            `;
            document.getElementById('css-html-snippet').textContent = r.html_snippet;
            document.getElementById('css-loader-url').textContent = r.loader_url;
            document.getElementById('css-class-map').textContent = JSON.stringify(
                { ...r.class_map, ...r.id_map }, null, 2
            );

            document.getElementById('copy-css-snippet-btn').onclick = () => {
                copyToClipboard(r.html_snippet);
            };

            Toast.success('CSS obfuscated into ' + r.chunks + ' chunks!');
        } else {
            Toast.error(result?.error || 'Obfuscation failed');
        }
    }
});
