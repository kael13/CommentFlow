// Utility: escape HTML
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Utility: truncate text
function truncate(str, len) {
  if (!str) return '';
  return str.length > len ? str.substring(0, len) + '...' : str;
}

// Utility: time ago
function timeAgo(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now - date) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// Utility: debounce
function debounce(fn, delay) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// Utility: render pagination
function renderPagination(containerId, totalPages, currentPage, callback) {
  const container = document.getElementById(containerId);
  if (!container || totalPages <= 1) return;
  
  let html = '<ul class="pagination">';
  for (let i = 1; i <= totalPages; i++) {
    html += `<li class="${i === currentPage ? 'current' : ''}"><a href="#" data-page="${i}">${i}</a></li>`;
  }
  html += '</ul>';
  container.innerHTML = html;
  
  container.querySelectorAll('a[data-page]').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      callback(parseInt(a.dataset.page));
    });
  });
}

registerPage('moderation', async function() {
  const container = document.getElementById('page-moderation');
  
  container.innerHTML = `
    <div class="grid-x grid-margin-x">
      <div class="cell small-12">
        <h5><i class="fas fa-shield-alt"></i> Moderation & Spam Control</h5>
        <hr>
      </div>
      
      <!-- Flagged Comments Queue -->
      <div class="cell small-8">
        <div class="callout">
          <h6>Flagged Comments Queue</h6>
          <div class="input-group">
            <select class="input-group-field" id="mod-status-filter">
              <option value="flagged">Flagged</option>
              <option value="pending">Pending</option>
              <option value="all">All</option>
            </select>
            <div class="input-group-button">
              <button class="button secondary" id="mod-refresh-btn"><i class="fas fa-sync"></i> Refresh</button>
            </div>
          </div>
          <div id="flagged-comments-list">
            <div class="text-center loading-spinner"><i class="fas fa-spinner fa-spin"></i></div>
          </div>
        </div>
        
        <div class="callout">
          <h6>Moderation Log</h6>
          <div class="moderation-log" id="moderation-log" style="max-height: 200px; overflow-y: auto;">
            <div class="text-center loading-spinner"><i class="fas fa-spinner fa-spin"></i></div>
          </div>
        </div>
      </div>
      
      <!-- Spam Keywords Panel -->
      <div class="cell small-4">
        <div class="callout">
          <h6>Blocked Keywords</h6>
          <div class="input-group">
            <input class="input-group-field" type="text" id="new-keyword" placeholder="Add keyword...">
            <div class="input-group-button">
              <button class="button primary" id="add-keyword-btn"><i class="fas fa-plus"></i></button>
            </div>
          </div>
          <div id="keyword-list">
            <div class="text-center loading-spinner"><i class="fas fa-spinner fa-spin"></i></div>
          </div>
        </div>
        
        <div class="callout">
          <h6>Troll Detection</h6>
          <div class="switch large">
            <input class="switch-input" id="troll-detection-toggle" type="checkbox" checked>
            <label class="switch-paddle" for="troll-detection-toggle">
              <span class="show-for-sr">Troll Detection</span>
            </label>
          </div>
          <p class="text-small text-gray">Auto-flag repeated offenders</p>
        </div>
      </div>
    </div>
  `;
  
  loadFlaggedComments();
  loadKeywords();
  loadModerationLog();
  
  document.getElementById('mod-status-filter').addEventListener('change', loadFlaggedComments);
  document.getElementById('mod-refresh-btn').addEventListener('click', loadFlaggedComments);
  document.getElementById('add-keyword-btn').addEventListener('click', addKeyword);
  document.getElementById('new-keyword').addEventListener('keypress', e => {
    if (e.key === 'Enter') addKeyword();
  });
});

