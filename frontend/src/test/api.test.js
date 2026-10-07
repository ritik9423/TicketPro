/**
 * Unit tests for the API service (api.js)
 * Tests: token injection, 401 handling, 403 suspension handling, FormData detection
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch globally before importing api
global.fetch = vi.fn();

// Mock window.location for 401 redirect test
const originalLocation = window.location;
beforeEach(() => {
  delete window.location;
  window.location = { href: '' };
  sessionStorage.clear();
  localStorage.clear();
  vi.resetAllMocks();
});
afterEach(() => {
  window.location = originalLocation;
});

describe('API Service � core request behaviour', () => {
  it('sends GET with Authorization header when token exists', async () => {
    sessionStorage.setItem('token', 'test-token-123');
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ success: true }),
    });

    const { api } = await import('../services/api.js');
    const result = await api.get('/test');

    expect(fetch).toHaveBeenCalledOnce();
    const callArgs = fetch.mock.calls[0][1];
    expect(callArgs.headers['Authorization']).toBe('Bearer test-token-123');
    expect(result).toEqual({ success: true });
  });

  it('clears token and redirects on 401 Unauthorized', async () => {
    sessionStorage.setItem('token', 'expired-token');
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    const { api } = await import('../services/api.js');
    await api.get('/secure-endpoint');

    expect(sessionStorage.getItem('token')).toBeNull();
    expect(window.location.href).toBe('/login');
  });

  it('returns null for 204 No Content responses', async () => {
    sessionStorage.setItem('token', 'valid-token');
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
      headers: { get: () => null },
    });

    const { api } = await import('../services/api.js');
    const result = await api.delete('/resource/1');
    expect(result).toBeNull();
  });

  it('does NOT set Content-Type for FormData bodies', async () => {
    sessionStorage.setItem('token', 'valid-token');
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ uploaded: true }),
    });

    const { api } = await import('../services/api.js');
    const formData = new FormData();
    formData.append('file', new Blob(['test']), 'test.txt');
    await api.post('/upload', formData);

    const callArgs = fetch.mock.calls[0][1];
    expect(callArgs.headers['Content-Type']).toBeUndefined();
  });
});

describe('API Service � error handling', () => {
  it('throws error with message from server JSON on non-ok response', async () => {
    sessionStorage.setItem('token', 'valid-token');
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ message: 'Validation failed: email required' }),
    });

    const { api } = await import('../services/api.js');
    await expect(api.post('/tickets', { title: '' })).rejects.toThrow('Validation failed: email required');
  });

  it('throws network error for mutations when both URLs unreachable', async () => {
    sessionStorage.setItem('token', 'valid-token');
    global.fetch.mockResolvedValue(null).mockImplementation(() => Promise.reject(new Error('ECONNREFUSED')));

    const { api } = await import('../services/api.js');
    await expect(api.post('/tickets', { title: 'test' })).rejects.toThrow();
  });
});
