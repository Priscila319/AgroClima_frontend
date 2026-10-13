import { apiGet, apiPost } from '../services/api.js';

export async function getAuditEvents() {
  return apiGet('java', '/api/audit-events');
}

export async function recordAuditEvent({ action, resource, details = '' }) {
  return apiPost('java', '/api/audit-events', { action, resource, details });
}
