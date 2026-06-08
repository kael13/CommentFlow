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

function updateSliderFill(slider) {
  const min = parseFloat(slider.min);
  const max = parseFloat(slider.max);
  const val = parseFloat(slider.value);
  const percent = ((val - min) / (max - min)) * 100;
  slider.style.setProperty('--fill', percent + '%');
}

registerPage('rules', async function() {
  const container = document.getElementById('page-rules');
  
  container.innerHTML = `
    <div class="columns">
      <div class="column is-12">
        <h5 class="title is-5 mb-1"><span class="icon"><i class="fas fa-sliders-h"></i></span><span>AI Rules & Control Panel</span></h5>
        <hr class="mt-2">
      </div>

      <div class="column is-6">
        <div class="box rules-card mb-4">
          <h6 class="title is-6 mb-3"><span class="icon"><i class="fas fa-robot"></i></span><span>Reply Tone</span></h6>
          <p class="is-size-7 has-text-grey mb-3">How should AI replies sound?</p>
          <div class="buttons has-addons" id="tone-selector">
            <button class="button is-small" data-value="professional"><span class="icon"><i class="fas fa-briefcase"></i></span><span>Professional</span></button>
            <button class="button is-small" data-value="friendly"><span class="icon"><i class="fas fa-smile"></i></span><span>Friendly</span></button>
            <button class="button is-small" data-value="gen_z"><span class="icon"><i class="fas fa-bolt"></i></span><span>Gen Z</span></button>
            <button class="button is-small" data-value="taglish"><span class="icon"><i class="fas fa-language"></i></span><span>Taglish</span></button>
          </div>
        </div>

        <div class="box rules-card mb-4">
          <h6 class="title is-6 mb-3"><span class="icon"><i class="fas fa-level-up-alt"></i></span><span>Automation Level</span></h6>
          <p class="is-size-7 has-text-grey mb-3">How much automation do you want?</p>
          <input type="range" class="range-slider" id="automation-slider" min="0" max="2" step="1" value="0">
          <div class="columns has-text-centered mt-2">
            <div class="column is-4"><span class="tag is-light">Manual</span></div>
            <div class="column is-4"><span class="tag is-warning">Semi-auto</span></div>
            <div class="column is-4"><span class="tag is-success">Autopilot</span></div>
          </div>
          <p class="has-text-centered mt-2 is-size-7 has-text-grey" id="automation-label"></p>
        </div>

        <div class="box rules-card mb-4">
          <h6 class="title is-6 mb-3"><span class="icon"><i class="fas fa-shield-alt"></i></span><span>Spam Strictness</span></h6>
          <p class="is-size-7 has-text-grey mb-3">1 = Very strict (less spam), 10 = Lenient</p>
          <input type="range" class="range-slider" id="strictness-slider" min="1" max="10" step="1" value="5">
          <div class="has-text-centered mt-2">
            <span class="is-size-7 has-text-grey">Strictness</span>
            <p class="title is-5 mb-0" id="strictness-value">5 / 10</p>
          </div>
        </div>
      </div>

      <div class="column is-6">
        <div class="box rules-card mb-4">
          <h6 class="title is-6 mb-4"><span class="icon"><i class="fas fa-toggle-on"></i></span><span>Behavior Toggles</span></h6>
          <div class="is-flex is-align-items-center is-justify-content-space-between py-2" style="border-bottom:1px solid #f0f0f0;">
            <span class="is-size-7">Auto-reply to questions</span>
            <span class="toggle-switch ml-2">
              <input type="checkbox" id="toggle-reply-questions">
              <span class="toggle-slider"></span>
            </span>
          </div>
          <div class="is-flex is-align-items-center is-justify-content-space-between py-2" style="border-bottom:1px solid #f0f0f0;">
            <span class="is-size-7">Auto-capture leads</span>
            <span class="toggle-switch ml-2">
              <input type="checkbox" id="toggle-capture-leads" checked>
              <span class="toggle-slider"></span>
            </span>
          </div>
          <div class="is-flex is-align-items-center is-justify-content-space-between py-2" style="border-bottom:1px solid #f0f0f0;">
            <span class="is-size-7">Auto-hide spam</span>
            <span class="toggle-switch ml-2">
              <input type="checkbox" id="toggle-hide-spam" checked>
              <span class="toggle-slider"></span>
            </span>
          </div>
          <div class="is-flex is-align-items-center is-justify-content-space-between py-2" style="border-bottom:1px solid #f0f0f0;">
            <span class="is-size-7">Lead notifications via Telegram</span>
            <span class="toggle-switch ml-2">
              <input type="checkbox" id="toggle-telegram">
              <span class="toggle-slider"></span>
            </span>
          </div>
          <div class="is-flex is-align-items-center is-justify-content-space-between py-2">
            <span class="is-size-7">Lead notifications via Email</span>
            <span class="toggle-switch ml-2">
              <input type="checkbox" id="toggle-email">
              <span class="toggle-slider"></span>
            </span>
          </div>
        </div>

        <div class="box rules-card mb-4">
          <h6 class="title is-6 mb-4"><span class="icon"><i class="fas fa-save"></i></span><span>Save Configuration</span></h6>
          <button class="button is-primary is-fullwidth" id="save-rules-btn"><span class="icon"><i class="fas fa-save"></i></span><span>Save All Settings</span></button>
          <div id="rules-save-result" class="notification is-success mt-3" style="display:none;">Settings saved successfully!</div>
        </div>

        <div class="box has-background-light">
          <h6 class="title is-6 mb-3"><span class="icon"><i class="fas fa-info-circle"></i></span><span>Quick Summary</span></h6>
          <div id="rules-summary">
            <p class="is-size-7">Configure your AI assistant's behavior above. Changes take effect immediately after saving.</p>
          </div>
        </div>
      </div>
    </div>
  `;
  
  const autoSlider = document.getElementById('automation-slider');
  const strictSlider = document.getElementById('strictness-slider');
  
  try {
    const s = await api.get('/settings');
    
    document.querySelectorAll('#tone-selector .button').forEach(btn => {
      btn.classList.remove('is-primary', 'is-active');
      if (btn.dataset.value === s.tone) {
        btn.classList.add('is-primary', 'is-active');
      }
    });
    
    const autoValues = { 'manual': 0, 'semi': 1, 'autopilot': 2 };
    autoSlider.value = autoValues[s.automation_level] || 0;
    updateSliderFill(autoSlider);
    
    strictSlider.value = s.spam_strictness || 5;
    updateSliderFill(strictSlider);
    document.getElementById('strictness-value').textContent = `${s.spam_strictness || 5} / 10`;
    
    document.getElementById('toggle-reply-questions').checked = s.auto_reply_enabled || false;
    document.getElementById('toggle-capture-leads').checked = s.lead_capture_enabled !== false;
    document.getElementById('toggle-hide-spam').checked = true;
    document.getElementById('toggle-telegram').checked = s.notification_telegram || false;
    document.getElementById('toggle-email').checked = s.notification_email || false;
    
    updateAutoLabel(autoValues[s.automation_level] || 0);
    
  } catch(e) {
  }
  
  document.querySelectorAll('#tone-selector .button').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('#tone-selector .button').forEach(b => {
        b.classList.remove('is-primary', 'is-active');
      });
      this.classList.add('is-primary', 'is-active');
    });
  });
  
  autoSlider.addEventListener('input', function() {
    updateAutoLabel(this.value);
    updateSliderFill(this);
  });
  
  strictSlider.addEventListener('input', function() {
    document.getElementById('strictness-value').textContent = `${this.value} / 10`;
    updateSliderFill(this);
  });
  
  document.getElementById('save-rules-btn').addEventListener('click', async () => {
    try {
      const tone = document.querySelector('#tone-selector .button.is-active')?.dataset?.value || 'professional';
      const autoVal = parseInt(document.getElementById('automation-slider').value);
      const autoLabels = ['manual', 'semi', 'autopilot'];
      const strictness = parseInt(document.getElementById('strictness-slider').value);
      
      await api.patch('/settings', {
        tone,
        automation_level: autoLabels[autoVal] || 'manual',
        spam_strictness: strictness,
        auto_reply_enabled: document.getElementById('toggle-reply-questions').checked,
        lead_capture_enabled: document.getElementById('toggle-capture-leads').checked,
        notification_telegram: document.getElementById('toggle-telegram').checked,
        notification_email: document.getElementById('toggle-email').checked,
      });
      
      const result = document.getElementById('rules-save-result');
      result.style.display = 'block';
      setTimeout(() => { result.style.display = 'none'; }, 3000);
      showToast('Settings saved!', 'success');
    } catch(e) {
      showToast('Failed to save settings', 'alert');
    }
  });
  
  function updateAutoLabel(val) {
    const labels = ['Manual — AI suggests but you approve', 'Semi-auto — AI acts on questions, you handle rest', 'Full Autopilot — AI handles everything'];
    document.getElementById('automation-label').textContent = labels[val] || '';
  }
});
