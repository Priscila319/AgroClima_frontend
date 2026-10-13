import { apiGet } from './api.js';
import { setRbacSnapshot, normalizeRbacSnapshot } from '../modules/access-control.js';

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
  const roleKey = String(user?.roleKey || '').toUpperCase();
  const result = {};
  const requests = [
    ['plantations', () => apiGet('java', '/api/plantations')],
    ['varieties', () => apiGet('java', '/api/varieties')],
  ];
  if (roleKey === 'ADMIN') {
    requests.push(
      ['users', () => apiGet('java', '/api/users')],
      ['roles', () => apiGet('java', '/api/roles')],
      ['permissions', () => apiGet('java', '/api/permissions')],
      ['settings', () => apiGet('java', '/api/settings')],
      ['auditLogs', () => apiGet('java', '/api/audit-events')],
    );
  }
  const responses = await Promise.allSettled(requests.map(([, load]) => load()));
  const errors = [];
  responses.forEach((response, index) => {
    const key = requests[index][0];
    if (response.status === 'fulfilled') result[key] = response.value;
    else errors.push({ resource: key, message: response.reason?.message || 'Não foi possível carregar os dados.' });
  });
  result.users = (result.users || []).map(normalizeUser);
  if (roleKey === 'ADMIN' && result.roles && result.permissions) {
    result.rbac = normalizeRbacSnapshot({ users: result.users, roles: result.roles, permissions: result.permissions });
    setRbacSnapshot(result.rbac);
  } else {
    result.rbac = normalizeRbacSnapshot({ users: [normalizeUser(user)] });
    setRbacSnapshot(result.rbac);
  }
  result.dataErrors = errors;
  return result;
}

export async function loadPageData(page, roleKey) {
  const key = String(roleKey || '').toUpperCase();
  const requests = [];
  const add = (name, service, path) => requests.push([name, () => apiGet(service, path)]);
  if (page === 'Histórico' || page === 'Relatórios') add('plantationHistory', 'java', '/api/plantations/history');
  if (page === 'Relatórios' && key === 'ANALYST') add('analystDashboard', 'python', '/api/v1/dashboard/analyst');
  if (['Visão Geral', 'Dashboard Analítico', 'Dashboard Admin'].includes(page)) {
    if (page === 'Dashboard Analítico') add('analystDashboard', 'python', '/api/v1/dashboard/analyst');
    else add('dashboard', 'python', '/api/v1/dashboard/summary');
  }
  if (['Monitoramento', 'Dados Climáticos'].includes(page)) add('climate', 'python', '/api/v1/climate/current');
  if (['Previsões', 'Modelos Preditivos'].includes(page)) add('forecast', 'python', '/api/v1/dashboard/forecast');
  if (['Mercado e Exportação', 'Dados de Mercado'].includes(page)) add('market', 'python', '/api/v1/dashboard/market');
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
