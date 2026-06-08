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
    <div class="columns">
      <div class="column is-12">
        <h5><i class="fas fa-fire"></i> Viral Engagement Detection</h5>
        <hr>
      </div>
      
      <div class="column is-4">
        <div class="box">
          <h6>Trending Right Now</h6>
          <div id="trending-phrases">
            <div class="has-text-centered loading-spinner"><i class="fas fa-spinner fa-spin"></i></div>
          </div>
        </div>
        
        <div class="box">
          <button class="button is-danger is-fullwidth" id="scan-viral-btn"><i class="fas fa-sync"></i> Scan for Viral Content</button>
          <p class="is-size-7 has-text-grey">Scans recent comments and calculates viral scores</p>
          <div id="scan-result" style="display:none;" class="notification is-success"></div>
        </div>
        
        <div class="box">
          <h6>Viral Score Formula</h6>
          <p class="is-size-7">Score = likes + (replies &times; 2) + length_bonus + engagement_bonus</p>
          <ul class="is-size-7">
            <li>length_bonus: +3 for long comments</li>
            <li>engagement_bonus: +5 if replies > likes</li>
          </ul>
        </div>
      </div>
      
      <div class="column is-8">
        <div class="box">
          <h6>Top Viral Comments</h6>
          <div id="viral-comments-list">
            <div class="has-text-centered loading-spinner"><i class="fas fa-spinner fa-spin"></i></div>
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
      list.innerHTML = '<p class="has-text-centered has-text-grey"><i class="fas fa-fire fa-2x" style="opacity:0.3;"></i><br>No viral comments detected yet.</p>';
      return;
    }
    
    list.innerHTML = comments.map(c => `
      <div class="card viral-card reveal-on-scroll">
        <div class="card-content">
          <div class="columns is-vcentered">
            <div class="column is-flex-grow-1">
              <div class="media">
                <div class="media-left">
                  <img src="https://graph.facebook.com/${c.author_fb_id || 'default'}/picture?type=square" alt="" class="avatar" style="width:32px;height:32px;" onerror="this.src='https://via.placeholder.com/32'">
                </div>
                <div class="media-content">
                  <strong>${escapeHtml(c.author_name)}</strong>
                  <span class="is-size-7 has-text-grey">${timeAgo(c.timestamp)}</span>
                </div>
              </div>
              <p class="viral-text">${escapeHtml(c.text)}</p>
              <div class="viral-meta">
                <span><i class="fas fa-heart" style="color:#cc4b37;"></i> ${c.like_count || 0}</span>
                <span><i class="fas fa-reply"></i> ${c.reply_count || 0}</span>
              </div>
            </div>
            <div class="column is-narrow has-text-centered">
              <div class="viral-score">${c.viral_score}</div>
              <div class="is-size-7 has-text-grey">VIRAL SCORE</div>
              <button class="button is-small ${c.is_pinned ? 'is-success' : 'is-light'}" onclick="togglePin('${c.id}', ${c.is_pinned})">
                <i class="fas fa-thumbtack"></i> ${c.is_pinned ? 'Pinned' : 'Pin'}
              </button>
            </div>
          </div>
        </div>
      </div>
    `).join('');
  } catch(e) {
    document.getElementById('viral-comments-list').innerHTML = '<p class="has-text-centered has-text-grey">Failed to load</p>';
  }
}

async function loadTrending() {
  try {
    const data = await api.get('/analytics/viral/trending');
    const phrases = data.phrases || data.data || [];
    
    const container = document.getElementById('trending-phrases');
    if (phrases.length === 0) {
      container.innerHTML = '<p class="has-text-centered has-text-grey">No trending phrases yet</p>';
      return;
    }
    
    container.innerHTML = phrases.slice(0, 15).map((p, i) => `
      <div class="trending-item">
        <span class="trending-rank">#${i + 1}</span>
        <span class="trending-word">${escapeHtml(typeof p === 'string' ? p : p.word || p.phrase)}</span>
        <span class="tag is-light">${p.count || ''}</span>
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