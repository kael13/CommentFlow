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

let currentPosts = [];
let currentThread = [];
let selectedPostId = null;
let currentReplyMode = {};

registerPage('inbox', async function() {
  const container = document.getElementById('page-inbox');

  container.innerHTML = `
    <div class="columns is-gapless post-thread-layout">
      <div class="column is-4 post-list-panel">
        <div class="post-list-header p-4">
          <h5 class="title is-5 mb-3"><span class="icon-text"><span class="icon"><i class="fas fa-inbox"></i></span><span>Post Threads</span></span></h5>
          <div class="field has-addons mb-3">
            <div class="control is-expanded">
              <input class="input is-small" type="search" id="post-search" placeholder="Search posts...">
            </div>
            <div class="control">
              <button class="button is-small is-light" id="post-refresh-btn"><span class="icon"><i class="fas fa-sync"></i></span></button>
            </div>
          </div>
        </div>
        <div class="post-list" id="post-list">
          <div class="has-text-centered py-6 has-text-grey"><span class="icon is-large"><i class="fas fa-spinner fa-pulse fa-2x"></i></span></div>
        </div>
      </div>
      <div class="column is-8 post-thread-panel">
        <div class="thread-empty has-text-centered py-6" id="thread-empty">
          <span class="icon is-large has-text-grey-lighter"><i class="fas fa-comments fa-4x"></i></span>
          <p class="subtitle is-6 has-text-grey mt-4">Select a post to view its comment thread</p>
        </div>
        <div class="thread-content" id="thread-content" style="display: none;"></div>
      </div>
    </div>
  `;

  await loadPosts();

  document.getElementById('post-search').addEventListener('input', debounce(() => loadPosts(), 300));
  document.getElementById('post-refresh-btn').addEventListener('click', () => loadPosts());
});

async function loadPosts() {
  try {
    const data = await api.get('/comments/posts?limit=50');
    currentPosts = data.data || [];
    renderPostList(currentPosts);
  } catch (e) {
    document.getElementById('post-list').innerHTML = '<div class="has-text-centered has-text-grey py-6">Failed to load posts</div>';
  }
}

function renderPostList(posts) {
  const list = document.getElementById('post-list');
  const search = document.getElementById('post-search')?.value?.toLowerCase() || '';

  const filtered = search
    ? posts.filter(p => (p.first_comment || '').toLowerCase().includes(search) || (p.post_id || '').toLowerCase().includes(search))
    : posts;

  if (filtered.length === 0) {
    list.innerHTML = '<div class="has-text-centered has-text-grey py-6"><span class="icon is-large"><i class="fas fa-inbox fa-2x"></i></span><p class="mt-2">No posts yet</p></div>';
    return;
  }

  list.innerHTML = filtered.map(p => {
    const isActive = p.post_id === selectedPostId;
    const intentBreakdown = p.intent_breakdown || {};
    const leadCount = p.lead_count || 0;

    return `
      <div class="post-card ${isActive ? 'is-active' : ''}" data-post-id="${escapeHtml(p.post_id)}" onclick="selectPost('${escapeHtml(p.post_id)}')">
        <p class="post-card-text is-size-7 mb-2">${escapeHtml(truncate(p.first_comment, 100))}</p>
        <div class="post-card-meta">
          <span class="post-card-stat"><span class="icon is-small"><i class="fas fa-comment"></i></span>${p.comment_count}</span>
          ${leadCount > 0 ? `<span class="post-card-stat has-text-success"><span class="icon is-small"><i class="fas fa-bullseye"></i></span>${leadCount} leads</span>` : ''}
          <span class="post-card-stat has-text-grey">${timeAgo(p.last_activity)}</span>
        </div>
        <div class="post-card-intents mt-1">
          ${Object.entries(intentBreakdown).slice(0, 4).map(([intent, count]) =>
            `<span class="tag intent-${intent} is-size-7">${intent} ${count}</span>`
          ).join('')}
        </div>
      </div>
    `;
  }).join('');
}

