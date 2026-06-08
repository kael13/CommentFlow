function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function truncate(str, len) {
  if (!str) return '';
  return str.length > len ? str.substring(0, len) + '...' : str;
}

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

function debounce(fn, delay) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

function renderPagination(containerId, totalPages, currentPage, callback) {
  const container = document.getElementById(containerId);
  if (!container || totalPages <= 1) return;

  let html = '<nav class="pagination is-small is-centered" role="navigation"><ul class="pagination-list">';
  for (let i = 1; i <= totalPages; i++) {
    html += `<li><a class="pagination-link ${i === currentPage ? 'is-current' : ''}" href="#" data-page="${i}">${i}</a></li>`;
  }
  html += '</ul></nav>';
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
    <div class="columns">
      <div class="column is-12">
        <h5 class="title is-5 mb-1"><span class="icon"><i class="fas fa-shield-alt"></i></span><span>Moderation & Spam Control</span></h5>
        <hr class="mt-2">
      </div>

      <div class="column is-8">
        <div class="box">
          <h6 class="title is-6 mb-4">Flagged Comments Queue</h6>
          <div class="field has-addons mb-4">
            <div class="control">
              <div class="select is-small">
                <select id="mod-status-filter">
                  <option value="flagged">Flagged</option>
                  <option value="pending">Pending</option>
                  <option value="all">All</option>
                </select>
              </div>
            </div>
            <div class="control">
              <button class="button is-light is-small" id="mod-refresh-btn"><span class="icon"><i class="fas fa-sync"></i></span><span>Refresh</span></button>
            </div>
          </div>
          <div id="flagged-comments-list">
            <div class="has-text-centered py-4 has-text-grey"><span class="icon"><i class="fas fa-spinner fa-pulse"></i></span></div>
          </div>
        </div>

        <div class="box">
          <h6 class="title is-6 mb-4">Moderation Log</h6>
          <div id="moderation-log" style="max-height:200px;overflow-y:auto;">
            <div class="has-text-centered py-4 has-text-grey"><span class="icon"><i class="fas fa-spinner fa-pulse"></i></span></div>
          </div>
        </div>
      </div>

      <div class="column is-4">
        <div class="box">
          <h6 class="title is-6 mb-4">Blocked Keywords</h6>
          <div class="field has-addons mb-4">
            <div class="control is-expanded">
              <input class="input is-small" type="text" id="new-keyword" placeholder="Add keyword...">
            </div>
            <div class="control">
              <button class="button is-primary is-small" id="add-keyword-btn"><span class="icon"><i class="fas fa-plus"></i></span></button>
            </div>
          </div>
          <div id="keyword-list">
            <div class="has-text-centered py-4 has-text-grey"><span class="icon"><i class="fas fa-spinner fa-pulse"></i></span></div>
          </div>
        </div>

        <div class="box">
          <h6 class="title is-6 mb-4">Troll Detection</h6>
          <label class="is-flex is-align-items-center is-justify-content-space-between">
            <span class="is-size-7 has-text-grey">Auto-flag repeated offenders</span>
            <span class="toggle-switch ml-2">
              <input type="checkbox" id="troll-detection-toggle" checked>
              <span class="toggle-slider"></span>
            </span>
          </label>
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
      list.innerHTML = '<p class="has-text-centered has-text-grey">No flagged comments</p>';
      return;
    }
    
    list.innerHTML = comments.map(c => `
      <div class="box mb-2">
        <article class="media">
          <div class="media-content">
            <p class="mb-1"><strong>${escapeHtml(c.author_name)}</strong> <small class="has-text-grey">${timeAgo(c.timestamp)}</small></p>
            <p class="is-size-7 mb-2">${escapeHtml(truncate(c.text, 150))}</p>
            <div class="buttons are-small">
              <button class="button is-small is-success" onclick="approveComment('${c.id}')"><span class="icon"><i class="fas fa-check"></i></span><span>Approve</span></button>
              <button class="button is-small is-danger" onclick="hideModComment('${c.id}')"><span class="icon"><i class="fas fa-eye-slash"></i></span><span>Hide</span></button>
              <button class="button is-small is-warning" onclick="blockUser('${c.id}')"><span class="icon"><i class="fas fa-ban"></i></span><span>Block</span></button>
            </div>
          </div>
        </article>
      </div>
    `).join('');
  } catch(e) {
    document.getElementById('flagged-comments-list').innerHTML = '<p class="has-text-centered has-text-grey">Failed to load</p>';
  }
}

async function loadKeywords() {
  try {
    const data = await api.get('/moderation/spam-keywords');
    const keywords = data.data || [];
    
    const list = document.getElementById('keyword-list');
    list.innerHTML = keywords.map(k => `
      <div class="is-flex is-align-items-center is-justify-content-space-between py-2" style="border-bottom:1px solid #f0f0f0;">
        <span class="tag is-medium">${escapeHtml(k.keyword)}</span>
        <div class="is-flex is-align-items-center" style="gap:0.5rem;">
          <span class="toggle-switch is-small">
            <input type="checkbox" ${k.is_active ? 'checked' : ''} onchange="toggleKeyword('${k.id}', this.checked)">
            <span class="toggle-slider"></span>
          </span>
          <button class="delete is-small" onclick="removeKeyword('${k.id}')"></button>
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
      <article class="media is-align-items-center py-2" style="border-bottom:1px solid #f0f0f0;">
        <div class="media-content">
          <p class="is-size-7 mb-1"><small class="has-text-grey">${timeAgo(l.timestamp)}</small> &mdash; ${escapeHtml(l.details?.action || l.action_type)}</p>
        </div>
        <div class="media-right">
          <span class="tag ${l.details?.status === 'hidden' ? 'is-danger' : 'is-success'} is-small">${l.details?.status || 'done'}</span>
        </div>
      </article>
    `).join('') || '<p class="has-text-centered has-text-grey py-3">No moderation actions yet</p>';
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
