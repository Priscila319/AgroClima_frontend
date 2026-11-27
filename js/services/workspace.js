import { apiGet } from './api.js';
import { mergeUserIntoSnapshot, setRbacSnapshot, normalizeRbacSnapshot, snapshotForUser } from '../modules/access-control.js';
import { climatePathForPeriod } from '../config/periods.js';

const ROLE_LABELS = { PRODUCER: 'Produtor/Exportador', ANALYST: 'Analista de Dados', ADMIN: 'Administrador' };

export function roleLabel(roleKey) {
  return ROLE_LABELS[String(roleKey || '').toUpperCase()] || 'Produtor/Exportador';
}

export function normalizeUser(user) {
  const roleKey = String(user?.roleKey || 'PRODUCER').toUpperCase();
  return {
    ...user,
    id: String(user?.id || ''),
    name: user?.name || user?.fullName || user?.email || 'Usuário',
    roleKey,
    role: ROLE_LABELS[roleKey] || user?.role || roleKey,
    status: user?.status || 'Bloqueado',
  };
}

export async function loadWorkspaceData(user) {
  // Cada recurso só é solicitado quando o usuário tem a permissão correspondente.
  // As permissões vêm da API (login/me); a API revalida cada endpoint de qualquer forma.
  const permissions = new Set(Array.isArray(user?.permissionKeys) ? user.permissionKeys : []);
  const can = (key) => permissions.has(key);
  const result = {};
  const requests = [
    ['varieties', () => apiGet('java', '/api/varieties')],
    // Identidade visual, tema e design tokens: disponíveis a qualquer usuário autenticado.
    // Quem tem settings.manage recebe o documento completo; os demais, a visão pública.
    ['settings', () => apiGet('java', can('settings.manage') ? '/api/settings' : '/api/settings/public')],
  ];
  if (can('plantations.manage') || can('plantations.read.all')) requests.push(['plantations', () => apiGet('java', '/api/plantations')]);
  if (can('users.manage')) requests.push(['users', () => apiGet('java', '/api/users')]);
  if (can('rbac.manage')) {
    requests.push(
      ['roles', () => apiGet('java', '/api/roles')],
      ['permissions', () => apiGet('java', '/api/permissions')],
    );
  }
  if (can('logs.read')) requests.push(['auditLogs', () => apiGet('java', '/api/audit-events')]);
  const responses = await Promise.allSettled(requests.map(([, load]) => load()));
  const errors = [];
  responses.forEach((response, index) => {
    const key = requests[index][0];
    if (response.status === 'fulfilled') result[key] = response.value;
    else errors.push({ resource: key, message: response.reason?.message || 'Não foi possível carregar os dados.' });
  });
  result.users = (result.users || []).map(normalizeUser);
  if (result.roles && result.permissions) {
    result.rbac = normalizeRbacSnapshot({ users: result.users, roles: result.roles, permissions: result.permissions });
  } else {
    result.rbac = snapshotForUser(normalizeUser(user));
  }
  result.rbac = mergeUserIntoSnapshot(result.rbac, normalizeUser(user));
  setRbacSnapshot(result.rbac);
  result.dataErrors = errors;
  return result;
}

export async function loadPageData(page, roleKey, permissionKeys = []) {
  const key = String(roleKey || '').toUpperCase();
  const permissions = new Set(Array.isArray(permissionKeys) ? permissionKeys : []);
  const requests = [];
  const add = (name, service, path) => requests.push([name, () => apiGet(service, path)]);
  if (page === 'Histórico' || page === 'Relatórios') add('plantationHistory', 'java', '/api/plantations/history');
  if (page === 'Relatórios' && key === 'ANALYST') add('analystDashboard', 'python', '/api/v1/dashboard/analyst');
  if (['Visão Geral', 'Dashboard Analítico', 'Dashboard Admin'].includes(page)) {
    if (page === 'Dashboard Analítico') add('analystDashboard', 'python', '/api/v1/dashboard/analyst');
    else add('dashboard', 'python', '/api/v1/dashboard/summary');
  }
  if (['Monitoramento', 'Dados Climáticos'].includes(page)) add('climate', 'python', '/api/v1/climate/current');
  if (page === 'Previsões') add('forecast', 'python', '/api/v1/dashboard/forecast');
  if (page === 'Modelos Preditivos') {
    add('forecast', 'python', '/api/v1/models/forecast');
    add('modelStatus', 'python', '/api/v1/models/status');
    if (permissions.has('plantations.manage') || permissions.has('plantations.read.all')) {
      add('agronomy', 'python', '/api/v1/agronomy/plantations');
    }
  }
  if (['Mercado e Exportação', 'Dados de Mercado'].includes(page)) {
    add('market', 'python', '/api/v1/dashboard/market');
    add('grapePrices', 'python', '/api/v1/market/grape-prices');
    add('grapeProduction', 'python', '/api/v1/market/grape-production-value');
    add('exportValue', 'python', '/api/v1/market/export-value');
  }
  if (['Comparação', 'Análise Comparativa'].includes(page)) add('comparison', 'python', '/api/v1/dashboard/comparison');
  if (page === 'Qualidade dos Dados') {
    add('quality', 'python', '/api/v1/dashboard/quality');
    add('climate', 'python', '/api/v1/climate/current');
  }
  if (page === 'Integrações' && key === 'ADMIN') {
    add('integrationStatus', 'python', '/api/v1/integrations/thingspeak/status');
    add('pythonHealth', 'python', '/health');
  }
  const responses = await Promise.allSettled(requests.map(([, load]) => load()));
  const data = {};
  const errors = [];
  responses.forEach((response, index) => {
    if (response.status === 'fulfilled') data[requests[index][0]] = response.value;
    else errors.push({ resource: requests[index][0], message: response.reason?.message || 'Não foi possível carregar os dados.' });
  });
  return { ...data, pageErrors: errors };
}