async function selectPost(postId) {
  selectedPostId = postId;

  document.querySelectorAll('.post-card').forEach(el => el.classList.remove('is-active'));
  document.querySelector(`.post-card[data-post-id="${postId}"]`)?.classList.add('is-active');

  document.getElementById('thread-empty').style.display = 'none';
  const threadContent = document.getElementById('thread-content');
  threadContent.style.display = 'block';
  threadContent.innerHTML = '<div class="has-text-centered py-6 has-text-grey"><span class="icon is-large"><i class="fas fa-spinner fa-pulse fa-2x"></i></span></div>';

  try {
    const data = await api.get(`/comments/thread/${encodeURIComponent(postId)}`);
    currentThread = data.data || [];
    renderThread(currentThread);
  } catch (e) {
    threadContent.innerHTML = '<div class="has-text-centered has-text-grey py-6">Failed to load thread</div>';
  }
}

function renderThread(comments) {
  const threadContent = document.getElementById('thread-content');

  const post = currentPosts.find(p => p.post_id === selectedPostId);

  let html = '';

  if (post) {
    html += `
      <div class="thread-header box mb-4">
        <p class="is-size-6 mb-2">${escapeHtml(truncate(post.first_comment, 200))}</p>
        <div class="thread-header-stats">
          <span class="tag is-info"><span class="icon is-small"><i class="fas fa-comment"></i></span><span>${post.comment_count} comments</span></span>
          ${post.lead_count > 0 ? `<span class="tag is-success"><span class="icon is-small"><i class="fas fa-bullseye"></i></span><span>${post.lead_count} leads</span></span>` : ''}
          <span class="tag is-light">${timeAgo(post.last_activity)}</span>
        </div>
      </div>
    `;
  }

  html += '<div class="thread-comments">';
  html += renderCommentTree(comments, 0);
  html += '</div>';

  html += `
    <div class="thread-templates-panel box mt-4">
      <details>
        <summary class="thread-templates-toggle"><span class="icon"><i class="fas fa-sliders-h"></i></span><span>Reply Settings & Templates</span></summary>
        <div class="thread-templates-body mt-3">
          <div class="columns is-mobile">
            <div class="column is-6">
              <div class="field">
                <label class="label is-size-7">Default Tone</label>
                <div class="control">
                  <div class="select is-small is-fullwidth">
                    <select id="thread-tone-select">
                      <option value="professional">Professional</option>
                      <option value="friendly">Friendly</option>
                      <option value="gen_z">Gen Z</option>
                      <option value="taglish">Taglish</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div class="column is-6">
              <div class="field">
                <label class="label is-size-7">Reply Mode</label>
                <div class="control">
                  <div class="select is-small is-fullwidth">
                    <select id="thread-mode-select">
                      <option value="manual">Manual (suggest only)</option>
                      <option value="semi">Semi-auto (approve first)</option>
                      <option value="full">Full Auto-reply</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <button class="button is-small is-primary is-fullwidth mb-3" id="thread-save-config-btn"><span class="icon"><i class="fas fa-save"></i></span><span>Save Config</span></button>
          <hr>
          <h6 class="title is-7 mb-2">Reply Templates</h6>
          <div id="thread-template-list">
            <div class="has-text-centered py-2 has-text-grey"><span class="icon"><i class="fas fa-spinner fa-pulse"></i></span></div>
          </div>
        </div>
      </details>
    </div>
  `;

  threadContent.innerHTML = html;

  loadThreadSettings();
  loadThreadTemplates();

  document.getElementById('thread-save-config-btn').addEventListener('click', saveThreadConfig);
}

