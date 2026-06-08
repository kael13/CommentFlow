// Configuration
const API_BASE = window.location.origin + '/api';

// Generic fetch wrapper with auth token
async function apiRequest(method, path, body = null) {
  const token = sessionStorage.getItem('token');
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);
  
  const response = await fetch(`${API_BASE}${path}`, options);
  
  // Handle 429 rate limit
  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After') || 30;
    showToast(`Rate limited. Try again in ${retryAfter}s.`, 'warning');
    throw new Error('RATE_LIMITED');
  }
  
  // Handle 401 - token expired
  if (response.status === 401) {
    const data = await response.json();
    if (data.code === 'TOKEN_EXPIRED' || data.code === 'SESSION_REVOKED') {
      // Try to refresh token
      try {
        const newToken = await firebase.auth().currentUser.getIdToken(true);
        sessionStorage.setItem('token', newToken);
        headers['Authorization'] = `Bearer ${newToken}`;
        const retry = await fetch(`${API_BASE}${path}`, { method, headers, ...(body ? { body: JSON.stringify(body) } : {}) });
        if (retry.ok) return retry.json();
      } catch (e) {
        // Token refresh failed, redirect to login
        window.location.reload();
        throw new Error('SESSION_EXPIRED');
      }
    }
    throw new Error('UNAUTHORIZED');
  }
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Request failed' } }));
    const msg = error?.error?.message || 'Request failed';
    showToast(msg, 'alert');
    throw new Error(msg);
  }
  
  // Handle empty responses
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

// Convenience methods
const api = {
  get: (path) => apiRequest('GET', path),
  post: (path, body) => apiRequest('POST', path, body),
  patch: (path, body) => apiRequest('PATCH', path, body),
  del: (path) => apiRequest('DELETE', path),
};

// Toast notification system
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container') || (() => {
    const c = document.createElement('div');
    c.id = 'toast-container';
    c.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:8px;';
    document.body.appendChild(c);
    return c;
  })();
  
  const toast = document.createElement('div');
  toast.className = `callout ${type} toast`;
  toast.style.cssText = 'min-width:280px;padding:12px 16px;margin:0;animation:slideIn 0.3s ease;box-shadow:0 4px 12px rgba(0,0,0,0.15);';
  toast.innerHTML = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