async function loadFlaggedComments() {
  const status = document.getElementById('mod-status-filter').value;
  
  try {
    const data = await api.get(`/moderation/flagged?status=${status}&limit=20`);
    const comments = data.data || [];
    
    const list = document.getElementById('flagged-comments-list');
    if (comments.length === 0) {
      list.innerHTML = '<p class="text-center text-gray">No flagged comments</p>';
      return;
    }
    
    list.innerHTML = comments.map(c => `
      <div class="card moderation-item ${c.moderation_status}">
        <div class="card-section">
          <div class="grid-x align-middle">
            <div class="cell auto">
              <strong>${escapeHtml(c.author_name)}</strong>
              <span class="text-small text-gray">${timeAgo(c.timestamp)}</span>
              <p class="mod-text">${escapeHtml(truncate(c.text, 150))}</p>
            </div>
            <div class="cell shrink button-group tiny">
              <button class="button success" onclick="approveComment('${c.id}')"><i class="fas fa-check"></i> Approve</button>
              <button class="button alert" onclick="hideModComment('${c.id}')"><i class="fas fa-eye-slash"></i> Hide</button>
              <button class="button warning" onclick="blockUser('${c.id}')"><i class="fas fa-ban"></i> Block</button>
            </div>
          </div>
        </div>
      </div>
    `).join('');
  } catch(e) {
    document.getElementById('flagged-comments-list').innerHTML = '<p class="text-center text-gray">Failed to load</p>';
  }
}

async function loadKeywords() {
  try {
    const data = await api.get('/moderation/spam-keywords');
    const keywords = data.data || [];
    
    const list = document.getElementById('keyword-list');
    list.innerHTML = keywords.map(k => `
      <div class="keyword-chip">
        <span>${escapeHtml(k.keyword)}</span>
        <div class="keyword-actions">
          <label class="switch tiny">
            <input class="switch-input" type="checkbox" ${k.is_active ? 'checked' : ''} onchange="toggleKeyword('${k.id}', this.checked)">
            <label class="switch-paddle"></label>
          </label>
          <button class="button tiny alert" onclick="removeKeyword('${k.id}')"><i class="fas fa-times"></i></button>
        </div>
      </div>
    `).join('');
  } catch(e) {}
}

async function loadModerationLog() {
  try {
    const data = await api.get('/moderation/log');
    const logs = data.data || [];
    
    const logEl = document.getElementById('moderation-log');
    logEl.innerHTML = logs.map(l => `
      <div class="log-entry">
        <span class="text-small text-gray">${timeAgo(l.timestamp)}</span>
        <span>${escapeHtml(l.details?.action || l.action_type)}</span>
        <span class="label ${l.details?.status === 'hidden' ? 'alert' : 'success'}">${l.details?.status || 'done'}</span>
      </div>
    `).join('') || '<p class="text-center text-gray">No moderation actions yet</p>';
  } catch(e) {}
}

async function approveComment(id) {
  try { await api.patch(`/moderation/${id}/approve`, {}); showToast('Comment approved', 'success'); loadFlaggedComments(); } catch(e) {}
}

async function hideModComment(id) {
  try { await api.patch(`/moderation/${id}/hide`, {}); showToast('Comment hidden', 'alert'); loadFlaggedComments(); } catch(e) {}
}

async function blockUser(id) {
  try { await api.patch(`/moderation/${id}/block-user`, {}); showToast('User blocked', 'alert'); loadFlaggedComments(); } catch(e) {}
}

async function addKeyword() {
  const input = document.getElementById('new-keyword');
  const keyword = input.value.trim();
  if (!keyword) return;
  try {
    await api.post('/moderation/spam-keywords', { keyword });
    input.value = '';
    showToast('Keyword added', 'success');
    loadKeywords();
  } catch(e) {}
}

async function toggleKeyword(id, isActive) {
  try { await api.patch(`/moderation/spam-keywords/${id}`, { is_active: isActive }); } catch(e) {}
}

async function removeKeyword(id) {
  try { await api.del(`/moderation/spam-keywords/${id}`); showToast('Keyword removed', 'success'); loadKeywords(); } catch(e) {}
}