function renderCommentTree(comments, depth) {
  if (!comments || comments.length === 0) return '';

  return comments.map(c => {
    const hasReply = !!c.reply_text;
    const replyMode = currentReplyMode[c.id] || null;

    let html = `
      <div class="thread-comment ${depth > 0 ? 'thread-comment-nested' : ''}" data-comment-id="${c.id}">
        <div class="thread-comment-body">
          <article class="media">
            <figure class="media-left">
              <p class="image is-32x32">
                <img class="is-rounded" src="https://graph.facebook.com/${c.author_fb_id || 'default'}/picture?type=square" alt="" onerror="this.src='https://via.placeholder.com/32'">
              </p>
            </figure>
            <div class="media-content">
              <p class="mb-1">
                <strong>${escapeHtml(c.author_name)}</strong>
                <small class="has-text-grey ml-2">${timeAgo(c.timestamp)}</small>
              </p>
              <p class="is-size-7 mb-2">${escapeHtml(c.text)}</p>
              <div class="thread-comment-tags">
                ${c.ai_intent ? `<span class="tag intent-${c.ai_intent} is-size-7">${c.ai_intent}</span>` : ''}
                ${c.sentiment ? `<span class="tag sentiment-${c.sentiment} is-size-7">${c.sentiment}</span>` : ''}
                ${c.is_lead ? '<span class="tag is-success is-size-7"><span class="icon is-small"><i class="fas fa-bolt"></i></span><span>Lead</span></span>' : ''}
                ${c.viral_score > 5 ? '<span class="tag is-danger is-size-7"><span class="icon is-small"><i class="fas fa-fire"></i></span><span>Viral</span></span>' : ''}
              </div>
              <div class="thread-comment-actions mt-2">
                <button class="button is-small is-light thread-reply-btn" data-comment-id="${c.id}" data-mode="manual">
                  <span class="icon is-small"><i class="fas fa-user"></i></span><span>Reply as Me</span>
                </button>
                <button class="button is-small is-primary thread-reply-btn" data-comment-id="${c.id}" data-mode="ai">
                  <span class="icon is-small"><i class="fas fa-robot"></i></span><span>AI Reply</span>
                </button>
                <button class="button is-small is-light" onclick="classifyInline('${c.id}')"><span class="icon is-small"><i class="fas fa-tag"></i></span></button>
                <button class="button is-small is-light" onclick="flagInline('${c.id}')"><span class="icon is-small"><i class="fas fa-flag"></i></span></button>
                <button class="button is-small is-light" onclick="hideInline('${c.id}')"><span class="icon is-small"><i class="fas fa-eye-slash"></i></span></button>
              </div>
            </div>
          </article>
          ${hasReply ? `
            <div class="thread-existing-reply">
              <article class="media">
                <figure class="media-left">
                  <p class="image is-24x24">
                    <img class="is-rounded" src="https://via.placeholder.com/24/3b5998/fff?text=AI" alt="">
                  </p>
                </figure>
                <div class="media-content">
                  <p class="mb-1">
                    <strong>You ${c.auto_replied ? '(AI)' : ''}</strong>
                    <small class="has-text-grey ml-2">${timeAgo(c.reply_timestamp)}</small>
                    ${c.auto_replied ? '<span class="tag is-info is-size-7 ml-1">auto</span>' : ''}
                    ${c.reply_tone ? `<span class="tag is-light is-size-7 ml-1">${c.reply_tone}</span>` : ''}
                  </p>
                  <p class="is-size-7">${escapeHtml(c.reply_text)}</p>
                </div>
              </article>
            </div>
          ` : ''}
          <div class="thread-inline-reply" id="reply-area-${c.id}" style="display: none;"></div>
        </div>
      </div>
    `;

    if (c.children && c.children.length > 0) {
      html += renderCommentTree(c.children, depth + 1);
    }

    return html;
  }).join('');
}

