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

registerPage('auto-reply', async function() {
  const container = document.getElementById('page-auto-reply');
  
  container.innerHTML = `
    <div class="columns">
      <div class="column is-12">
        <h5><i class="fas fa-reply-all"></i> Auto Reply System</h5>
        <hr>
      </div>
      <div class="column is-4">
        <div class="box">
          <h6>Reply Templates</h6>
          <div class="field has-addons">
            <div class="control is-expanded">
              <input class="input" type="text" id="new-template-scenario" placeholder="Scenario...">
            </div>
          </div>
          <div class="field has-addons">
            <div class="control is-expanded">
              <select id="new-template-tone" class="input">
                <option value="professional">Professional</option>
                <option value="friendly">Friendly</option>
                <option value="gen_z">Gen Z</option>
                <option value="taglish">Taglish</option>
              </select>
            </div>
          </div>
          <textarea id="new-template-text" rows="3" placeholder="Template text..."></textarea>
          <button class="button is-small is-fullwidth" id="save-template-btn"><i class="fas fa-save"></i> Save Template</button>
          <hr>
          <div class="template-filters">
            <select id="template-filter-scenario" class="small-margin-bottom">
              <option value="">All Scenarios</option>
              <option value="product_inquiry">Product Inquiry</option>
              <option value="buying_intent">Buying Intent</option>
              <option value="complaint">Complaint</option>
              <option value="positive">Positive Feedback</option>
              <option value="general">General</option>
            </select>
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
      <div class="column is-8">
        <div class="box">
          <h6>Configuration</h6>
          <div class="columns">
            <div class="column is-4">
              <label>Auto Reply Mode
                <select id="auto-reply-mode">
                  <option value="manual">Manual (suggest only)</option>
                  <option value="semi">Semi-auto (approve first)</option>
                  <option value="full">Full Auto-reply</option>
                </select>
              </label>
            </div>
            <div class="column is-4">
              <label>AI Reply Tone
                <select id="auto-reply-tone">
                  <option value="professional">Professional</option>
                  <option value="friendly">Friendly</option>
                  <option value="gen_z">Gen Z</option>
                  <option value="taglish">Taglish</option>
                </select>
              </label>
            </div>
            <div class="column is-4">
              <label>&nbsp;</label>
              <button class="button is-primary is-fullwidth" id="save-auto-reply-config"><i class="fas fa-save"></i> Save Config</button>
            </div>
          </div>
        </div>
        <div class="box">
          <h6>Saved Templates</h6>
          <div id="template-list">
            <div class="has-text-centered loading-spinner"><i class="fas fa-spinner fa-spin"></i></div>
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
      <div class="card template-card">
        <div class="card-section">
          <div class="columns is-vcentered">
            <div class="column">
              <span class="tag scenario-${t.scenario}">${t.scenario.replace('_', ' ')}</span>
              <span class="tag tone-${t.tone}">${t.tone}</span>
              <span class="is-size-7 has-text-grey">Used ${t.usage_count || 0}x</span>
            </div>
            <div class="column is-narrow">
              <button class="button is-small is-danger" onclick="deleteTemplate('${t.id}')"><i class="fas fa-trash"></i></button>
            </div>
          </div>
          <p class="template-text">${escapeHtml(t.template_text)}</p>
        </div>
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