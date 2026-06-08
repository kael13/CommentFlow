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

registerPage('rules', async function() {
  const container = document.getElementById('page-rules');
  
  container.innerHTML = `
    <div class="grid-x grid-margin-x">
      <div class="cell small-12">
        <h5><i class="fas fa-sliders-h"></i> AI Rules & Control Panel</h5>
        <hr>
      </div>
      
      <div class="cell small-6">
        <div class="callout rules-card">
          <h6><i class="fas fa-robot"></i> Reply Tone</h6>
          <p class="text-small text-gray">How should AI replies sound?</p>
          <div class="button-group expanded" id="tone-selector">
            <button class="button" data-value="professional"><i class="fas fa-briefcase"></i> Professional</button>
            <button class="button" data-value="friendly"><i class="fas fa-smile"></i> Friendly</button>
            <button class="button" data-value="gen_z"><i class="fas fa-bolt"></i> Gen Z</button>
            <button class="button" data-value="taglish"><i class="fas fa-language"></i> Taglish</button>
          </div>
        </div>
        
        <div class="callout rules-card">
          <h6><i class="fas fa-level-up-alt"></i> Automation Level</h6>
          <p class="text-small text-gray">How much automation do you want?</p>
          <div class="slider" data-slider data-initial-start="0" data-end="2" data-step="1" id="automation-slider">
            <span class="slider-handle" data-slider-handle role="slider" tabindex="1"></span>
            <span class="slider-fill" data-slider-fill></span>
          </div>
          <div class="grid-x text-center" style="margin-top: 8px;">
            <div class="cell small-4"><span class="label secondary">Manual</span></div>
            <div class="cell small-4"><span class="label warning">Semi-auto</span></div>
            <div class="cell small-4"><span class="label success">Autopilot</span></div>
          </div>
          <div id="automation-label" class="text-center" style="margin-top: 8px;"></div>
        </div>
        
        <div class="callout rules-card">
          <h6><i class="fas fa-shield-alt"></i> Spam Strictness</h6>
          <p class="text-small text-gray">1 = Very strict (less spam), 10 = Lenient</p>
          <div class="slider" data-slider data-initial-start="5" data-end="10" data-step="1" id="strictness-slider">
            <span class="slider-handle" data-slider-handle role="slider" tabindex="1"></span>
            <span class="slider-fill" data-slider-fill></span>
          </div>
          <div class="stat" id="strictness-value">5 / 10</div>
        </div>
      </div>
      
      <div class="cell small-6">
        <div class="callout rules-card">
          <h6><i class="fas fa-toggle-on"></i> Behavior Toggles</h6>
          <div class="behavior-toggle">
            <label>Auto-reply to questions
              <div class="switch">
                <input class="switch-input" id="toggle-reply-questions" type="checkbox">
                <label class="switch-paddle" for="toggle-reply-questions"></label>
              </div>
            </label>
          </div>
          <div class="behavior-toggle">
            <label>Auto-capture leads
              <div class="switch">
                <input class="switch-input" id="toggle-capture-leads" type="checkbox" checked>
                <label class="switch-paddle" for="toggle-capture-leads"></label>
              </div>
            </label>
          </div>
          <div class="behavior-toggle">
            <label>Auto-hide spam
              <div class="switch">
                <input class="switch-input" id="toggle-hide-spam" type="checkbox" checked>
                <label class="switch-paddle" for="toggle-hide-spam"></label>
              </div>
            </label>
          </div>
          <div class="behavior-toggle">
            <label>Send lead notifications via Telegram
              <div class="switch">
                <input class="switch-input" id="toggle-telegram" type="checkbox">
                <label class="switch-paddle" for="toggle-telegram"></label>
              </div>
            </label>
          </div>
          <div class="behavior-toggle">
            <label>Send lead notifications via Email
              <div class="switch">
                <input class="switch-input" id="toggle-email" type="checkbox">
                <label class="switch-paddle" for="toggle-email"></label>
              </div>
            </label>
          </div>
        </div>
        
        <div class="callout rules-card">
          <h6><i class="fas fa-save"></i> Save Configuration</h6>
          <button class="button primary expanded" id="save-rules-btn"><i class="fas fa-save"></i> Save All Settings</button>
          <div id="rules-save-result" style="display:none;" class="callout success">Settings saved successfully!</div>
        </div>
        
        <div class="callout secondary">
          <h6><i class="fas fa-info-circle"></i> Quick Summary</h6>
          <div id="rules-summary">
            <p>Configure your AI assistant's behavior above. Changes take effect immediately after saving.</p>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Load current settings
  try {
    const s = await api.get('/settings');
    
    // Set tone button
    document.querySelectorAll('#tone-selector .button').forEach(btn => {
      btn.classList.remove('primary', 'active');
      if (btn.dataset.value === s.tone) {
        btn.classList.add('primary', 'active');
      }
    });
    
    // Set automation slider
    const autoValues = { 'manual': 0, 'semi': 1, 'autopilot': 2 };
    const autoSlider = $('#automation-slider');
    autoSlider.foundation('_handleZFChange', autoValues[s.automation_level] || 0);
    
    // Set strictness
    const strictSlider = $('#strictness-slider');
    strictSlider.foundation('_handleZFChange', s.spam_strictness || 5);
    document.getElementById('strictness-value').textContent = `${s.spam_strictness || 5} / 10`;
    
    // Set toggles
    document.getElementById('toggle-reply-questions').checked = s.auto_reply_enabled || false;
    document.getElementById('toggle-capture-leads').checked = s.lead_capture_enabled !== false;
    document.getElementById('toggle-hide-spam').checked = true;
    document.getElementById('toggle-telegram').checked = s.notification_telegram || false;
    document.getElementById('toggle-email').checked = s.notification_email || false;
    
    // Set automation label
    updateAutoLabel(autoValues[s.automation_level] || 0);
    
  } catch(e) {
    // Defaults
  }
  
  // Tone selection
  document.querySelectorAll('#tone-selector .button').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('#tone-selector .button').forEach(b => {
        b.classList.remove('primary', 'active');
      });
      this.classList.add('primary', 'active');
    });
  });
  
  // Slider listeners
  $('#automation-slider').on('changed.zf.slider', function() {
    const val = $(this).foundation('_getValue');
    updateAutoLabel(val);
  });
  
  $('#strictness-slider').on('changed.zf.slider', function() {
    const val = $(this).foundation('_getValue');
    document.getElementById('strictness-value').textContent = `${val} / 10`;
  });
  
  // Save button
  document.getElementById('save-rules-btn').addEventListener('click', async () => {
    try {
      const tone = document.querySelector('#tone-selector .button.active')?.dataset?.value || 'professional';
      const autoVal = $('#automation-slider').foundation('_getValue');
      const autoLabels = ['manual', 'semi', 'autopilot'];
      const strictness = $('#strictness-slider').foundation('_getValue');
      
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
