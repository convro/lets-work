/**
 * ConvroLabs - Short Links Manager
 */

App.registerView('links', {
    async render(container) {
        container.innerHTML = `
            <div class="view-header">
                <h1 class="view-title">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
                    Short Links
                </h1>
                <button class="btn btn-primary" id="new-link-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    New Link
                </button>
            </div>

            <!-- Create Link Form -->
            <div class="card" id="link-form-card" style="display:none;margin-bottom:1.5rem">
                <h3 class="card-title" style="margin-bottom:1rem">Create Short Link</h3>
                <div class="form-group">
                    <label class="form-label">Destination URL *</label>
                    <input type="url" class="input" id="link-url" placeholder="https://example.com/your-long-url">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Title (optional)</label>
                        <input type="text" class="input" id="link-title" placeholder="My awesome link">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Custom slug (optional)</label>
                        <input type="text" class="input" id="link-slug" placeholder="my-link">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Expires at (optional)</label>
                    <input type="datetime-local" class="input" id="link-expires">
                </div>
                <div style="display:flex;gap:0.5rem;margin-top:0.5rem">
                    <button class="btn btn-primary" id="create-link-btn">Create Link</button>
                    <button class="btn btn-ghost" id="cancel-link-btn">Cancel</button>
                </div>
            </div>

            <!-- Result -->
            <div class="card" id="link-result-card" style="display:none;margin-bottom:1.5rem">
                <h3 class="card-title text-glow-green" style="margin-bottom:1rem">Link Created!</h3>
                <div class="code-block" id="link-result-url" style="font-size:1.1rem"></div>
                <div style="margin-top:0.8rem;display:flex;gap:0.5rem">
                    <button class="btn btn-primary btn-sm" id="copy-link-btn">Copy Link</button>
                    <button class="btn btn-ghost btn-sm" onclick="document.getElementById('link-result-card').style.display='none'">Dismiss</button>
                </div>
            </div>

            <!-- Links Table -->
            <div class="card">
                <div id="links-table-container">
                    <div class="shimmer" style="height:300px;border-radius:8px"></div>
                </div>
            </div>
        `;

        // Bind events
        const formCard = document.getElementById('link-form-card');
        document.getElementById('new-link-btn').addEventListener('click', () => {
            formCard.style.display = formCard.style.display === 'none' ? 'block' : 'none';
        });
        document.getElementById('cancel-link-btn').addEventListener('click', () => {
            formCard.style.display = 'none';
        });

        document.getElementById('create-link-btn').addEventListener('click', async () => {
            const url = document.getElementById('link-url').value;
            const title = document.getElementById('link-title').value;
            const slug = document.getElementById('link-slug').value;
            const expires = document.getElementById('link-expires').value;

            if (!url) {
                Toast.error('URL is required');
                return;
            }

            const btn = document.getElementById('create-link-btn');
            btn.classList.add('loading');

            const result = await App.api('POST', '/api/links', {
                url,
                title,
                slug: slug || undefined,
                expires_at: expires || undefined,
            });

            btn.classList.remove('loading');

            if (result && result.success) {
                Toast.success('Link created!');
                formCard.style.display = 'none';

                // Show result
                const resultCard = document.getElementById('link-result-card');
                const resultUrl = document.getElementById('link-result-url');
                resultCard.style.display = 'block';
                resultUrl.textContent = result.link.short_url;

                document.getElementById('copy-link-btn').onclick = () => {
                    copyToClipboard(result.link.short_url);
                };

                // Clear form
                document.getElementById('link-url').value = '';
                document.getElementById('link-title').value = '';
                document.getElementById('link-slug').value = '';
                document.getElementById('link-expires').value = '';

                // Reload table
                this.loadLinks();
            } else {
                Toast.error(result?.error || 'Failed to create link');
            }
        });

        this.loadLinks();
    },

    async loadLinks() {
        const data = await App.api('GET', '/api/links');
        const container = document.getElementById('links-table-container');

        if (!data || data.links.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
                    </div>
                    <div class="empty-state-text">No links yet</div>
                    <div class="empty-state-hint">Create your first short link above</div>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Short URL</th>
                            <th>Destination</th>
                            <th>Title</th>
                            <th>Clicks</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.links.map(link => `
                            <tr>
                                <td>
                                    <a href="${escapeHtml(link.short_url)}" target="_blank" style="font-family:monospace;font-size:0.82rem">/s/${escapeHtml(link.slug)}</a>
                                    <button class="copy-btn" onclick="copyToClipboard('${escapeHtml(link.short_url)}', this)">Copy</button>
                                </td>
                                <td style="max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(link.target_url)}</td>
                                <td>${escapeHtml(link.title || '-')}</td>
                                <td><span class="badge badge-cyan">${link.clicks}</span></td>
                                <td style="white-space:nowrap">${timeAgo(link.created_at)}</td>
                                <td>
                                    <button class="btn btn-danger btn-sm btn-icon" onclick="App.views.links.deleteLink(${link.id})" title="Delete">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ${data.pages > 1 ? `<div style="text-align:center;margin-top:1rem;color:var(--text-muted);font-size:0.8rem">Page ${data.page} of ${data.pages} (${data.total} total)</div>` : ''}
        `;
    },

    async deleteLink(id) {
        if (!confirm('Delete this link?')) return;
        const result = await App.api('DELETE', `/api/links/${id}`);
        if (result && result.success) {
            Toast.success('Link deleted');
            this.loadLinks();
        } else {
            Toast.error('Failed to delete link');
        }
    }
});
