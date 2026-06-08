registerPage('autopilot', async function() {
  const container = document.getElementById('page-autopilot');
  
  container.innerHTML = `
    <div class="columns">
      <div class="column is-12">
        <h5 class="title is-5 mb-1"><span class="icon"><i class="fas fa-microchip"></i></span><span>Autopilot Mode</span></h5>
        <hr class="mt-2">
      </div>

      <div class="column is-4">
        <div class="box" id="autopilot-status-card">
          <article class="media">
            <div class="media-left">
              <span class="icon is-large" id="autopilot-indicator">&#9679;</span>
            </div>
            <div class="media-content">
              <h6 class="title is-6 mb-1">Autopilot Status</h6>
              <p class="is-size-7" id="autopilot-status-text">Checking...</p>
            </div>
          </article>
        </div>

        <div class="box reveal-on-scroll">
          <h6 class="title is-6 mb-4">Autopilot Stats</h6>
          <div class="is-flex is-justify-content-space-between py-2" style="border-bottom:1px solid #f0f0f0;">
            <span class="is-size-7">AI Replies Sent</span>
            <strong id="auto-stats-replies">0</strong>
          </div>
          <div class="is-flex is-justify-content-space-between py-2" style="border-bottom:1px solid #f0f0f0;">
            <span class="is-size-7">Leads Captured</span>
            <strong id="auto-stats-leads">0</strong>
          </div>
          <div class="is-flex is-justify-content-space-between py-2" style="border-bottom:1px solid #f0f0f0;">
            <span class="is-size-7">Spam Hidden</span>
            <strong id="auto-stats-spam">0</strong>
          </div>
          <div class="is-flex is-justify-content-space-between py-2">
            <span class="is-size-7">Comments Classified</span>
            <strong id="auto-stats-classified">0</strong>
          </div>
        </div>

        <div class="box">
          <h6 class="title is-6 mb-3">What Autopilot Does</h6>
          <ul class="is-size-7 ml-4" style="list-style:disc;">
            <li>Classifies every new comment</li>
            <li>Replies to questions &amp; leads</li>
            <li>Captures leads automatically</li>
            <li>Hides spam &amp; toxic content</li>
            <li>Sends notifications</li>
            <li>Tracks viral engagement</li>
          </ul>
        </div>
      </div>

      <div class="column is-8">
        <div class="box">
          <h6 class="title is-6 mb-4"><span class="icon"><i class="fas fa-stream"></i></span><span>Real-time Activity Log</span></h6>
          <div id="activity-feed">
            <div class="has-text-centered py-4 has-text-grey"><span class="icon"><i class="fas fa-spinner fa-pulse"></i></span></div>
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
      feed.innerHTML = '<div class="has-text-centered has-text-grey py-6"><span class="icon is-large has-text-grey-lighter"><i class="fas fa-clock fa-2x"></i></span><p class="mt-2">No activity yet. Enable Autopilot to see actions.</p></div>';
      return;
    }
    
    feed.innerHTML = logs.map(l => {
      const icon = getActionIcon(l.action_type);
      const label = getActionLabel(l.action_type);
      const status = l.details?.status || 'completed';

      return `
        <article class="media reveal-on-scroll py-2" style="border-bottom:1px solid #f0f0f0;">
          <div class="media-left">
            <span class="icon is-small">${icon}</span>
          </div>
          <div class="media-content">
            <p class="is-size-7 mb-1"><strong>${label}</strong></p>
            <p class="is-size-7 has-text-grey mb-1">${escapeHtml(l.details?.text || JSON.stringify(l.details || ''))}</p>
            <p class="is-size-7">
              <small class="has-text-grey">${timeAgo(l.timestamp)}</small>
              <span class="tag ${status === 'completed' ? 'is-success' : status === 'failed' ? 'is-danger' : 'is-warning'} is-small ml-2">${status}</span>
            </p>
          </div>
        </article>
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
      indicator.className = 'icon is-large has-text-success is-pulsing';
      text.textContent = 'Autopilot is RUNNING — AI handling comments automatically';
      card.className = 'box has-background-success-light';
    } else {
      indicator.className = 'icon is-large has-text-grey';
      text.textContent = 'Autopilot is OFF — Enable from the top bar toggle';
      card.className = 'box has-background-warning-light';
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
    'reply': '<i class="fas fa-reply has-text-primary"></i>',
    'classify': '<i class="fas fa-tag has-text-success"></i>',
    'moderate': '<i class="fas fa-shield-alt has-text-warning"></i>',
    'lead_capture': '<i class="fas fa-bullseye has-text-success"></i>',
    'autopilot': '<i class="fas fa-microchip has-text-primary"></i>',
    'login': '<i class="fas fa-sign-in-alt has-text-grey"></i>',
    'settings_change': '<i class="fas fa-cog has-text-grey"></i>',
  };
  return icons[type] || '<i class="fas fa-circle has-text-grey"></i>';
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