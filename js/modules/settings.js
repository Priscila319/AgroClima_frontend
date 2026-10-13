import { apiGet, apiPatch } from '../services/api.js';
import { DEFAULT_VARIETY } from '../data/varieties.js';

export const DEFAULT_SETTINGS = Object.freeze({
  general: {
    systemName: 'AgroClima Cloud',
    region: 'Petrolina / Juazeiro',
    institutionalInfo: 'Projeto Integrador — Análise e Desenvolvimento de Sistemas',
    defaultVariety: DEFAULT_VARIETY,
  },
  notifications: { climateAlerts: true, systemAlerts: true, emailSummary: false },
  appearance: { theme: 'light' },
  security: {
    strongPasswords: true,
    requireMfa: false,
    notifyNewLogin: false,
    lockAfterFailures: true,
    sessionTimeout: '30',
  },
});

function mergeDefaults(defaults, saved) {
  const result = { ...defaults };
  Object.entries(defaults).forEach(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) result[key] = mergeDefaults(value, saved?.[key] ?? {});
    else if (saved && Object.hasOwn(saved, key)) result[key] = saved[key];
  });
  return result;
}

export function getSettings(saved = {}) {
  const merged = mergeDefaults(DEFAULT_SETTINGS, saved || {});
  if (!['light', 'dark'].includes(merged.appearance.theme)) merged.appearance.theme = 'light';
  return merged;
}

export async function loadSettings() {
  return getSettings(await apiGet('java', '/api/settings'));
}

export async function saveSettings(patch) {
  return getSettings(await apiPatch('java', '/api/settings', patch));
}

export function setSettingPath(target, path, value) {
  const result = structuredClone(target || {});
  const keys = path.split('.');
  let current = result;
  keys.forEach((key, index) => {
    if (index === keys.length - 1) current[key] = value;
    else current = current[key] ||= {};
  });
  return result;
}
