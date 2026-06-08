// Navigation system
let currentPage = 'inbox';
let pageInitializers = {};
let settings = {};
let analyticsCharts = [];

function registerPage(name, initializer) {
  pageInitializers[name] = initializer;
}

function navigate(page) {
  // Close all open modals
  document.querySelectorAll('.modal.is-active').forEach(m => {
    m.classList.remove('is-active');
  });

  // Hide all pages
  document.querySelectorAll('.page').forEach(p => {
    p.classList.remove('active');
    p.classList.remove('page-enter');
  });

  // Show target page with animation
  const pageEl = document.getElementById(`page-${page}`);
  if (pageEl) {
    pageEl.classList.add('active');
    // Trigger reflow then add animation class
    void pageEl.offsetWidth;
    pageEl.classList.add('page-enter');
  }

  // Update sidebar
  document.querySelectorAll('#sidebar-nav li').forEach(li => li.classList.remove('is-active'));
  const navItem = document.querySelector(`#sidebar-nav li[data-page="${page}"]`);
  if (navItem) navItem.classList.add('is-active');

  currentPage = page;

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

// URL hash-based navigation
window.addEventListener('hashchange', () => {
  const page = window.location.hash.replace('#', '') || 'inbox';
  navigate(page);
});

// Initial navigation from hash
const initialPage = window.location.hash.replace('#', '') || 'inbox';
// (auth will call navigate after login)

// Scroll reveal observer
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
    }
  });
}, { threshold: 0.1 });

function observeRevealElements() {
  document.querySelectorAll('.reveal-on-scroll').forEach(el => {
    revealObserver.observe(el);
  });
}

// Count-up animation
function animateCountUp(element, target, duration = 1000) {
  const start = 0;
  const startTime = performance.now();
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(start + (target - start) * eased);
    element.textContent = current.toLocaleString();
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}