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

let analyticsCharts = [];

function formatDuration(seconds) {
  if (!seconds) return 'N/A';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds/60)}m ${Math.round(seconds%60)}s`;
  return `${Math.floor(seconds/3600)}h`;
}

registerPage('analytics', async function() {
  const container = document.getElementById('page-analytics');
  
  container.innerHTML = `
    <div class="columns">
      <div class="column is-12">
        <h5 class="title is-5 mb-1"><span class="icon"><i class="fas fa-chart-bar"></i></span><span>Analytics Dashboard</span></h5>
        <hr class="mt-2">
      </div>

      <div class="column is-3">
        <div class="box has-background-primary-light reveal-on-scroll">
          <div class="is-flex is-justify-content-space-between is-align-items-center mb-2">
            <span class="title is-3 mb-0 has-text-primary" id="stat-total-comments">-</span>
            <span class="icon is-medium has-text-primary"><i class="fas fa-comments fa-lg"></i></span>
          </div>
          <p class="subtitle is-7 mb-0 has-text-grey">Total Comments</p>
        </div>
      </div>
      <div class="column is-3">
        <div class="box has-background-success-light reveal-on-scroll">
          <div class="is-flex is-justify-content-space-between is-align-items-center mb-2">
            <span class="title is-3 mb-0 has-text-success" id="stat-total-leads">-</span>
            <span class="icon is-medium has-text-success"><i class="fas fa-bullseye fa-lg"></i></span>
          </div>
          <p class="subtitle is-7 mb-0 has-text-grey">Leads Captured</p>
        </div>
      </div>
      <div class="column is-3">
        <div class="box has-background-warning-light reveal-on-scroll">
          <div class="is-flex is-justify-content-space-between is-align-items-center mb-2">
            <span class="title is-3 mb-0 has-text-warning-dark" id="stat-avg-response">-</span>
            <span class="icon is-medium has-text-warning-dark"><i class="fas fa-clock fa-lg"></i></span>
          </div>
          <p class="subtitle is-7 mb-0 has-text-grey">Avg Response Time</p>
        </div>
      </div>
      <div class="column is-3">
        <div class="box has-background-info-light reveal-on-scroll">
          <div class="is-flex is-justify-content-space-between is-align-items-center mb-2">
            <span class="title is-3 mb-0 has-text-info" id="stat-sentiment">-</span>
            <span class="icon is-medium has-text-info"><i class="fas fa-smile fa-lg"></i></span>
          </div>
          <p class="subtitle is-7 mb-0 has-text-grey">Sentiment Score</p>
        </div>
      </div>

      <div class="column is-8">
        <div class="box reveal-on-scroll">
          <h6 class="title is-6 mb-4">Comments Over Time</h6>
          <canvas id="timeline-chart" height="250"></canvas>
        </div>
      </div>
      <div class="column is-4">
        <div class="box reveal-on-scroll">
          <h6 class="title is-6 mb-4">Sentiment Breakdown</h6>
          <canvas id="sentiment-chart" height="250"></canvas>
        </div>
      </div>

      <div class="column is-6">
        <div class="box reveal-on-scroll">
          <h6 class="title is-6 mb-4">Intent Breakdown</h6>
          <canvas id="intent-chart" height="200"></canvas>
        </div>
      </div>
      <div class="column is-6">
        <div class="box reveal-on-scroll">
          <h6 class="title is-6 mb-4">Lead Conversion</h6>
          <canvas id="lead-chart" height="200"></canvas>
        </div>
      </div>

      <div class="column is-12">
        <div class="box">
          <h6 class="title is-6 mb-4">Weekly Trend</h6>
          <table class="table is-hoverable is-fullwidth" id="weekly-table">
            <thead><tr><th>Day</th><th>Comments</th><th>Leads</th><th>Positive</th><th>Negative</th></tr></thead>
            <tbody id="weekly-tbody"></tbody>
          </table>
        </div>
      </div>
    </div>
  `;
  
  // Destroy previous charts
  analyticsCharts.forEach(c => c.destroy());
  analyticsCharts = [];
  
  try {
    const overview = await api.get('/analytics/overview');
    
    document.getElementById('stat-total-comments').textContent = overview.totalComments || 0;
    document.getElementById('stat-total-leads').textContent = overview.totalLeads || 0;
    document.getElementById('stat-avg-response').textContent = overview.avgResponseTime ? formatDuration(overview.avgResponseTime) : 'N/A';
    
    const sentiment = overview.sentimentBreakdown || {};
    const totalSentiment = sentiment.positive + sentiment.neutral + sentiment.negative || 1;
    const score = Math.round(((sentiment.positive || 0) / totalSentiment) * 100);
    document.getElementById('stat-sentiment').textContent = `${score}%`;
    
    // After loading stats, animate count-up
    const statElements = document.querySelectorAll('#stat-total-comments, #stat-total-leads, #stat-avg-response, #stat-sentiment');
    statElements.forEach(el => {
      const target = parseInt(el.textContent) || 0;
      if (target > 0 && typeof animateCountUp === 'function') {
        animateCountUp(el, target);
      }
    });
    
    // Timeline chart
    const timelineData = await api.get('/analytics/timeline?period=day&days=14');
    const tlCtx = document.getElementById('timeline-chart').getContext('2d');
    const tlChart = new Chart(tlCtx, {
      type: 'line',
      data: {
        labels: (timelineData || []).map(d => d.date),
        datasets: [{
          label: 'Comments',
          data: (timelineData || []).map(d => d.count),
          borderColor: '#1779ba',
          backgroundColor: 'rgba(23,121,186,0.1)',
          fill: true,
          tension: 0.4,
        }]
      },
      options: { responsive: true, plugins: { legend: { display: false } } }
    });
    analyticsCharts.push(tlChart);
    
    // Sentiment donut chart
    const sentimentCtx = document.getElementById('sentiment-chart').getContext('2d');
    const sChart = new Chart(sentimentCtx, {
      type: 'doughnut',
      data: {
        labels: ['Positive', 'Neutral', 'Negative'],
        datasets: [{
          data: [sentiment.positive || 0, sentiment.neutral || 0, sentiment.negative || 0],
          backgroundColor: ['#3adb76', '#ffae00', '#cc4b37'],
        }]
      },
      options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });
    analyticsCharts.push(sChart);
    
    // Intent breakdown chart
    const intent = overview.intentBreakdown || {};
    const intentCtx = document.getElementById('intent-chart').getContext('2d');
    const iChart = new Chart(intentCtx, {
      type: 'bar',
      data: {
        labels: Object.keys(intent),
        datasets: [{
          data: Object.values(intent),
          backgroundColor: ['#3adb76', '#1779ba', '#cc4b37', '#ffae00', '#2c3e50'],
        }]
      },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });
    analyticsCharts.push(iChart);
    
    // Lead chart
    const leadTimeline = await api.get('/analytics/timeline/leads?period=day&days=7');
    const leadCtx = document.getElementById('lead-chart').getContext('2d');
    const lChart = new Chart(leadCtx, {
      type: 'line',
      data: {
        labels: (leadTimeline || []).map(d => d.date),
        datasets: [{
          label: 'Leads',
          data: (leadTimeline || []).map(d => d.count),
          borderColor: '#3adb76',
          backgroundColor: 'rgba(58,219,118,0.1)',
          fill: true,
          tension: 0.4,
        }]
      },
      options: { responsive: true, plugins: { legend: { display: false } } }
    });
    analyticsCharts.push(lChart);
    
    // Weekly trend table
    const trendHtml = (timelineData || []).slice(-7).map(d => `
      <tr>
        <td>${d.date}</td>
        <td>${d.count}</td>
        <td>${d.leads || 0}</td>
        <td>${d.positive || 0}</td>
        <td>${d.negative || 0}</td>
      </tr>
    `).join('');
    document.getElementById('weekly-tbody').innerHTML = trendHtml || '<tr><td colspan="5" class="has-text-centered">No data</td></tr>';
    
  } catch(e) {
    showToast('Failed to load analytics', 'alert');
  }
});
