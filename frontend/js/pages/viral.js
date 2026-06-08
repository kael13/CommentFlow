function escapeHtml(str) { if (!str) return ''; const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }
function truncate(str, len) { if (!str) return ''; return str.length > len ? str.substring(0, len) + '...' : str; }
function timeAgo(dateStr) {
  if (!dateStr) return '';
  const now = new Date(), date = new Date(dateStr), seconds = Math.floor((now - date) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
function debounce(fn, delay) { let t; return function(...a) { clearTimeout(t); t = setTimeout(() => fn.apply(this, a), delay); }; }
function renderPagination(containerId, totalPages, currentPage, callback) {
  const container = document.getElementById(containerId);
  if (!container || totalPages <= 1) return;
  let html = '<ul class="pagination">';
  for (let i = 1; i <= totalPages; i++) html += `<li class="${i === currentPage ? 'current' : ''}"><a href="#" data-page="${i}">${i}</a></li>`;
  html += '</ul>';
  container.innerHTML = html;
  container.querySelectorAll('a[data-page]').forEach(a => {
    a.addEventListener('click', e => { e.preventDefault(); callback(parseInt(a.dataset.page)); });
  });
}

registerPage('viral', async function() {
  const container = document.getElementById('page-viral');
  
  container.innerHTML = `
    <div class="grid-x grid-margin-x">
      <div class="cell small-12">
        <h5><i class="fas fa-fire"></i> Viral Engagement Detection</h5>
        <hr>
      </div>
      
      <div class="cell small-4">
        <div class="callout">
          <h6>Trending Right Now</h6>
          <div id="trending-phrases">
            <div class="text-center loading-spinner"><i class="fas fa-spinner fa-spin"></i></div>
          </div>
        </div>
        
        <div class="callout">
          <button class="button alert expanded" id="scan-viral-btn"><i class="fas fa-sync"></i> Scan for Viral Content</button>
          <p class="text-small text-gray">Scans recent comments and calculates viral scores</p>
          <div id="scan-result" style="display:none;" class="callout success"></div>
        </div>
        
        <div class="callout secondary">
          <h6>Viral Score Formula</h6>
          <p class="text-small">Score = likes + (replies &times; 2) + length_bonus + engagement_bonus</p>
          <ul class="text-small">
            <li>length_bonus: +3 for long comments</li>
            <li>engagement_bonus: +5 if replies > likes</li>
          </ul>
        </div>
      </div>
      
      <div class="cell small-8">
        <div class="callout">
          <h6>Top Viral Comments</h6>
          <div id="viral-comments-list">
            <div class="text-center loading-spinner"><i class="fas fa-spinner fa-spin"></i></div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  loadViralComments();
  loadTrending();
  
  document.getElementById('scan-viral-btn').addEventListener('click', async () => {
    try {
      const result = await api.post('/analytics/viral/refresh', {});
      document.getElementById('scan-result').innerHTML = `<i class="fas fa-check-circle"></i> Scanned! Updated ${result.updated || 0} comments.`;
      document.getElementById('scan-result').style.display = 'block';
      setTimeout(() => { document.getElementById('scan-result').style.display = 'none'; }, 5000);
      loadViralComments();
    } catch(e) {
      showToast('Scan failed', 'alert');
    }
  });
});

async function loadViralComments() {
  try {
    const data = await api.get('/analytics/viral?limit=20&minScore=1');
    const comments = data.data || [];
    
    const list = document.getElementById('viral-comments-list');
    if (comments.length === 0) {
      list.innerHTML = '<p class="text-center text-gray"><i class="fas fa-fire fa-2x" style="opacity:0.3;"></i><br>No viral comments detected yet.</p>';
      return;
    }
    
    list.innerHTML = comments.map(c => `
      <div class="card viral-card">
        <div class="card-section">
          <div class="grid-x align-middle">
            <div class="cell auto">
              <div class="media-object">
                <div class="media-object-section">
                  <img src="https://graph.facebook.com/${c.author_fb_id || 'default'}/picture?type=square" alt="" class="avatar" style="width:32px;height:32px;" onerror="this.src='https://via.placeholder.com/32'">
                </div>
                <div class="media-object-section main-section">
                  <strong>${escapeHtml(c.author_name)}</strong>
                  <span class="text-small text-gray">${timeAgo(c.timestamp)}</span>
                </div>
              </div>
              <p class="viral-text">${escapeHtml(c.text)}</p>
              <div class="viral-meta">
                <span><i class="fas fa-heart" style="color:#cc4b37;"></i> ${c.like_count || 0}</span>
                <span><i class="fas fa-reply"></i> ${c.reply_count || 0}</span>
              </div>
            </div>
            <div class="cell shrink text-center">
              <div class="viral-score">${c.viral_score}</div>
              <div class="text-small text-gray">VIRAL SCORE</div>
              <button class="button tiny ${c.is_pinned ? 'success' : 'secondary'}" onclick="togglePin('${c.id}', ${c.is_pinned})">
                <i class="fas fa-thumbtack"></i> ${c.is_pinned ? 'Pinned' : 'Pin'}
              </button>
            </div>
          </div>
        </div>
      </div>
    `).join('');
  } catch(e) {
    document.getElementById('viral-comments-list').innerHTML = '<p class="text-center text-gray">Failed to load</p>';
  }
}

async function loadTrending() {
  try {
    const data = await api.get('/analytics/viral/trending');
    const phrases = data.phrases || data.data || [];
    
    const container = document.getElementById('trending-phrases');
    if (phrases.length === 0) {
      container.innerHTML = '<p class="text-center text-gray">No trending phrases yet</p>';
      return;
    }
    
    container.innerHTML = phrases.slice(0, 15).map((p, i) => `
      <div class="trending-item">
        <span class="trending-rank">#${i + 1}</span>
        <span class="trending-word">${escapeHtml(typeof p === 'string' ? p : p.word || p.phrase)}</span>
        <span class="label secondary">${p.count || ''}</span>
      </div>
    `).join('');
  } catch(e) {}
}

async function togglePin(commentId, isPinned) {
  if (isPinned) return;
  try {
    await api.post(`/analytics/viral/pin/${commentId}`, {});
    showToast('Comment pinned!', 'success');
    loadViralComments();
  } catch(e) {
    showToast('Failed to pin', 'alert');
  }
}
