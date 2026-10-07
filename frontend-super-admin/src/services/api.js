const API_URL = import.meta.env.VITE_API_URL || '/api';
const ALT_API_URL = 'http://localhost:8081/api';

const request = async (endpoint, options = {}) => {
  const token = localStorage.getItem('superadmin_token');
  
  const headers = {
    ...options.headers,
  };

  // Only set application/json if sending a body and not FormData
  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type'] && options.method && options.method.toUpperCase() !== 'GET') {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  try {
    let response = await fetch(`${API_URL}${endpoint}`, config).catch(() => null);

    if (!response || (!response.ok && response.status !== 401 && response.status !== 403 && response.status !== 404 && response.status !== 400)) {
      const altResp = await fetch(`${ALT_API_URL}${endpoint}`, config).catch(() => null);
      if (altResp) {
        response = altResp;
      }
    }

    if (!response) {
      const isMutation = options.method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method.toUpperCase());
      if (isMutation) {
        throw new Error('Super Admin Network Error: Unable to reach central API server.');
      }
      return null;
    }

    if (response.status >= 500) {
      if (!options.method || options.method.toUpperCase() === 'GET') {
        return null;
      }
      const errText = await response.text().catch(() => '');
      throw new Error(errText || 'Internal Server Error. Please contact super admin.');
    }

    if (response.status === 401) {
      localStorage.removeItem('superadmin_token');
      localStorage.removeItem('superadmin_user');
      window.location.href = '/login';
      return null;
    }

    if (!response.ok) {
      let errorMessage = 'Request failed';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (_e) {
        errorMessage = await response.text().catch(() => errorMessage);
      }
      const err = new Error(errorMessage);
      err.status = response.status;
      throw err;
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/octet-stream')) {
      return await response.blob();
    }

    const responseText = await response.text();
    if (!responseText) {
      return { success: true };
    }

    return JSON.parse(responseText);
  } catch (error) {
    if (error.status !== 401) {
      console.warn('Super Admin API request error:', error.message || error);
    }
    throw error;
  }
};

export const api = {
  get: (endpoint, options) => request(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options) => {
    const isForm = (body instanceof FormData || options?.body instanceof FormData);
    const finalBody = isForm ? (body || options?.body) : (body !== undefined ? JSON.stringify(body) : undefined);
    return request(endpoint, { ...options, method: 'POST', body: finalBody });
  },
  put: (endpoint, body, options) => {
    const isForm = (body instanceof FormData || options?.body instanceof FormData);
    const finalBody = isForm ? (body || options?.body) : (body !== undefined ? JSON.stringify(body) : undefined);
    return request(endpoint, { ...options, method: 'PUT', body: finalBody });
  },
  delete: (endpoint, options) => request(endpoint, { ...options, method: 'DELETE' }),
};

export default api;
