/**
 * Integração em nível de contrato: simula a API Java (mesmas regras do backend)
 * e percorre os fluxos reais do frontend — login, RBAC na sidebar, personalização
 * do Design System persistida e rejeição de telefone inválido.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { signIn, getCurrentUser, signOut } from '../js/modules/auth.js';
import { loadWorkspaceData, normalizeUser } from '../js/services/workspace.js';
import { getSettings, saveSettings } from '../js/modules/settings.js';
import { canAccessPage, canOpenPage, getRbacSnapshot } from '../js/modules/access-control.js';
import { shellView } from '../js/views/shell-view.js';
import { DEFAULT_SETTINGS } from '../js/modules/settings.js';
import { validateBrPhone } from '../js/utils/phone.js';
import { ROLES } from '../js/config/roles.js';
import { apiPost } from '../js/services/api.js';

// Shim de sessionStorage (o navegador fornece; o Node não).
const storage = new Map();
globalThis.sessionStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
};

const ALL = ['overview.view', 'plantations.manage', 'plantations.read.all', 'monitoring.view', 'analytics.view',
  'reports.view', 'users.manage', 'rbac.manage', 'security.manage', 'logs.read', 'settings.manage', 'design.manage', 'integrations.manage', 'models.manage'];

const db = {
  roles: {
    PRODUCER: { key: 'PRODUCER', label: ROLES.PRODUCER, permissionKeys: ['overview.view', 'plantations.manage', 'monitoring.view', 'analytics.view', 'reports.view'] },
    ANALYST: { key: 'ANALYST', label: ROLES.ANALYST, permissionKeys: ['overview.view', 'plantations.read.all', 'monitoring.view', 'analytics.view', 'reports.view', 'integrations.manage', 'models.manage'] },
    ADMIN: { key: 'ADMIN', label: ROLES.ADMIN, permissionKeys: [...ALL] },
  },
  users: {
    'produtor@agroclima.com': { id: 'u1', name: 'Mariana Costa', email: 'produtor@agroclima.com', password: 'Senha1234', roleKey: 'PRODUCER', status: 'ACTIVE', phone: '' },
    'admin@agroclima.com': { id: 'u2', name: 'Carlos Almeida', email: 'admin@agroclima.com', password: 'Senha1234', roleKey: 'ADMIN', status: 'ACTIVE', phone: '' },
  },
  settings: {},
  tokenUser: null,
};

function userResponse(user) {
  const role = db.roles[user.roleKey];
  return {
    id: user.id, name: user.name, email: user.email, phone: user.phone, organization: '', jobTitle: '',
    roleKey: user.roleKey, role: role.label, status: user.status === 'ACTIVE' ? 'Ativo' : 'Bloqueado',
    createdAt: '2026-01-01T00:00:00Z', lastLoginAt: null, permissionKeys: [...role.permissionKeys],
  };
}

function json(status, payload) {
  return { ok: status < 400, status, headers: { get: () => 'application/json' }, json: async () => payload };
}

globalThis.fetch = async (url, options = {}) => {
  const path = String(url).replace(/^\/api\/java/, '');
  const method = options.method || 'GET';
  const body = options.body ? JSON.parse(options.body) : null;
  const authHeader = new Headers(options.headers).get('Authorization');

  if (path === '/api/auth/login' && method === 'POST') {
    const user = db.users[String(body.email).toLowerCase()];
    if (!user || user.password !== body.password) return json(401, { message: 'E-mail ou senha inválidos, ou conta indisponível.' });
    db.tokenUser = user;
    return json(200, { accessToken: 'jwt-test', tokenType: 'Bearer', expiresAt: new Date(Date.now() + 3600e3).toISOString(), user: userResponse(user) });
  }
  // Cadastro público não existe mais.
  if (path === '/api/auth/register') return json(404, { message: 'Não encontrado.' });
  if (path === '/api/auth/me') {
    if (!authHeader) return json(401, { message: 'Autenticação obrigatória.' });
    return json(200, userResponse(db.tokenUser));
  }
  const permissions = db.tokenUser ? db.roles[db.tokenUser.roleKey].permissionKeys : [];
  const require = (key) => permissions.includes(key);

  if (path === '/api/settings/public') return json(200, { general: { systemName: 'AgroClima Cloud' }, appearance: db.settings.appearance || { theme: 'light' }, design: db.settings.design || {} });
  if (path === '/api/settings' && method === 'GET') {
    return require('settings.manage') ? json(200, db.settings) : json(403, { message: 'Você não tem permissão para esta operação.' });
  }
  if (path === '/api/settings' && method === 'PATCH') {
    if (!require('settings.manage')) return json(403, { message: 'Você não tem permissão para esta operação.' });
    db.settings = { ...db.settings, ...body };
    return json(200, db.settings);
  }
  if (path === '/api/users' && method === 'POST') {
    if (!require('users.manage')) return json(403, { message: 'Você não tem permissão para esta operação.' });
    const check = validateBrPhone(body.phone); // o backend real usa PhoneNumber.normalize com as mesmas regras
    if (!check.valid) return json(400, { message: 'Revise os campos informados.', fieldErrors: { phone: check.message } });
    const created = { id: `u${Object.keys(db.users).length + 1}`, name: body.fullName, email: body.email, password: body.password, roleKey: body.roleKey, status: 'ACTIVE', phone: check.digits };
    db.users[body.email.toLowerCase()] = created;
    return json(201, userResponse(created));
  }
  if (path === '/api/users') return require('users.manage') ? json(200, Object.values(db.users).map(userResponse)) : json(403, { message: 'Você não tem permissão para esta operação.' });
  if (path === '/api/roles') return require('rbac.manage') ? json(200, Object.values(db.roles)) : json(403, { message: 'Você não tem permissão para esta operação.' });
  if (path === '/api/permissions') return require('rbac.manage') ? json(200, ALL.map((key) => ({ key, label: key, area: 'Geral' }))) : json(403, { message: 'Você não tem permissão para esta operação.' });
  if (path === '/api/audit-events') return require('logs.read') ? json(200, []) : json(403, { message: 'Você não tem permissão para esta operação.' });
  if (path === '/api/plantations') return json(200, []);
  if (path === '/api/varieties') return json(200, []);
  return json(404, { message: 'Não encontrado.' });
};

function stateFor(user, page) {
  return {
    role: db.roles[user.roleKey].label, roleKey: user.roleKey, user: normalizeUser(user), page,
    theme: 'light', settings: DEFAULT_SETTINGS, menuOpen: false, dataErrors: [], pageLoading: false,
    pageError: '', authenticated: true, rbac: getRbacSnapshot(), plantations: [], varieties: [], users: [], auditLogs: [],
  };
}

test('fluxo completo: login → permissões da API → sidebar correta para cada perfil', async () => {
  const producerLogin = await signIn('produtor@agroclima.com', 'Senha1234');
  assert.ok(producerLogin.permissionKeys.includes('monitoring.view'));
  await loadWorkspaceData(normalizeUser(producerLogin));
  let markup = String(shellView(stateFor(producerLogin, 'Visão Geral')));
  assert.ok(markup.includes('data-page="Monitoramento"'));
  assert.ok(!markup.includes('data-page="Usuários"'));
  assert.ok(!markup.includes('data-page="Design System"'));

  signOut();
  const adminLogin = await signIn('admin@agroclima.com', 'Senha1234');
  await loadWorkspaceData(normalizeUser(adminLogin));
  markup = String(shellView(stateFor(adminLogin, 'Usuários')));
  assert.ok(markup.includes('data-page="Design System"'));
  assert.ok(markup.includes('data-page="Permissões e RBAC"'));
});

test('admin revoga permissão → menu do produtor some no próximo acesso; API responde 403', async () => {
  await signIn('admin@agroclima.com', 'Senha1234');
  db.roles.PRODUCER.permissionKeys = db.roles.PRODUCER.permissionKeys.filter((key) => key !== 'monitoring.view');

  signOut();
  const producerLogin = await signIn('produtor@agroclima.com', 'Senha1234');
  const user = normalizeUser(producerLogin);
  await loadWorkspaceData(user);
  const markup = String(shellView(stateFor(producerLogin, 'Visão Geral')));
  assert.ok(!markup.includes('data-page="Monitoramento"'), 'menu revogado deve sumir');
  assert.equal(canAccessPage(ROLES.PRODUCER, 'Monitoramento'), false);
  assert.equal(canOpenPage(ROLES.PRODUCER, 'Monitoramento'), false);

  // Tentativa de operação direta na API sem a permissão → 403.
  await assert.rejects(
    () => apiPost('java', '/api/users', { fullName: 'X', email: 'x@y.z', password: 'Senha1234', phone: '', roleKey: 'PRODUCER' }),
    (error) => error.status === 403,
  );
  db.roles.PRODUCER.permissionKeys.push('monitoring.view');
});

test('design personalizado persiste e reaparece após novo login (inclusive para produtor)', async () => {
  await signIn('admin@agroclima.com', 'Senha1234');
  const design = { light: { primary: '#7c3d67', button: '#7c3d67' }, typography: { fontScale: 110 } };
  const saved = await saveSettings({ design, appearance: { theme: 'dark' } });
  assert.equal(saved.design.light.primary, '#7c3d67');
  assert.equal(saved.appearance.theme, 'dark');

  // "Atualizar a página": admin restaura a sessão e recebe o design salvo.
  const adminMe = normalizeUser(await getCurrentUser());
  const adminWorkspace = await loadWorkspaceData(adminMe);
  assert.equal(getSettings(adminWorkspace.settings).design.light.primary, '#7c3d67');

  // "Novo login" com outro perfil: a visão pública traz o mesmo design.
  signOut();
  const producerLogin = await signIn('produtor@agroclima.com', 'Senha1234');
  const producerWorkspace = await loadWorkspaceData(normalizeUser(producerLogin));
  const producerSettings = getSettings(producerWorkspace.settings);
  assert.equal(producerSettings.design.light.primary, '#7c3d67');
  assert.equal(producerSettings.design.typography.fontScale, 110);
  assert.equal(producerSettings.appearance.theme, 'dark');
  // E o produtor não consegue alterar o design (403 no PATCH).
  await assert.rejects(() => saveSettings({ design: {} }), (error) => error.status === 403);
});

test('admin cadastra usuário pelo painel; telefone inválido é rejeitado nas duas camadas', async () => {
  signOut();
  await signIn('admin@agroclima.com', 'Senha1234');
  // Camada 1: o frontend valida antes de enviar.
  assert.equal(validateBrPhone('(00) 99999-8888').valid, false);
  // Camada 2: mesmo que alguém envie direto à API, o backend rejeita.
  await assert.rejects(
    () => apiPost('java', '/api/users', { fullName: 'Novo Usuário', email: 'novo@agroclima.com', password: 'Senha1234', phone: '(00) 99999-8888', roleKey: 'ANALYST' }),
    (error) => error.status === 400 && error.fieldErrors.phone.includes('DDD'),
  );
  // Telefone válido: cadastro concluído com papel escolhido e telefone padronizado.
  const created = await apiPost('java', '/api/users', { fullName: 'Novo Usuário', email: 'novo@agroclima.com', password: 'Senha1234', phone: '(81) 99999-8888', roleKey: 'ANALYST' });
  assert.equal(created.roleKey, 'ANALYST');
  assert.equal(created.phone, '5581999998888');
  assert.ok(created.permissionKeys.includes('plantations.read.all'));
});

test('usuário comum não consegue cadastrar outros usuários (403)', async () => {
  signOut();
  await signIn('produtor@agroclima.com', 'Senha1234');
  await assert.rejects(
    () => apiPost('java', '/api/users', { fullName: 'Invasor', email: 'inv@agroclima.com', password: 'Senha1234', phone: '', roleKey: 'ADMIN' }),
    (error) => error.status === 403,
  );
  assert.equal(db.users['inv@agroclima.com'], undefined);
});

test('cadastro público está extinto: /api/auth/register não existe', async () => {
  signOut();
  await assert.rejects(
    () => apiPost('java', '/api/auth/register', { fullName: 'Público', email: 'pub@agroclima.com', password: 'Senha1234' }, { auth: false }),
    (error) => error.status === 404,
  );
});
