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

registerPage('auto-reply', async function() {
  const container = document.getElementById('page-auto-reply');
  
  container.innerHTML = `
    <div class="columns">
      <div class="column is-12">
        <h5 class="title is-5 mb-1"><span class="icon"><i class="fas fa-reply-all"></i></span><span>Auto Reply System</span></h5>
        <hr class="mt-2">
      </div>
      <div class="column is-4">
        <div class="box">
          <h6 class="title is-6 mb-4">Reply Templates</h6>
          <div class="field has-addons mb-3">
            <div class="control is-expanded">
              <input class="input is-small" type="text" id="new-template-scenario" placeholder="Scenario...">
            </div>
          </div>
          <div class="field mb-3">
            <div class="control">
              <div class="select is-fullwidth is-small">
                <select id="new-template-tone">
                  <option value="professional">Professional</option>
                  <option value="friendly">Friendly</option>
                  <option value="gen_z">Gen Z</option>
                  <option value="taglish">Taglish</option>
                </select>
              </div>
            </div>
          </div>
          <div class="field mb-3">
            <div class="control">
              <textarea class="textarea is-small" id="new-template-text" rows="3" placeholder="Template text..."></textarea>
            </div>
          </div>
          <button class="button is-small is-primary is-fullwidth mb-4" id="save-template-btn"><span class="icon"><i class="fas fa-save"></i></span><span>Save Template</span></button>
          <hr>
          <div class="template-filters">
            <div class="field mb-3">
              <div class="control">
                <div class="select is-fullwidth is-small">
                  <select id="template-filter-scenario">
                    <option value="">All Scenarios</option>
                    <option value="product_inquiry">Product Inquiry</option>
                    <option value="buying_intent">Buying Intent</option>
                    <option value="complaint">Complaint</option>
                    <option value="positive">Positive Feedback</option>
                    <option value="general">General</option>
                  </select>
                </div>
              </div>
            </div>
            <div class="field mb-3">
              <div class="control">
                <div class="select is-fullwidth is-small">
                  <select id="template-filter-tone">
                    <option value="">All Tones</option>
                    <option value="professional">Professional</option>
                    <option value="friendly">Friendly</option>
                    <option value="gen_z">Gen Z</option>
                    <option value="taglish">Taglish</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="column is-8">
        <div class="box">
          <h6 class="title is-6 mb-4">Configuration</h6>
          <div class="columns">
            <div class="column is-4">
              <div class="field">
                <label class="label is-size-7">Auto Reply Mode</label>
                <div class="control">
                  <div class="select is-fullwidth is-small">
                    <select id="auto-reply-mode">
                      <option value="manual">Manual (suggest only)</option>
                      <option value="semi">Semi-auto (approve first)</option>
                      <option value="full">Full Auto-reply</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div class="column is-4">
              <div class="field">
                <label class="label is-size-7">AI Reply Tone</label>
                <div class="control">
                  <div class="select is-fullwidth is-small">
                    <select id="auto-reply-tone">
                      <option value="professional">Professional</option>
                      <option value="friendly">Friendly</option>
                      <option value="gen_z">Gen Z</option>
                      <option value="taglish">Taglish</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div class="column is-4">
              <label class="label is-size-7">&nbsp;</label>
              <button class="button is-primary is-fullwidth is-small" id="save-auto-reply-config"><span class="icon"><i class="fas fa-save"></i></span><span>Save Config</span></button>
            </div>
          </div>
        </div>
        <div class="box">
          <h6 class="title is-6 mb-4">Saved Templates</h6>
          <div id="template-list">
            <div class="has-text-centered py-4 has-text-grey"><span class="icon"><i class="fas fa-spinner fa-pulse"></i></span></div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Load templates
  await loadTemplates();
  
  // Load config
  try {
    const s = await api.get('/settings');
    document.getElementById('auto-reply-mode').value = s.automation_level || 'manual';
    document.getElementById('auto-reply-tone').value = s.tone || 'professional';
  } catch(e) {}
  
  // Save template
  document.getElementById('save-template-btn').addEventListener('click', saveTemplate);
  
  // Filter templates
  document.getElementById('template-filter-scenario').addEventListener('change', loadTemplates);
  document.getElementById('template-filter-tone').addEventListener('change', loadTemplates);
  
  // Save config
  document.getElementById('save-auto-reply-config').addEventListener('click', async () => {
    try {
      await api.patch('/settings', {
        automation_level: document.getElementById('auto-reply-mode').value,
        tone: document.getElementById('auto-reply-tone').value,
      });
      showToast('Configuration saved!', 'success');
    } catch(e) {}
  });
});

async function loadTemplates() {
  const scenario = document.getElementById('template-filter-scenario')?.value || '';
  const tone = document.getElementById('template-filter-tone')?.value || '';
  
  try {
    let url = '/reply/templates';
    const params = new URLSearchParams();
    if (scenario) params.set('scenario', scenario);
    if (tone) params.set('tone', tone);
    const qs = params.toString();
    if (qs) url += '?' + qs;
    
    const data = await api.get(url);
    const templates = data.data || [];
    
    const list = document.getElementById('template-list');
    if (templates.length === 0) {
      list.innerHTML = '<p class="has-text-centered has-text-grey">No templates saved yet.</p>';
      return;
    }
    
    list.innerHTML = templates.map(t => `
      <div class="box template-card mb-2">
        <div class="columns is-vcentered is-mobile">
          <div class="column">
            <span class="tag scenario-${t.scenario} is-size-7 mr-1">${t.scenario.replace('_', ' ')}</span>
            <span class="tag tone-${t.tone} is-size-7 mr-1">${t.tone}</span>
            <span class="is-size-7 has-text-grey">Used ${t.usage_count || 0}x</span>
          </div>
          <div class="column is-narrow">
            <button class="button is-small is-danger" onclick="deleteTemplate('${t.id}')"><span class="icon"><i class="fas fa-trash"></i></span></button>
          </div>
        </div>
        <p class="is-size-7 mt-2">${escapeHtml(t.template_text)}</p>
      </div>
    `).join('');
  } catch(e) {
    document.getElementById('template-list').innerHTML = '<p class="has-text-centered has-text-grey">Failed to load templates.</p>';
  }
}

async function saveTemplate() {
  const scenario = document.getElementById('new-template-scenario').value.trim();
  const tone = document.getElementById('new-template-tone').value;
  const text = document.getElementById('new-template-text').value.trim();
  
  if (!scenario || !text) {
    showToast('Please fill in scenario and template text', 'warning');
    return;
  }
  
  try {
    await api.post('/reply/templates', { scenario, tone, template_text: text });
    showToast('Template saved!', 'success');
    document.getElementById('new-template-scenario').value = '';
    document.getElementById('new-template-text').value = '';
    loadTemplates();
  } catch(e) {}
}

async function deleteTemplate(id) {
  if (!confirm('Delete this template?')) return;
  try {
    await api.del(`/reply/templates/${id}`);
    showToast('Template deleted', 'success');
    loadTemplates();
  } catch(e) {}
}