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
  
  let html = '<ul class="pagination-list">';
  for (let i = 1; i <= totalPages; i++) {
    html += `<li><a class="pagination-link ${i === currentPage ? 'is-current' : ''}" href="#" data-page="${i}">${i}</a></li>`;
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
        <h5><i class="fas fa-sliders-h"></i> AI Rules & Control Panel</h5>
        <hr>
      </div>
      
      <div class="column is-6">
        <div class="box rules-card">
          <h6><i class="fas fa-robot"></i> Reply Tone</h6>
          <p class="is-size-7 has-text-grey">How should AI replies sound?</p>
          <div class="buttons has-addons is-fullwidth" id="tone-selector">
            <button class="button" data-value="professional"><i class="fas fa-briefcase"></i> Professional</button>
            <button class="button" data-value="friendly"><i class="fas fa-smile"></i> Friendly</button>
            <button class="button" data-value="gen_z"><i class="fas fa-bolt"></i> Gen Z</button>
            <button class="button" data-value="taglish"><i class="fas fa-language"></i> Taglish</button>
          </div>
        </div>
        
        <div class="box rules-card">
          <h6><i class="fas fa-level-up-alt"></i> Automation Level</h6>
          <p class="is-size-7 has-text-grey">How much automation do you want?</p>
          <input type="range" class="range-slider" id="automation-slider" min="0" max="2" step="1" value="0">
          <div class="columns has-text-centered" style="margin-top: 8px;">
            <div class="column is-4"><span class="tag is-light">Manual</span></div>
            <div class="column is-4"><span class="tag is-warning">Semi-auto</span></div>
            <div class="column is-4"><span class="tag is-success">Autopilot</span></div>
          </div>
          <div id="automation-label" class="has-text-centered" style="margin-top: 8px;"></div>
        </div>
        
        <div class="box rules-card">
          <h6><i class="fas fa-shield-alt"></i> Spam Strictness</h6>
          <p class="is-size-7 has-text-grey">1 = Very strict (less spam), 10 = Lenient</p>
          <input type="range" class="range-slider" id="strictness-slider" min="1" max="10" step="1" value="5">
          <div class="level" style="margin-top: 8px;">
            <div class="level-item has-text-centered">
              <div>
                <p class="heading">Strictness</p>
                <p class="title is-6" id="strictness-value">5 / 10</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="column is-6">
        <div class="box rules-card">
          <h6><i class="fas fa-toggle-on"></i> Behavior Toggles</h6>
          <div class="behavior-toggle">
            <label>Auto-reply to questions
              <label class="toggle-switch">
                <input type="checkbox" id="toggle-reply-questions">
                <span class="toggle-slider"></span>
              </label>
            </label>
          </div>
          <div class="behavior-toggle">
            <label>Auto-capture leads
              <label class="toggle-switch">
                <input type="checkbox" id="toggle-capture-leads" checked>
                <span class="toggle-slider"></span>
              </label>
            </label>
          </div>
          <div class="behavior-toggle">
            <label>Auto-hide spam
              <label class="toggle-switch">
                <input type="checkbox" id="toggle-hide-spam" checked>
                <span class="toggle-slider"></span>
              </label>
            </label>
          </div>
          <div class="behavior-toggle">
            <label>Send lead notifications via Telegram
              <label class="toggle-switch">
                <input type="checkbox" id="toggle-telegram">
                <span class="toggle-slider"></span>
              </label>
            </label>
          </div>
          <div class="behavior-toggle">
            <label>Send lead notifications via Email
              <label class="toggle-switch">
                <input type="checkbox" id="toggle-email">
                <span class="toggle-slider"></span>
              </label>
            </label>
          </div>
        </div>
        
        <div class="box rules-card">
          <h6><i class="fas fa-save"></i> Save Configuration</h6>
          <button class="button is-primary is-fullwidth" id="save-rules-btn"><i class="fas fa-save"></i> Save All Settings</button>
          <div id="rules-save-result" style="display:none;" class="box is-success">Settings saved successfully!</div>
        </div>
        
        <div class="box is-light">
          <h6><i class="fas fa-info-circle"></i> Quick Summary</h6>
          <div id="rules-summary">
            <p>Configure your AI assistant's behavior above. Changes take effect immediately after saving.</p>
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
