// Navigation system
let currentPage = 'inbox';
let pageInitializers = {};
let settings = {};
let analyticsCharts = [];

function registerPage(name, initializer) {
  pageInitializers[name] = initializer;
}

function navigate(page) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  
  // Show target page
  const pageEl = document.getElementById(`page-${page}`);
  if (pageEl) pageEl.classList.add('active');
  
  // Update sidebar
  document.querySelectorAll('#sidebar-nav li').forEach(li => li.classList.remove('active'));
  const navItem = document.querySelector(`#sidebar-nav li[data-page="${page}"]`);
  if (navItem) navItem.classList.add('active');
  
  currentPage = page;
  
  // Call initializer if exists
  if (pageInitializers[page]) {
    pageInitializers[page]();
  }
}

// Sidebar navigation
document.querySelectorAll('#sidebar-nav li[data-page]').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    navigate(item.dataset.page);
  });
});

// Load user settings
async function loadSettings() {
  try {
    settings = await api.get('/settings');
    // Apply autopilot state
    if (settings.autopilot_enabled) {
      document.getElementById('autopilot-switch').checked = true;
    }
  } catch (e) {
    // Default settings
    settings = {
      tone: 'professional',
      automation_level: 'manual',
      spam_strictness: 5,
      auto_reply_enabled: false,
      lead_capture_enabled: true,
      autopilot_enabled: false,
    };
  }
}

// Autopilot toggle
document.getElementById('autopilot-switch').addEventListener('change', async (e) => {
  const enabled = e.target.checked;
  try {
    await api.patch('/settings', { autopilot_enabled: enabled });
    settings.autopilot_enabled = enabled;
    showToast(`Autopilot ${enabled ? 'enabled' : 'disabled'}`, enabled ? 'success' : 'warning');
    if (enabled) navigate('autopilot');
  } catch (err) {
    e.target.checked = !enabled;
  }
});

// Autopilot polling
let autopilotPollInterval = null;
function initAutopilotPolling() {
  if (autopilotPollInterval) clearInterval(autopilotPollInterval);
  
  autopilotPollInterval = setInterval(async () => {
    if (settings.autopilot_enabled && currentPage === 'autopilot') {
      // Refresh autopilot activity log
      const pageInit = pageInitializers['autopilot'];
      if (pageInit) pageInit();
    }
  }, 5000);
}

// Initialize Foundation
$(document).foundation();

// URL hash-based navigation
window.addEventListener('hashchange', () => {
  const page = window.location.hash.replace('#', '') || 'inbox';
  navigate(page);
});

// Initial navigation from hash
const initialPage = window.location.hash.replace('#', '') || 'inbox';
// (auth will call navigate after login)