document.addEventListener('click', function(e) {
  const btn = e.target.closest('.thread-reply-btn');
  if (!btn) return;

  const commentId = btn.dataset.commentId;
  const mode = btn.dataset.mode;
  const area = document.getElementById(`reply-area-${commentId}`);
  if (!area) return;

  if (area.style.display !== 'none' && currentReplyMode[commentId] === mode) {
    area.style.display = 'none';
    currentReplyMode[commentId] = null;
    return;
  }

  currentReplyMode[commentId] = mode;
  area.style.display = 'block';

  if (mode === 'manual') {
    area.innerHTML = `
      <div class="thread-reply-box">
        <div class="field">
          <div class="control">
            <textarea class="textarea is-small" id="reply-text-${commentId}" rows="3" placeholder="Write your reply..."></textarea>
          </div>
        </div>
        <div class="field is-grouped">
          <div class="control">
            <button class="button is-small is-primary" onclick="sendManualReply('${commentId}')"><span class="icon"><i class="fas fa-paper-plane"></i></span><span>Send Reply</span></button>
          </div>
          <div class="control">
            <button class="button is-small is-light" onclick="closeReplyArea('${commentId}')">Cancel</button>
          </div>
        </div>
      </div>
    `;
  } else {
    const tone = document.getElementById('thread-tone-select')?.value || 'professional';
    area.innerHTML = `
      <div class="thread-reply-box thread-reply-ai">
        <div class="columns is-mobile mb-2">
          <div class="column is-5">
            <div class="field">
              <label class="label is-size-7">Tone</label>
              <div class="control">
                <div class="select is-small is-fullwidth">
                  <select id="reply-tone-${commentId}">
                    <option value="professional" ${tone === 'professional' ? 'selected' : ''}>Professional</option>
                    <option value="friendly" ${tone === 'friendly' ? 'selected' : ''}>Friendly</option>
                    <option value="gen_z" ${tone === 'gen_z' ? 'selected' : ''}>Gen Z</option>
                    <option value="taglish" ${tone === 'taglish' ? 'selected' : ''}>Taglish</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          <div class="column is-4">
            <label class="label is-size-7">&nbsp;</label>
            <button class="button is-small is-light is-fullwidth" onclick="regenerateAIReply('${commentId}')"><span class="icon"><i class="fas fa-sync"></i></span><span>Regenerate</span></button>
          </div>
          <div class="column is-3">
            <label class="label is-size-7">&nbsp;</label>
            <button class="button is-small is-light is-fullwidth" onclick="closeReplyArea('${commentId}')">Cancel</button>
          </div>
        </div>
        <div class="field">
          <div class="control">
            <textarea class="textarea is-small" id="reply-text-${commentId}" rows="3" placeholder="Generating AI reply..."></textarea>
          </div>
        </div>
        <div class="field">
          <div class="control">
            <button class="button is-small is-primary" onclick="sendAIReply('${commentId}')"><span class="icon"><i class="fas fa-paper-plane"></i></span><span>Send AI Reply</span></button>
          </div>
        </div>
      </div>
    `;
    generateAIReply(commentId);
  }
});

function closeReplyArea(commentId) {
  const area = document.getElementById(`reply-area-${commentId}`);
  if (area) {
    area.style.display = 'none';
    area.innerHTML = '';
  }
  currentReplyMode[commentId] = null;
}

async function generateAIReply(commentId) {
  const toneEl = document.getElementById(`reply-tone-${commentId}`);
  const textEl = document.getElementById(`reply-text-${commentId}`);
  if (!textEl) return;

  textEl.value = 'Generating...';

  try {
    const tone = toneEl ? toneEl.value : 'professional';
    const result = await api.post('/reply/generate', { commentId, tone });
    textEl.value = result.reply || '';
  } catch (e) {
    textEl.value = 'Unable to generate reply. Please write manually.';
  }
}

async function regenerateAIReply(commentId) {
  await generateAIReply(commentId);
}

document.addEventListener('change', function(e) {
  if (e.target.id && e.target.id.startsWith('reply-tone-')) {
    const commentId = e.target.id.replace('reply-tone-', '');
    generateAIReply(commentId);
  }
});

