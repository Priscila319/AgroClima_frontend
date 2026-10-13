import { apiDelete, apiGet, apiPatch, apiPost } from '../services/api.js';

export const PLANTATION_STATUSES = Object.freeze({ GROWING: 'Em cultivo', HARVESTED: 'Colhida', ARCHIVED: 'Arquivada' });

export const getPlantations = () => apiGet('java', '/api/plantations');
export const getPlantationHistory = () => apiGet('java', '/api/plantations/history');

export function createPlantation({ variety, quantity, field = '', notes = '' }) {
  return apiPost('java', '/api/plantations', {
    variety: String(variety || '').trim(),
    quantity: Number(quantity),
    field: String(field || '').trim(),
    notes: String(notes || '').trim(),
  });
}

export function updatePlantation(id, { variety, quantity, field = '', notes = '' }) {
  return apiPatch('java', `/api/plantations/${encodeURIComponent(id)}`, {
    variety: String(variety || '').trim(),
    quantity: Number(quantity),
    field: String(field || '').trim(),
    notes: String(notes || '').trim(),
  });
}

export function recordHarvest(id) {
  return apiPost('java', `/api/plantations/${encodeURIComponent(id)}/harvest`, {});
}

export function archivePlantation(id) {
  return apiDelete('java', `/api/plantations/${encodeURIComponent(id)}`);
}
