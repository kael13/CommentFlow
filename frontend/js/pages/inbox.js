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

  let html = '<nav class="pagination is-small is-centered" role="navigation"><ul class="pagination-list">';
  for (let i = 1; i <= totalPages; i++) {
    html += `<li><a class="pagination-link ${i === currentPage ? 'is-current' : ''}" data-page="${i}">${i}</a></li>`;
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

// Smart Comment Inbox — chat-style interface
registerPage('inbox', async function() {
  const container = document.getElementById('page-inbox');
  
  container.innerHTML = `
    <div class="columns is-gapless inbox-layout">
      <div class="column is-5 inbox-threads">
        <div class="inbox-header p-4">
          <h5 class="title is-5 mb-3"><span class="icon-text"><span class="icon"><i class="fas fa-inbox"></i></span><span>Comment Inbox</span></span></h5>
          <div class="field has-addons mb-3">
            <div class="control is-expanded">
              <input class="input is-small" type="search" id="inbox-search" placeholder="Search comments...">
            </div>
            <div class="control">
              <button class="button is-small is-light" id="inbox-filter-btn"><span class="icon"><i class="fas fa-filter"></i></span></button>
            </div>
          </div>
          <div class="buttons has-addons is-fullwidth">
            <button class="button is-small is-active is-flex-grow-1" data-filter="all">All</button>
            <button class="button is-small is-flex-grow-1" data-filter="lead">Leads</button>
            <button class="button is-small is-flex-grow-1" data-filter="question">Questions</button>
            <button class="button is-small is-flex-grow-1" data-filter="spam">Spam</button>
          </div>
        </div>
        <div class="inbox-thread-list" id="inbox-thread-list">
          <div class="has-text-centered py-6 has-text-grey"><span class="icon is-large"><i class="fas fa-spinner fa-pulse fa-2x"></i></span></div>
        </div>
      </div>
      <div class="column is-7 inbox-detail">
        <div class="inbox-detail-empty has-text-centered py-6">
          <span class="icon is-large has-text-grey-lighter"><i class="fas fa-comment-dots fa-4x"></i></span>
          <p class="subtitle is-6 has-text-grey mt-4">Select a comment to view details</p>
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
  document.querySelectorAll('#page-inbox .buttons.has-addons .button').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('#page-inbox .buttons.has-addons .button').forEach(b => b.classList.remove('is-active'));
      this.classList.add('is-active');
      loadInboxComments();
    });
  });
});

let currentComments = [];

async function loadInboxComments() {
  const filter = document.querySelector('#page-inbox .buttons.has-addons .button.is-active')?.dataset?.filter || 'all';
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
    list.innerHTML = '<div class="has-text-centered has-text-grey py-6"><span class="icon is-large"><i class="fas fa-inbox fa-2x"></i></span><p class="mt-2">No comments yet</p></div>';
    return;
  }
  
  list.innerHTML = comments.map(c => `
    <article class="media comment-thread" data-id="${c.id}" onclick="selectComment('${c.id}')">
      <figure class="media-left">
        <p class="image is-40x40">
          <img class="is-rounded" src="https://graph.facebook.com/${c.author_fb_id || 'default'}/picture?type=square" alt="" onerror="this.src='https://via.placeholder.com/40'">
        </p>
      </figure>
      <div class="media-content">
        <div class="content">
          <p class="mb-1">
            <strong>${escapeHtml(c.author_name)}</strong>
            <small class="has-text-grey ml-2">${timeAgo(c.timestamp)}</small>
          </p>
          <p class="is-size-7 has-text-grey mb-1">${escapeHtml(truncate(c.text, 80))}</p>
        </div>
        <nav class="level is-mobile">
          <div class="level-left">
            ${c.ai_intent ? `<span class="tag intent-${c.ai_intent} is-size-7">${c.ai_intent}</span>` : ''}
            ${c.is_lead ? '<span class="tag is-success is-size-7 ml-1">Lead</span>' : ''}
            ${c.moderation_status === 'flagged' ? '<span class="tag is-warning is-size-7 ml-1">Flagged</span>' : ''}
            <span class="is-size-7 has-text-grey ml-2"><span class="icon is-small"><i class="fas fa-heart"></i></span>${c.like_count || 0}</span>
          </div>
        </nav>
      </div>
    </article>
  `).join('');
}

function selectComment(id) {
  const comment = currentComments.find(c => c.id === id);
  if (!comment) return;
  
  // Highlight selected
  document.querySelectorAll('.comment-thread').forEach(el => el.classList.remove('is-active'));
  document.querySelector(`.comment-thread[data-id="${id}"]`)?.classList.add('is-active');
  
  renderCommentDetail(comment);
}

function renderCommentDetail(comment) {
  const detail = document.getElementById('inbox-detail-content');
  const empty = document.querySelector('.inbox-detail-empty');
  
  empty.style.display = 'none';
  detail.style.display = 'block';
  
  detail.innerHTML = `
    <div class="box comment-detail-card">
      <article class="media">
        <figure class="media-left">
          <p class="image is-48x48">
            <img class="is-rounded" src="https://graph.facebook.com/${comment.author_fb_id || 'default'}/picture?type=square" alt="" onerror="this.src='https://via.placeholder.com/48'">
          </p>
        </figure>
        <div class="media-content">
          <p><strong>${escapeHtml(comment.author_name)}</strong> <small class="has-text-grey">${timeAgo(comment.timestamp)}</small></p>
          <div class="tags mt-2">
            ${comment.ai_intent ? `<span class="tag intent-${comment.ai_intent} is-size-7">${comment.ai_intent}</span>` : ''}
            ${comment.sentiment ? `<span class="tag sentiment-${comment.sentiment} is-size-7">${comment.sentiment}</span>` : ''}
            ${comment.is_lead ? '<span class="tag is-success is-size-7"><span class="icon is-small"><i class="fas fa-bolt"></i></span><span>Lead</span></span>' : ''}
            ${comment.viral_score > 5 ? '<span class="tag is-danger is-size-7"><span class="icon is-small"><i class="fas fa-fire"></i></span><span>Viral</span></span>' : ''}
          </div>
        </div>
      </article>
      <div class="content mt-4">
        <p>${escapeHtml(comment.text)}</p>
      </div>
      <div class="buttons mt-3">
        <button class="button is-small is-primary" onclick="openReplyModal('${comment.id}')"><span class="icon"><i class="fas fa-reply"></i></span><span>Reply</span></button>
        <button class="button is-small is-light" onclick="classifyComment('${comment.id}')"><span class="icon"><i class="fas fa-tag"></i></span><span>Classify</span></button>
        <button class="button is-small is-warning" onclick="flagComment('${comment.id}')"><span class="icon"><i class="fas fa-flag"></i></span><span>Flag</span></button>
        <button class="button is-small is-danger" onclick="hideComment('${comment.id}')"><span class="icon"><i class="fas fa-eye-slash"></i></span><span>Hide</span></button>
      </div>
      ${comment.reply_text ? `
        <div class="box has-background-light mt-4">
          <p class="mb-2"><strong><span class="icon"><i class="fas fa-reply"></i></span><span>AI Reply</span></strong> <span class="tag ${comment.auto_replied ? 'is-success' : 'is-light'} ml-2">${comment.auto_replied ? 'Auto' : 'Manual'}</span></p>
          <p>${escapeHtml(comment.reply_text)}</p>
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