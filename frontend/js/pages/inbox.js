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

// Smart Comment Inbox — chat-style interface
registerPage('inbox', async function() {
  const container = document.getElementById('page-inbox');
  
  container.innerHTML = `
    <div class="columns inbox-layout">
      <div class="column is-5 inbox-threads">
        <div class="inbox-header">
          <h5><i class="fas fa-inbox"></i> Comment Inbox</h5>
          <div class="field has-addons">
            <div class="control is-expanded">
              <input class="input" type="search" id="inbox-search" placeholder="Search comments...">
            </div>
            <div class="control">
              <button class="button is-light" id="inbox-filter-btn"><i class="fas fa-filter"></i></button>
            </div>
          </div>
          <div class="inbox-tabs buttons has-addons">
            <button class="button is-active is-small is-fullwidth" data-filter="all">All</button>
            <button class="button is-small is-fullwidth" data-filter="lead">Leads</button>
            <button class="button is-small is-fullwidth" data-filter="question">Questions</button>
            <button class="button is-small is-fullwidth" data-filter="spam">Spam</button>
          </div>
        </div>
        <div class="inbox-thread-list" id="inbox-thread-list">
          <div class="has-text-centered loading-spinner"><i class="fas fa-spinner fa-spin fa-2x"></i></div>
        </div>
      </div>
      <div class="column is-7 inbox-detail">
        <div class="inbox-detail-empty has-text-centered" style="padding: 40px;">
          <i class="fas fa-comment-dots fa-4x" style="color: #ccc;"></i>
          <p class="subtitle" style="color: #999;">Select a comment to view details</p>
        </div>
        <div class="inbox-detail-content" id="inbox-detail-content" style="display: none;"></div>
      </div>
    </div>
  `;
  
  // Load comments
  await loadInboxComments();
  
  // Search handler
  document.getElementById('inbox-search').addEventListener('input', debounce(() => loadInboxComments(), 300));
  
  // Filter tabs
  document.querySelectorAll('.inbox-tabs .button').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.inbox-tabs .button').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      loadInboxComments();
    });
  });
});

let currentComments = [];

