import test from 'node:test';
import assert from 'node:assert/strict';
import { loadWorkspaceData, normalizeUser } from '../js/services/workspace.js';
import { getRbacSnapshot } from '../js/modules/access-control.js';
import { ROLES } from '../js/config/roles.js';

const PRODUCER_KEYS = ['overview.view', 'plantations.manage', 'monitoring.view', 'analytics.view', 'reports.view'];
const ADMIN_KEYS = [
  'overview.view', 'plantations.manage', 'plantations.read.all', 'monitoring.view', 'analytics.view',
  'reports.view', 'users.manage', 'rbac.manage', 'security.manage', 'logs.read', 'settings.manage',
  'design.manage', 'integrations.manage', 'models.manage',
];

const producer = normalizeUser({ id: 'u1', name: 'Mariana', email: 'm@a.test', roleKey: 'PRODUCER', status: 'ACTIVE', permissionKeys: PRODUCER_KEYS });
const admin = normalizeUser({ id: 'u2', name: 'Carlos', email: 'c@a.test', roleKey: 'ADMIN', status: 'ACTIVE', permissionKeys: ADMIN_KEYS });

function mockFetch(routes) {
  const calls = [];
  globalThis.fetch = async (url) => {
    const path = String(url);
    calls.push(path);
    const key = Object.keys(routes).find((suffix) => path.endsWith(suffix));
    const payload = key ? routes[key] : [];
    return {
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => payload,
    };
  };
  return calls;
}

test('produtor carrega visão pública de settings e snapshot das próprias permissões', async () => {
  const calls = mockFetch({
    '/api/settings/public': { general: { systemName: 'AgroClima' }, appearance: { theme: 'dark' }, design: { light: { primary: '#7c3d67' } } },
    '/api/varieties': [],
    '/api/plantations': [],
  });
  const result = await loadWorkspaceData(producer);
  assert.ok(calls.some((path) => path.endsWith('/api/settings/public')), 'deveria usar a visão pública');
  assert.ok(!calls.some((path) => path.endsWith('/api/settings')), 'não pode ler settings completo sem settings.manage');
  assert.ok(!calls.some((path) => path.endsWith('/api/users')), 'não pode listar usuários sem users.manage');
  assert.ok(!calls.some((path) => path.endsWith('/api/roles')), 'não pode ler catálogo RBAC sem rbac.manage');
  assert.ok(!calls.some((path) => path.endsWith('/api/audit-events')), 'não pode ler auditoria sem logs.read');
  assert.deepEqual(getRbacSnapshot().rolePermissions[ROLES.PRODUCER], PRODUCER_KEYS);
  assert.equal(result.settings.design.light.primary, '#7c3d67');
});

test('produtor sem permissão de plantações não chama o endpoint', async () => {
  const reduced = normalizeUser({ ...producer, permissionKeys: ['overview.view', 'monitoring.view'] });
  const calls = mockFetch({ '/api/settings/public': {}, '/api/varieties': [] });
  await loadWorkspaceData(reduced);
  assert.ok(!calls.some((path) => path.endsWith('/api/plantations')));
});

test('admin carrega catálogo RBAC completo e settings completo', async () => {
  const calls = mockFetch({
    '/api/settings': { appearance: { theme: 'light' } },
    '/api/varieties': [],
    '/api/plantations': [],
    '/api/users': [{ id: 'u1', name: 'Mariana', email: 'm@a.test', roleKey: 'PRODUCER', status: 'ACTIVE', permissionKeys: PRODUCER_KEYS }],
    '/api/roles': [
      { key: 'PRODUCER', label: ROLES.PRODUCER, permissionKeys: ['overview.view'] },
      { key: 'ADMIN', label: ROLES.ADMIN, permissionKeys: ADMIN_KEYS },
    ],
    '/api/permissions': [{ key: 'overview.view', label: 'Ver painéis', area: 'Painéis' }],
    '/api/audit-events': [],
  });
  const result = await loadWorkspaceData(admin);
  assert.ok(calls.some((path) => path.endsWith('/api/users')));
  assert.ok(calls.some((path) => path.endsWith('/api/roles')));
  assert.ok(calls.some((path) => path.endsWith('/api/permissions')));
  assert.ok(calls.some((path) => path.endsWith('/api/audit-events')));
  assert.ok(!calls.some((path) => path.endsWith('/api/settings/public')), 'admin usa o documento completo');
  // A matriz reflete o catálogo do servidor (produtor reduzido a overview.view).
  assert.deepEqual(result.rbac.rolePermissions[ROLES.PRODUCER], ['overview.view']);
  assert.deepEqual(getRbacSnapshot().rolePermissions[ROLES.PRODUCER], ['overview.view']);
});

test('falha de um recurso não derruba o workspace e vira dataErrors', async () => {
  globalThis.fetch = async (url) => {
    if (String(url).endsWith('/api/varieties')) {
      return { ok: false, status: 503, headers: { get: () => 'application/json' }, json: async () => ({ message: 'indisponível' }) };
    }
    return { ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => ({}) };
  };
  const result = await loadWorkspaceData(producer);
  assert.ok(result.dataErrors.some((error) => error.resource === 'varieties'));
  assert.deepEqual(getRbacSnapshot().rolePermissions[ROLES.PRODUCER], PRODUCER_KEYS);
});
