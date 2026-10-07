const API_URL = import.meta.env.VITE_API_URL || '/api';
const ALT_API_URL = 'http://localhost:8081/api';

const cloneFormData = (body) => {
  if (body instanceof FormData) {
    const clone = new FormData();
    for (const [key, value] of body.entries()) {
      if (value instanceof File) {
        clone.append(key, value, value.name);
      } else {
        clone.append(key, value);
      }
    }
    return clone;
  }
  return body;
};

const request = async (endpoint, options = {}) => {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  
  const headers = {
    ...options.headers,
  };

  // Only set application/json if sending a body and not FormData
  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = 'Bearer ' + token;
  }

  const config = {
    ...options,
    headers,
  };

  try {
    let response = await fetch(API_URL + endpoint, config).catch(() => null);
    
    // Auto-fallback to direct backend URL if proxy is not handling or port is unreachable
    if (!response || (!response.ok && response.status !== 401 && response.status !== 403 && response.status !== 404 && response.status !== 400)) {
      const fallbackConfig = {
        ...config,
        body: cloneFormData(options.body),
      };
      const altResp = await fetch(ALT_API_URL + endpoint, fallbackConfig).catch(() => null);
      if (altResp) {
        response = altResp;
      }
    }

    if (!response) {
      const isMutation = options.method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method.toUpperCase());
      if (isMutation) {
        throw new Error('Network error: Unable to reach backend server.');
      }
      return null;
    }
    
    // Handle 500 Internal Server Error safely for GET endpoints without crashing UI
    if (response.status >= 500) {
      if (!options.method || options.method.toUpperCase() === 'GET') {
        return null;
      }
      const errText = await response.text().catch(() => '');
      let errJson = null;
      try { errJson = JSON.parse(errText); } catch (_e) {}
      throw new Error(errJson?.message || errText || 'Internal Server Error. Please check server logs.');
    }

    // Handle 403 Forbidden (Instant Company Suspension / User Block Kill-Switch)
    if (response.status === 403) {
      const errorData = await response.json().catch(() => ({}));
      const reason = errorData.error || 'FORBIDDEN';
      const message = errorData.message || errorData.error || 'Access denied. Your company account may be suspended.';
      
      if (reason === 'COMPANY_SUSPENDED' || reason === 'ACCOUNT_BLOCKED') {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        window.dispatchEvent(new CustomEvent('COMPANY_STATUS_CHANGED', {
          detail: { status: 'SUSPENDED', message: message }
        }));
      }
      
      throw new Error(message);
    }

    if (response.status === 401) {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return null;
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || ('HTTP error! status: ' + response.status));
    }

    // Return null for 204 No Content
    if (response.status === 204) {
      return null;
    }

    // Handle binary / file download responses (Blob)
    const contentType = response.headers.get('content-type') || '';
    if (
      contentType.includes('application/octet-stream') ||
      contentType.includes('application/pdf') ||
      contentType.includes('application/vnd') ||
      contentType.includes('spreadsheet')
    ) {
      return await response.blob();
    }

    if (contentType.includes('application/json')) {
      return await response.json();
    }
    return await response.text();
  } catch (error) {
    console.error('API request failed: ' + endpoint, error);
    throw error;
  }
};

export const api = {
  get: (endpoint, options) => request(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options) => {
    const isForm = body instanceof FormData || options?.body instanceof FormData;
    const finalBody = isForm ? (body || options?.body) : (body !== undefined ? JSON.stringify(body) : undefined);
    return request(endpoint, { ...options, method: 'POST', body: finalBody });
  },
  put: (endpoint, body, options) => {
    const isForm = body instanceof FormData || options?.body instanceof FormData;
    const finalBody = isForm ? (body || options?.body) : (body !== undefined ? JSON.stringify(body) : undefined);
    return request(endpoint, { ...options, method: 'PUT', body: finalBody });
  },
  delete: (endpoint, options) => request(endpoint, { ...options, method: 'DELETE' }),
};

export default api;
