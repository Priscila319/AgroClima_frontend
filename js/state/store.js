import { DEFAULT_VARIETY } from '../data/varieties.js';
import { ROLES } from '../config/roles.js';
import { DEFAULT_SETTINGS } from '../modules/settings.js';
import { DEFAULT_RBAC } from '../modules/access-control.js';

const initialState = () => ({
  authenticated: false,
  authMode: 'login',
  authMessage: '',
  authBusy: false,
  booting: false,
  email: '',
  role: ROLES.PRODUCER,
  roleKey: 'PRODUCER',
  user: null,
  page: null,
  variety: DEFAULT_SETTINGS.general.defaultVariety || DEFAULT_VARIETY,
  varieties: [],
  menuOpen: false,
  theme: DEFAULT_SETTINGS.appearance.theme,
  settings: DEFAULT_SETTINGS,
  settingsSection: 'Geral',
  plantations: [],
  plantationHistory: [],
  users: [],
  rbac: DEFAULT_RBAC,
  auditLogs: [],
  dashboard: null,
  analystDashboard: null,
  climate: null,
  market: null,
  forecast: null,
  comparison: null,
  quality: null,
  integrationStatus: null,
  pageLoading: false,
  pageError: '',
  dataErrors: [],
  logSearch: '',
  logStatus: 'Todos',
  logResource: 'Todos',
  logSort: 'newest',
  expandedLogId: null,
  designMessage: '',
  modelMessage: '',
  producerMessage: '',
  settingsMessage: '',
  rbacMessage: '',
});

let state = initialState();
const listeners = new Set();

export const getState = () => state;

export function setState(patch) {
  const changedKeys = Object.keys(patch).filter((key) => state[key] !== patch[key]);
  if (!changedKeys.length) return;
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener(state, changedKeys));
}

export const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const resetState = () => setState({ ...initialState() });
