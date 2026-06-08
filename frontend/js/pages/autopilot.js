registerPage('autopilot', async function() {
  const container = document.getElementById('page-autopilot');
  
  container.innerHTML = `
    <div class="grid-x grid-margin-x">
      <div class="cell small-12">
        <h5><i class="fas fa-microchip"></i> Autopilot Mode</h5>
        <hr>
      </div>
      
      <div class="cell small-4">
        <div class="callout autopilot-status-card" id="autopilot-status-card">
          <div class="grid-x align-middle">
            <div class="cell shrink">
              <div class="autopilot-indicator" id="autopilot-indicator">&#9679;</div>
            </div>
            <div class="cell auto">
              <h6>Autopilot Status</h6>
              <p class="autopilot-status-text" id="autopilot-status-text">Checking...</p>
            </div>
          </div>
        </div>
        
        <div class="callout">
          <h6>Autopilot Stats</h6>
          <div class="stat-row">
            <span>AI Replies Sent</span>
            <strong id="auto-stats-replies">0</strong>
          </div>
          <div class="stat-row">
            <span>Leads Captured</span>
            <strong id="auto-stats-leads">0</strong>
          </div>
          <div class="stat-row">
            <span>Spam Hidden</span>
            <strong id="auto-stats-spam">0</strong>
          </div>
          <div class="stat-row">
            <span>Comments Classified</span>
            <strong id="auto-stats-classified">0</strong>
          </div>
        </div>
        
        <div class="callout secondary">
          <h6>What Autopilot Does</h6>
          <ul class="text-small">
            <li>&#10003; Classifies every new comment</li>
            <li>&#10003; Replies to questions &amp; leads</li>
            <li>&#10003; Captures leads automatically</li>
            <li>&#10003; Hides spam &amp; toxic content</li>
            <li>&#10003; Sends notifications</li>
            <li>&#10003; Tracks viral engagement</li>
          </ul>
        </div>
      </div>
      
      <div class="cell small-8">
        <div class="callout">
          <h6><i class="fas fa-stream"></i> Real-time Activity Log</h6>
          <div class="activity-feed" id="activity-feed">
            <div class="text-center loading-spinner"><i class="fas fa-spinner fa-spin"></i></div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  loadActivityLog();
  updateAutopilotStatus();
  loadAutopilotStats();
  
  let pollInterval = setInterval(() => {
    if (document.getElementById('page-autopilot').classList.contains('active')) {
      loadActivityLog();
      updateAutopilotStatus();
      loadAutopilotStats();
    }
  }, 5000);
  
  window.__autopilotInterval = pollInterval;
});

async function loadActivityLog() {
  try {
    const data = await api.get('/activity-log?limit=50');
    const logs = data.data || [];
    
    const feed = document.getElementById('activity-feed');
    if (logs.length === 0) {
      feed.innerHTML = '<p class="text-center text-gray"><i class="fas fa-clock fa-2x" style="opacity:0.3;"></i><br>No activity yet. Enable Autopilot to see actions.</p>';
      return;
    }
    
    feed.innerHTML = logs.map(l => {
      const icon = getActionIcon(l.action_type);
      const label = getActionLabel(l.action_type);
      const status = l.details?.status || 'completed';
      
      return `
        <div class="activity-entry ${status}">
          <div class="activity-icon">${icon}</div>
          <div class="activity-content">
            <div class="activity-action">${label}</div>
            <div class="activity-detail">${escapeHtml(l.details?.text || JSON.stringify(l.details || ''))}</div>
            <div class="activity-meta">
              <span class="text-small text-gray">${timeAgo(l.timestamp)}</span>
              <span class="label ${status === 'completed' ? 'success' : status === 'failed' ? 'alert' : 'warning'}">${status}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
    
    feed.scrollTop = 0;
  } catch(e) {}
}

async function updateAutopilotStatus() {
  try {
    const s = await api.get('/settings');
    const enabled = s.autopilot_enabled;
    
    const indicator = document.getElementById('autopilot-indicator');
    const text = document.getElementById('autopilot-status-text');
    const card = document.getElementById('autopilot-status-card');
    
    if (enabled) {
      indicator.className = 'autopilot-indicator active';
      text.textContent = 'Autopilot is RUNNING &mdash; AI handling comments automatically';
      card.className = 'callout autopilot-status-card success';
    } else {
      indicator.className = 'autopilot-indicator';
      text.textContent = 'Autopilot is OFF &mdash; Enable from the top bar toggle';
      card.className = 'callout autopilot-status-card warning';
    }
  } catch(e) {}
}

async function loadAutopilotStats() {
  try {
    const logs = await api.get('/activity-log?limit=100');
    const entries = logs.data || [];
    
    document.getElementById('auto-stats-replies').textContent = entries.filter(l => l.action_type === 'reply').length;
    document.getElementById('auto-stats-leads').textContent = entries.filter(l => l.action_type === 'lead_capture').length;
    document.getElementById('auto-stats-spam').textContent = entries.filter(l => l.action_type === 'moderate' && l.details?.status === 'hidden').length;
    document.getElementById('auto-stats-classified').textContent = entries.filter(l => l.action_type === 'classify').length;
  } catch(e) {}
}

function getActionIcon(type) {
  const icons = {
    'reply': '<i class="fas fa-reply" style="color:#1779ba;"></i>',
    'classify': '<i class="fas fa-tag" style="color:#3adb76;"></i>',
    'moderate': '<i class="fas fa-shield-alt" style="color:#ffae00;"></i>',
    'lead_capture': '<i class="fas fa-bullseye" style="color:#3adb76;"></i>',
    'autopilot': '<i class="fas fa-microchip" style="color:#1779ba;"></i>',
    'login': '<i class="fas fa-sign-in-alt" style="color:#767676;"></i>',
    'settings_change': '<i class="fas fa-cog" style="color:#767676;"></i>',
  };
  return icons[type] || '<i class="fas fa-circle" style="color:#767676;"></i>';
}

function getActionLabel(type) {
  const labels = {
    'reply': 'AI Auto-Reply Sent',
    'classify': 'Comment Classified',
    'moderate': 'Moderation Action',
    'lead_capture': 'Lead Captured',
    'autopilot': 'Autopilot Action',
    'login': 'User Login',
    'settings_change': 'Settings Changed',
  };
  return labels[type] || type;
}

window.addEventListener('beforeunload', () => {
  if (window.__autopilotInterval) clearInterval(window.__autopilotInterval);
});