async function sendManualReply(commentId) {
  const textEl = document.getElementById(`reply-text-${commentId}`);
  const replyText = textEl ? textEl.value.trim() : '';

  if (!replyText) {
    showToast('Please enter a reply', 'warning');
    return;
  }

  try {
    await api.patch(`/comments/${commentId}/reply`, {
      reply_text: replyText,
      reply_tone: 'manual',
      auto_replied: false,
    });
    showToast('Reply sent!', 'success');
    closeReplyArea(commentId);
    if (selectedPostId) selectPost(selectedPostId);
  } catch (e) {}
}

async function sendAIReply(commentId) {
  const textEl = document.getElementById(`reply-text-${commentId}`);
  const toneEl = document.getElementById(`reply-tone-${commentId}`);
  const replyText = textEl ? textEl.value.trim() : '';
  const tone = toneEl ? toneEl.value : 'professional';

  if (!replyText) {
    showToast('Please enter a reply', 'warning');
    return;
  }

  try {
    await api.patch(`/comments/${commentId}/reply`, {
      reply_text: replyText,
      reply_tone: tone,
      auto_replied: true,
    });
    showToast('AI reply sent!', 'success');
    closeReplyArea(commentId);
    if (selectedPostId) selectPost(selectedPostId);
  } catch (e) {}
}

async function classifyInline(id) {
  try {
    const result = await api.post('/comments/classify', { commentId: id });
    showToast(`Classified as: ${result.intent} (${Math.round(result.confidence * 100)}% confidence)`, 'success');
    if (selectedPostId) selectPost(selectedPostId);
  } catch (e) {
    showToast('Classification failed', 'alert');
  }
}

async function flagInline(id) {
  try {
    await api.patch(`/moderation/${id}/flag`, {});
    showToast('Comment flagged for review', 'warning');
    if (selectedPostId) selectPost(selectedPostId);
  } catch (e) {}
}

async function hideInline(id) {
  try {
    await api.patch(`/moderation/${id}/hide`, {});
    showToast('Comment hidden', 'alert');
    if (selectedPostId) selectPost(selectedPostId);
  } catch (e) {}
}

async function loadThreadSettings() {
  try {
    const s = await api.get('/settings');
    const toneEl = document.getElementById('thread-tone-select');
    const modeEl = document.getElementById('thread-mode-select');
    if (toneEl) toneEl.value = s.tone || 'professional';
    if (modeEl) modeEl.value = s.automation_level || 'manual';
  } catch (e) {}
}

async function saveThreadConfig() {
  try {
    await api.patch('/settings', {
      tone: document.getElementById('thread-tone-select').value,
      automation_level: document.getElementById('thread-mode-select').value,
    });
    showToast('Configuration saved!', 'success');
  } catch (e) {}
}

async function loadThreadTemplates() {
  const list = document.getElementById('thread-template-list');
  if (!list) return;

  try {
    const data = await api.get('/reply/templates');
    const templates = data.data || [];

    if (templates.length === 0) {
      list.innerHTML = '<p class="has-text-centered has-text-grey is-size-7">No templates saved.</p>';
      return;
    }

    list.innerHTML = templates.map(t => `
      <div class="thread-template-item">
        <div class="is-flex is-justify-content-space-between is-align-items-center">
          <div>
            <span class="tag intent-${t.scenario} is-size-7">${t.scenario.replace('_', ' ')}</span>
            <span class="tag is-light is-size-7 ml-1">${t.tone}</span>
          </div>
          <button class="delete is-small" onclick="deleteThreadTemplate('${t.id}')"></button>
        </div>
        <p class="is-size-7 mt-1 has-text-grey">${escapeHtml(truncate(t.template_text, 80))}</p>
      </div>
    `).join('');
  } catch (e) {
    list.innerHTML = '<p class="has-text-centered has-text-grey is-size-7">Failed to load templates.</p>';
  }
}

async function deleteThreadTemplate(id) {
  if (!confirm('Delete this template?')) return;
  try {
    await api.del(`/reply/templates/${id}`);
    showToast('Template deleted', 'success');
    loadThreadTemplates();
  } catch (e) {}
}
