import { API_BASE_URLS } from '../config/api.js';
import { clearSession, getAccessToken } from './session.js';

export class ApiError extends Error {
  constructor(status, message, payload = null) {
    super(message || 'A solicitação não pôde ser concluída.');
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
    this.fieldErrors = payload?.fieldErrors || {};
  }
}

function apiPath(service, path) {
  const base = API_BASE_URLS[service];
  if (!base) throw new Error(`Serviço de API desconhecido: ${service}`);
  return `${base}/${String(path).replace(/^\/+/, '')}`;
}

export async function apiRequest(service, path, options = {}) {
  const { method = 'GET', body, auth = true, headers = {}, signal } = options;
  const requestHeaders = new Headers({ Accept: 'application/json', ...headers });
  const token = auth ? getAccessToken() : null;
  if (token) requestHeaders.set('Authorization', `Bearer ${token}`);
  if (body !== undefined) requestHeaders.set('Content-Type', 'application/json');

  let response;
  try {
    response = await fetch(apiPath(service, path), {
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'omit',
      cache: 'no-store',
      signal,
    });
  } catch {
    throw new ApiError(0, 'Não foi possível conectar aos serviços. Verifique se as APIs estão em execução.');
  }

  const contentType = response.headers.get('content-type') || '';
  let payload = null;
  if (response.status !== 204 && contentType.includes('application/json')) {
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
  }
  if (!response.ok) {
    if (response.status === 401 && auth) {
      clearSession();
      if (typeof CustomEvent === 'function') globalThis.dispatchEvent?.(new CustomEvent('agroclima:unauthorized'));
    }
    throw new ApiError(response.status, payload?.message || `A solicitação falhou (${response.status}).`, payload);
  }
  return payload;
}

export const apiGet = (service, path, options = {}) => apiRequest(service, path, options);
export const apiPost = (service, path, body, options = {}) => apiRequest(service, path, { ...options, method: 'POST', body });
export const apiPatch = (service, path, body, options = {}) => apiRequest(service, path, { ...options, method: 'PATCH', body });
export const apiDelete = (service, path, options = {}) => apiRequest(service, path, { ...options, method: 'DELETE' });
