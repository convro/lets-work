/**
 * ConvroLabs - File CDN Manager
 */

App.registerView('files', {
    async render(container) {
        container.innerHTML = `
            <div class="view-header">
                <h1 class="view-title">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    File CDN
                </h1>
            </div>

            <!-- Upload Zone -->
            <div class="card" style="margin-bottom:1.5rem">
                <div class="dropzone" id="file-dropzone">
                    <div class="dropzone-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--neon-cyan)" stroke-width="1.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    </div>
                    <div class="dropzone-text">Drop files here or click to upload</div>
                    <div class="dropzone-hint">Images, videos, documents, fonts, archives - up to 100MB</div>
                    <input type="file" id="file-input" style="display:none" multiple>
                </div>
                <div id="upload-progress" style="display:none;margin-top:1rem">
                    <div style="display:flex;justify-content:space-between;margin-bottom:0.3rem">
                        <span id="upload-filename" style="font-size:0.85rem;color:var(--text-secondary)"></span>
                        <span id="upload-percent" style="font-size:0.85rem;color:var(--neon-cyan)"></span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" id="upload-fill" style="width:0%"></div>
                    </div>
                </div>
            </div>

            <!-- Last Upload Result -->
            <div class="card" id="upload-result-card" style="display:none;margin-bottom:1.5rem">
                <h3 class="card-title text-glow-green" style="margin-bottom:1rem">File Uploaded!</h3>
                <div class="code-block" id="upload-result-url"></div>
                <div style="margin-top:0.8rem;display:flex;gap:0.5rem">
                    <button class="btn btn-primary btn-sm" id="copy-file-url-btn">Copy CDN URL</button>
                    <button class="btn btn-ghost btn-sm" onclick="document.getElementById('upload-result-card').style.display='none'">Dismiss</button>
                </div>
            </div>

            <!-- Files List -->
            <div class="card">
                <div id="files-table-container">
                    <div class="shimmer" style="height:300px;border-radius:8px"></div>
                </div>
            </div>
        `;

        // Bind dropzone
        const dropzone = document.getElementById('file-dropzone');
        const fileInput = document.getElementById('file-input');

        dropzone.addEventListener('click', () => fileInput.click());

        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        });

        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('dragover');
        });

        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
            if (e.dataTransfer.files.length) {
                this.uploadFile(e.dataTransfer.files[0]);
            }
        });

        fileInput.addEventListener('change', () => {
            if (fileInput.files.length) {
                this.uploadFile(fileInput.files[0]);
            }
        });

        this.loadFiles();
    },

    async uploadFile(file) {
        const progressEl = document.getElementById('upload-progress');
        const filenameEl = document.getElementById('upload-filename');
        const percentEl = document.getElementById('upload-percent');
        const fillEl = document.getElementById('upload-fill');

        progressEl.style.display = 'block';
        filenameEl.textContent = file.name;
        percentEl.textContent = '0%';
        fillEl.style.width = '0%';

        const formData = new FormData();
        formData.append('file', file);

        // Use XMLHttpRequest for progress
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/files', true);

        if (App.csrfToken) {
            xhr.setRequestHeader('X-CSRF-Token', App.csrfToken);
        }

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                const pct = Math.round((e.loaded / e.total) * 100);
                percentEl.textContent = pct + '%';
                fillEl.style.width = pct + '%';
            }
        };

        xhr.onload = () => {
            progressEl.style.display = 'none';
            try {
                const result = JSON.parse(xhr.responseText);
                if (result.success) {
                    Toast.success('File uploaded: ' + file.name);

                    // Show result
                    const resultCard = document.getElementById('upload-result-card');
                    const resultUrl = document.getElementById('upload-result-url');
                    resultCard.style.display = 'block';
                    resultUrl.textContent = result.file.url;

                    document.getElementById('copy-file-url-btn').onclick = () => {
                        copyToClipboard(result.file.url);
                    };

                    this.loadFiles();
                } else {
                    Toast.error(result.error || 'Upload failed');
                }
            } catch {
                Toast.error('Upload failed');
            }
        };

        xhr.onerror = () => {
            progressEl.style.display = 'none';
            Toast.error('Upload failed - network error');
        };

        xhr.send(formData);
    },

    async loadFiles() {
        const data = await App.api('GET', '/api/files');
        const container = document.getElementById('files-table-container');

        if (!data || data.files.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    </div>
                    <div class="empty-state-text">No files uploaded yet</div>
                    <div class="empty-state-hint">Drag and drop files above to get started</div>
                </div>
            `;
            return;
        }

        const mimeIcon = (mime) => {
            if (mime.startsWith('image/')) return '<span style="color:var(--neon-pink)">IMG</span>';
            if (mime.startsWith('video/')) return '<span style="color:var(--neon-purple)">VID</span>';
            if (mime.startsWith('audio/')) return '<span style="color:var(--neon-orange)">AUD</span>';
            if (mime.includes('javascript')) return '<span style="color:var(--neon-yellow)">JS</span>';
            if (mime.includes('css')) return '<span style="color:var(--neon-cyan)">CSS</span>';
            if (mime.includes('json')) return '<span style="color:var(--neon-green)">JSON</span>';
            return '<span style="color:var(--text-muted)">FILE</span>';
        };

        container.innerHTML = `
            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Type</th>
                            <th>Name</th>
                            <th>Size</th>
                            <th>Downloads</th>
                            <th>CDN URL</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.files.map(f => `
                            <tr>
                                <td>${mimeIcon(f.mime_type)}</td>
                                <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(f.original_name)}</td>
                                <td style="white-space:nowrap">${f.size_human}</td>
                                <td><span class="badge badge-pink">${f.downloads}</span></td>
                                <td>
                                    <button class="copy-btn" onclick="copyToClipboard('${escapeHtml(f.url)}', this)">Copy URL</button>
                                </td>
                                <td>
                                    <div style="display:flex;gap:0.3rem">
                                        <a href="${escapeHtml(f.url)}" target="_blank" class="btn btn-ghost btn-sm btn-icon" title="Open">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                                        </a>
                                        <button class="btn btn-danger btn-sm btn-icon" onclick="App.views.files.deleteFile(${f.id})" title="Delete">
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

    async deleteFile(id) {
        if (!confirm('Delete this file? This cannot be undone.')) return;
        const result = await App.api('DELETE', `/api/files/${id}`);
        if (result && result.success) {
            Toast.success('File deleted');
            this.loadFiles();
        } else {
            Toast.error('Failed to delete file');
        }
    }
});
