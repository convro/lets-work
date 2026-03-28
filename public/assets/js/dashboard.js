/**
 * ConvroLabs - Dashboard View
 */

App.registerView('dashboard', {
    async render(container) {
        container.innerHTML = `
            <div class="view-header">
                <h1 class="view-title">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                    Dashboard
                </h1>
            </div>
            <div class="stats-grid" id="stats-grid">
                <div class="stat-card shimmer" style="height:90px"></div>
                <div class="stat-card shimmer" style="height:90px"></div>
                <div class="stat-card shimmer" style="height:90px"></div>
                <div class="stat-card shimmer" style="height:90px"></div>
                <div class="stat-card shimmer" style="height:90px"></div>
                <div class="stat-card shimmer" style="height:90px"></div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem" id="dashboard-panels">
                <div class="card" id="recent-links-card">
                    <div class="card-header">
                        <span class="card-title">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--neon-cyan)" stroke-width="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
                            Recent Links
                        </span>
                        <a href="#links" class="btn btn-ghost btn-sm">View All</a>
                    </div>
                    <div id="recent-links-list" class="shimmer" style="height:150px;border-radius:8px"></div>
                </div>
                <div class="card" id="recent-files-card">
                    <div class="card-header">
                        <span class="card-title">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--neon-pink)" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                            Recent Files
                        </span>
                        <a href="#files" class="btn btn-ghost btn-sm">View All</a>
                    </div>
                    <div id="recent-files-list" class="shimmer" style="height:150px;border-radius:8px"></div>
                </div>
            </div>
        `;

        // Load stats
        const data = await App.api('GET', '/api/stats');
        if (!data) return;

        document.getElementById('stats-grid').innerHTML = `
            <div class="stat-card">
                <div class="stat-label">Short Links</div>
                <div class="stat-value">${data.links}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Total Clicks</div>
                <div class="stat-value">${data.total_clicks}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Files Hosted</div>
                <div class="stat-value">${data.files}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Downloads</div>
                <div class="stat-value">${data.total_downloads}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Snippets</div>
                <div class="stat-value">${data.snippets}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Obfuscated</div>
                <div class="stat-value">${data.obfuscated}</div>
            </div>
        `;

        // Recent links
        const linksEl = document.getElementById('recent-links-list');
        if (data.recent_links.length === 0) {
            linksEl.innerHTML = '<div class="empty-state"><div class="empty-state-hint">No links yet</div></div>';
        } else {
            linksEl.innerHTML = data.recent_links.map(l => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:0.6rem 0;border-bottom:1px solid var(--border-subtle)">
                    <div>
                        <div style="font-size:0.85rem;color:var(--text-primary)">${escapeHtml(l.title || l.slug)}</div>
                        <div style="font-size:0.75rem;color:var(--text-muted)">${escapeHtml(l.target_url).substring(0, 50)}...</div>
                    </div>
                    <span class="badge badge-cyan">${l.clicks} clicks</span>
                </div>
            `).join('');
        }
        linksEl.classList.remove('shimmer');

        // Recent files
        const filesEl = document.getElementById('recent-files-list');
        if (data.recent_files.length === 0) {
            filesEl.innerHTML = '<div class="empty-state"><div class="empty-state-hint">No files yet</div></div>';
        } else {
            filesEl.innerHTML = data.recent_files.map(f => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:0.6rem 0;border-bottom:1px solid var(--border-subtle)">
                    <div>
                        <div style="font-size:0.85rem;color:var(--text-primary)">${escapeHtml(f.original_name)}</div>
                        <div style="font-size:0.75rem;color:var(--text-muted)">${f.mime_type}</div>
                    </div>
                    <span class="badge badge-pink">${f.downloads} dl</span>
                </div>
            `).join('');
        }
        filesEl.classList.remove('shimmer');
    }
});
