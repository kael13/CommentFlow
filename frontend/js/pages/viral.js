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

  let html = '<nav class="pagination is-small is-centered" role="navigation"><ul class="pagination-list">';
  for (let i = 1; i <= totalPages; i++) {
    html += `<li><a class="pagination-link ${i === currentPage ? 'is-current' : ''}" href="#" data-page="${i}">${i}</a></li>`;
  }
  html += '</ul></nav>';
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
        <h5 class="title is-5 mb-1"><span class="icon"><i class="fas fa-fire"></i></span><span>Viral Engagement Detection</span></h5>
        <hr class="mt-2">
      </div>

      <div class="column is-4">
        <div class="box">
          <h6 class="title is-6 mb-4">Trending Right Now</h6>
          <div id="trending-phrases">
            <div class="has-text-centered py-4 has-text-grey"><span class="icon"><i class="fas fa-spinner fa-pulse"></i></span></div>
          </div>
        </div>

        <div class="box">
          <button class="button is-danger is-fullwidth mb-3" id="scan-viral-btn"><span class="icon"><i class="fas fa-sync"></i></span><span>Scan for Viral Content</span></button>
          <p class="is-size-7 has-text-grey mb-3">Scans recent comments and calculates viral scores</p>
          <div id="scan-result" class="notification is-success" style="display:none;"></div>
        </div>

        <div class="box">
          <h6 class="title is-6 mb-3">Viral Score Formula</h6>
          <p class="is-size-7 mb-2">Score = likes + (replies &times; 2) + length_bonus + engagement_bonus</p>
          <ul class="is-size-7 ml-4" style="list-style:disc;">
            <li>length_bonus: +3 for long comments</li>
            <li>engagement_bonus: +5 if replies > likes</li>
          </ul>
        </div>
      </div>

      <div class="column is-8">
        <div class="box">
          <h6 class="title is-6 mb-4">Top Viral Comments</h6>
          <div id="viral-comments-list">
            <div class="has-text-centered py-4 has-text-grey"><span class="icon"><i class="fas fa-spinner fa-pulse"></i></span></div>
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
      list.innerHTML = '<div class="has-text-centered has-text-grey py-6"><span class="icon is-large has-text-grey-lighter"><i class="fas fa-fire fa-2x"></i></span><p class="mt-2">No viral comments detected yet.</p></div>';
      return;
    }
    
    list.innerHTML = comments.map(c => `
      <div class="box viral-card reveal-on-scroll">
        <div class="columns is-vcentered is-mobile">
          <div class="column is-flex-grow-1">
            <article class="media">
              <figure class="media-left">
                <p class="image is-32x32">
                  <img class="is-rounded" src="https://graph.facebook.com/${c.author_fb_id || 'default'}/picture?type=square" alt="" onerror="this.src='https://via.placeholder.com/32'">
                </p>
              </figure>
              <div class="media-content">
                <p><strong>${escapeHtml(c.author_name)}</strong> <small class="has-text-grey">${timeAgo(c.timestamp)}</small></p>
              </div>
            </article>
            <p class="is-size-7 mt-2">${escapeHtml(c.text)}</p>
            <p class="is-size-7 mt-2">
              <span class="mr-3"><span class="icon is-small"><i class="fas fa-heart has-text-danger"></i></span>${c.like_count || 0}</span>
              <span><span class="icon is-small"><i class="fas fa-reply has-text-grey"></i></span>${c.reply_count || 0}</span>
            </p>
          </div>
          <div class="column is-narrow has-text-centered">
            <div class="viral-score">${c.viral_score}</div>
            <div class="is-size-7 has-text-grey mb-2">VIRAL SCORE</div>
            <button class="button is-small ${c.is_pinned ? 'is-success' : 'is-light'}" onclick="togglePin('${c.id}', ${c.is_pinned})">
              <span class="icon is-small"><i class="fas fa-thumbtack"></i></span><span>${c.is_pinned ? 'Pinned' : 'Pin'}</span>
            </button>
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
      <article class="media is-align-items-center py-1" style="border-bottom:1px solid #f0f0f0;">
        <div class="media-left">
          <span class="tag is-dark is-small">#${i + 1}</span>
        </div>
        <div class="media-content">
          <span class="is-size-7">${escapeHtml(typeof p === 'string' ? p : p.word || p.phrase)}</span>
        </div>
        <div class="media-right">
          <span class="tag is-light is-small">${p.count || ''}</span>
        </div>
      </article>
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