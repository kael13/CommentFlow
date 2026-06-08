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

registerPage('leads', async function() {
  const container = document.getElementById('page-leads');
  
  container.innerHTML = `
    <div class="grid-x grid-margin-x">
      <div class="cell small-12">
        <h5><i class="fas fa-bullseye"></i> Lead Capture</h5>
        <hr>
      </div>
      <div class="cell small-12">
        <div class="callout">
          <div class="grid-x grid-margin-x align-middle">
            <div class="cell small-4">
              <div class="input-group">
                <input class="input-group-field" type="search" id="leads-search" placeholder="Search leads...">
              </div>
            </div>
            <div class="cell small-2">
              <select id="leads-status-filter">
                <option value="">All Status</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="converted">Converted</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div class="cell small-3">
              <button class="button secondary" id="export-csv-btn"><i class="fas fa-file-csv"></i> Export CSV</button>
              <button class="button secondary" id="export-sheets-btn"><i class="fas fa-table"></i> Google Sheets</button>
            </div>
            <div class="cell small-3">
              <div class="stat lead-stats" id="lead-stats-bar">
                <span class="stat-new">New: 0</span>
                <span class="stat-contacted">Contacted: 0</span>
                <span class="stat-converted">Converted: 0</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="cell small-12">
        <table class="hover" id="leads-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Product Interest</th>
              <th>Source</th>
              <th>Status</th>
              <th>Captured</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="leads-table-body">
            <tr><td colspan="6" class="text-center"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>
          </tbody>
        </table>
        <div class="pagination-controls" id="leads-pagination"></div>
      </div>
    </div>
  `;
  
  let currentPage = 1;
  
  async function loadLeads(page = 1) {
    const search = document.getElementById('leads-search').value;
    const status = document.getElementById('leads-status-filter').value;
    
    try {
      let url = `/leads?limit=20&page=${page}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (status) url += `&status=${status}`;
      
      const data = await api.get(url);
      const leads = data.data || [];
      
      const tbody = document.getElementById('leads-table-body');
      tbody.innerHTML = leads.map(l => `
        <tr>
          <td><strong>${escapeHtml(l.name)}</strong></td>
          <td>${escapeHtml(l.product_interest || '-')}</td>
          <td><span class="label secondary">${l.source || 'comment'}</span></td>
          <td><span class="label lead-status-${l.status}">${l.status}</span></td>
          <td class="text-small">${timeAgo(l.captured_at)}</td>
          <td>
            <button class="button tiny primary" onclick="viewLead('${l.id}')"><i class="fas fa-eye"></i></button>
            <button class="button tiny success" onclick="updateLeadStatus('${l.id}', 'contacted')"><i class="fas fa-check"></i></button>
            <button class="button tiny warning" onclick="updateLeadStatus('${l.id}', 'converted')"><i class="fas fa-trophy"></i></button>
          </td>
        </tr>
      `).join('');
      
      // Update stats
      const stats = data.stats || {};
      document.querySelector('.stat-new').textContent = `New: ${stats.new || 0}`;
      document.querySelector('.stat-contacted').textContent = `Contacted: ${stats.contacted || 0}`;
      document.querySelector('.stat-converted').textContent = `Converted: ${stats.converted || 0}`;
      
      // Pagination
      const totalPages = Math.ceil((data.total || 0) / 20);
      renderPagination('leads-pagination', totalPages, page, loadLeads);
      currentPage = page;
    } catch(e) {
      document.getElementById('leads-table-body').innerHTML = '<tr><td colspan="6" class="text-center text-gray">Failed to load leads</td></tr>';
    }
  }
  
  loadLeads();
  
  document.getElementById('leads-search').addEventListener('input', debounce(() => loadLeads(1), 300));
  document.getElementById('leads-status-filter').addEventListener('change', () => loadLeads(1));
  document.getElementById('export-csv-btn').addEventListener('click', () => window.open(`${API_BASE}/leads/export/csv`, '_blank'));
  document.getElementById('export-sheets-btn').addEventListener('click', async () => {
    try {
      await api.post('/leads/export/sheets', {});
      showToast('Exported to Google Sheets!', 'success');
    } catch(e) {}
  });
});

function viewLead(id) {
  api.get(`/leads/${id}`).then(lead => {
    document.getElementById('lead-detail-content').innerHTML = `
      <p><strong>Name:</strong> ${escapeHtml(lead.name)}</p>
      <p><strong>Product Interest:</strong> ${escapeHtml(lead.product_interest || '-')}</p>
      <p><strong>Status:</strong> <span class="label lead-status-${lead.status}">${lead.status}</span></p>
      <p><strong>Captured:</strong> ${timeAgo(lead.captured_at)}</p>
      ${lead.notes ? `<p><strong>Notes:</strong> ${escapeHtml(lead.notes)}</p>` : ''}
      <hr>
      <button class="button small success" onclick="updateLeadStatus('${lead.id}','contacted');$('#lead-modal').foundation('close')"><i class="fas fa-check"></i> Mark Contacted</button>
      <button class="button small warning" onclick="updateLeadStatus('${lead.id}','converted');$('#lead-modal').foundation('close')"><i class="fas fa-trophy"></i> Mark Converted</button>
    `;
    $('#lead-modal').foundation('open');
  }).catch(() => showToast('Failed to load lead', 'alert'));
}

async function updateLeadStatus(id, status) {
  try {
    await api.patch(`/leads/${id}`, { status });
    showToast(`Lead marked as ${status}`, 'success');
    // Re-trigger page load
    const pageInit = pageInitializers['leads'];
    if (pageInit) pageInit();
  } catch(e) {}
}