async function loadInboxComments() {
  const filter = document.querySelector('.inbox-tabs .button.active')?.dataset?.filter || 'all';
  const search = document.getElementById('inbox-search')?.value || '';
  
  try {
    let url = '/comments?limit=50';
    if (filter !== 'all') url += `&ai_intent=${filter}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    
    const data = await api.get(url);
    currentComments = data.data || [];
    renderThreadList(currentComments);
  } catch (e) {
    console.error('Failed to load comments', e);
  }
}

function renderThreadList(comments) {
  const list = document.getElementById('inbox-thread-list');
  
  if (comments.length === 0) {
    list.innerHTML = '<div class="has-text-centered" style="padding: 30px;color:#999;"><i class="fas fa-inbox fa-3x"></i><p>No comments yet</p></div>';
    return;
  }
  
  list.innerHTML = comments.map(c => `
    <div class="media-object comment-thread" data-id="${c.id}" onclick="selectComment('${c.id}')">
      <div class="media-object-section">
        <img src="https://graph.facebook.com/${c.author_fb_id || 'default'}/picture?type=square" alt="" class="avatar" onerror="this.src='https://via.placeholder.com/40'">
      </div>
      <div class="media-object-section main-section">
        <div class="comment-thread-header">
          <strong>${escapeHtml(c.author_name)}</strong>
          <span class="is-size-7 has-text-grey">${timeAgo(c.timestamp)}</span>
        </div>
        <div class="comment-thread-preview">${escapeHtml(truncate(c.text, 80))}</div>
        <div class="comment-thread-meta">
          ${c.ai_intent ? `<span class="tag intent-${c.ai_intent}">${c.ai_intent}</span>` : ''}
          ${c.is_lead ? '<span class="tag is-success">Lead</span>' : ''}
          ${c.moderation_status === 'flagged' ? '<span class="tag is-warning">Flagged</span>' : ''}
          <span class="is-size-7 has-text-grey"><i class="fas fa-heart"></i> ${c.like_count || 0}</span>
        </div>
      </div>
    </div>
  `).join('');
}

function selectComment(id) {
  const comment = currentComments.find(c => c.id === id);
  if (!comment) return;
  
  // Highlight selected
  document.querySelectorAll('.comment-thread').forEach(el => el.classList.remove('selected'));
  document.querySelector(`.comment-thread[data-id="${id}"]`)?.classList.add('selected');
  
  renderCommentDetail(comment);
}

function renderCommentDetail(comment) {
  const detail = document.getElementById('inbox-detail-content');
  const empty = document.querySelector('.inbox-detail-empty');
  
  empty.style.display = 'none';
  detail.style.display = 'block';
  
  detail.innerHTML = `
    <div class="comment-detail-card">
      <div class="columns is-vcentered">
        <div class="column is-1">
          <img src="https://graph.facebook.com/${comment.author_fb_id || 'default'}/picture?type=square" alt="" class="avatar" style="width:48px;height:48px;" onerror="this.src='https://via.placeholder.com/48'">
        </div>
        <div class="column is-11">
          <strong>${escapeHtml(comment.author_name)}</strong>
          <span class="is-size-7 has-text-grey">${timeAgo(comment.timestamp)}</span>
          <div class="comment-tags" style="margin-top: 4px;">
            ${comment.ai_intent ? `<span class="tag intent-${comment.ai_intent}">${comment.ai_intent}</span>` : ''}
            ${comment.sentiment ? `<span class="tag sentiment-${comment.sentiment}">${comment.sentiment}</span>` : ''}
            ${comment.is_lead ? '<span class="tag is-success"><i class="fas fa-bolt"></i> Lead</span>' : ''}
            ${comment.viral_score > 5 ? `<span class="tag is-danger"><i class="fas fa-fire"></i> Viral</span>` : ''}
          </div>
        </div>
      </div>
      <hr>
      <div class="comment-text">${escapeHtml(comment.text)}</div>
      <hr>
      <div class="comment-actions buttons has-addons">
        <button class="button is-small is-primary" onclick="openReplyModal('${comment.id}')"><i class="fas fa-reply"></i> Reply</button>
        <button class="button is-small is-light" onclick="classifyComment('${comment.id}')"><i class="fas fa-tag"></i> Classify</button>
        <button class="button is-small is-warning" onclick="flagComment('${comment.id}')"><i class="fas fa-flag"></i> Flag</button>
        <button class="button is-small is-danger" onclick="hideComment('${comment.id}')"><i class="fas fa-eye-slash"></i> Hide</button>
      </div>
      
      ${comment.reply_text ? `
        <div class="box reply-display">
          <strong><i class="fas fa-reply"></i> AI Reply</strong>
          <span class="tag ${comment.auto_replied ? 'is-success' : 'is-light'}">${comment.auto_replied ? 'Auto' : 'Manual'}</span>
          <p style="margin-top: 8px;">${escapeHtml(comment.reply_text)}</p>
        </div>
      ` : ''}
    </div>
  `;
}

async function classifyComment(id) {
  try {
    const result = await api.post('/comments/classify', { commentId: id });
    showToast(`Classified as: ${result.intent} (${Math.round(result.confidence * 100)}% confidence)`, 'success');
    loadInboxComments();
    // Re-select the comment
    selectComment(id);
  } catch (e) {
    showToast('Classification failed', 'alert');
  }
}

async function flagComment(id) {
  try {
    await api.patch(`/moderation/${id}/flag`, {});
    showToast('Comment flagged for review', 'warning');
    loadInboxComments();
  } catch (e) {}
}

async function hideComment(id) {
  try {
    await api.patch(`/moderation/${id}/hide`, {});
    showToast('Comment hidden', 'alert');
    loadInboxComments();
  } catch (e) {}
}

function openReplyModal(commentId) {
  const comment = currentComments.find(c => c.id === commentId);
  if (!comment) return;
  
  document.getElementById('reply-comment-preview').innerHTML = `
    <strong>${escapeHtml(comment.author_name)}:</strong> ${escapeHtml(truncate(comment.text, 120))}
  `;
  document.getElementById('reply-textarea').value = '';
  document.getElementById('send-reply-btn').dataset.commentId = commentId;
  
  // Generate initial reply suggestion
  generateReplySuggestion(commentId);
  
  openModal('reply-modal');
}

async function generateReplySuggestion(commentId) {
  const tone = document.getElementById('reply-tone-select').value;
  try {
    const result = await api.post('/reply/generate', { commentId, tone });
    document.getElementById('reply-textarea').value = result.reply || '';
  } catch (e) {
    document.getElementById('reply-textarea').value = 'Unable to generate reply. Please write manually.';
  }
}

document.getElementById('reply-tone-select').addEventListener('change', function() {
  const commentId = document.getElementById('send-reply-btn').dataset.commentId;
  if (commentId) generateReplySuggestion(commentId);
});

document.getElementById('regenerate-reply-btn').addEventListener('click', function() {
  const commentId = document.getElementById('send-reply-btn').dataset.commentId;
  if (commentId) generateReplySuggestion(commentId);
});

document.getElementById('send-reply-btn').addEventListener('click', async function() {
  const commentId = this.dataset.commentId;
  const replyText = document.getElementById('reply-textarea').value;
  const tone = document.getElementById('reply-tone-select').value;
  
  if (!replyText.trim()) {
    showToast('Please enter a reply', 'warning');
    return;
  }
  
  try {
    await api.patch(`/comments/${commentId}/reply`, {
      reply_text: replyText,
      reply_tone: tone,
      auto_replied: false,
    });
    showToast('Reply sent!', 'success');
    closeModal('reply-modal');
    loadInboxComments();
    selectComment(commentId);
  } catch (e) {}
});