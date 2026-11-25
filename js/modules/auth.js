import { apiGet, apiPost } from '../services/api.js';
import { clearSession, getAccessToken, saveSession } from '../services/session.js';

export async function signIn(email, password) {
  const result = await apiPost('java', '/api/auth/login', { email: String(email || '').trim(), password }, { auth: false });
  saveSession({ accessToken: result.accessToken, expiresAt: result.expiresAt });
  return result.user;
}

export async function getCurrentUser() {
  if (!getAccessToken()) return null;
  return apiGet('java', '/api/auth/me');
}

export function signOut() {
  clearSession();
}

export function hasSession() {
  return Boolean(getAccessToken());
}
