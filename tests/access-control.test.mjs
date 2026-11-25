import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_RBAC, canAccessPage, canOpenPage, mergeUserIntoSnapshot,
  normalizeRbacSnapshot, setRbacSnapshot, snapshotForUser,
} from '../js/modules/access-control.js';
import { NAVIGATION, ROLES } from '../js/config/roles.js';
import { shellView } from '../js/views/shell-view.js';
import { renderPage } from '../js/config/routes.js';
import { DEFAULT_SETTINGS } from '../js/modules/settings.js';

const PRODUCER_KEYS = ['overview.view', 'plantations.manage', 'monitoring.view', 'analytics.view', 'reports.view'];
const ADMIN_KEYS = [
  'overview.view', 'plantations.manage', 'plantations.read.all', 'monitoring.view', 'analytics.view',
  'reports.view', 'users.manage', 'rbac.manage', 'security.manage', 'logs.read', 'settings.manage',
  'design.manage', 'integrations.manage', 'models.manage',
];

const producer = { id: 'u1', name: 'Mariana', email: 'm@a.test', roleKey: 'PRODUCER', role: ROLES.PRODUCER, permissionKeys: PRODUCER_KEYS };
const admin = { id: 'u2', name: 'Carlos', email: 'c@a.test', roleKey: 'ADMIN', role: ROLES.ADMIN, permissionKeys: ADMIN_KEYS };

function baseState(role, user, page) {
  return {
    role, roleKey: user.roleKey, user, page, theme: 'light', settings: DEFAULT_SETTINGS,
    menuOpen: false, dataErrors: [], pageLoading: false, pageError: '', authenticated: true,
    rbac: snapshotForUser(user), plantations: [], varieties: [], users: [], auditLogs: [],
  };
}

test('sem catálogo do servidor o acesso é negado (nada liberado por suposição)', () => {
  setRbacSnapshot(DEFAULT_RBAC);
  assert.equal(canAccessPage(ROLES.PRODUCER, 'Visão Geral'), false);
  assert.equal(canAccessPage(ROLES.ADMIN, 'Usuários'), false);
  assert.equal(canOpenPage(ROLES.PRODUCER, 'Visão Geral'), false);
});

test('snapshot do usuário vem das permissões efetivas da API', () => {
  const snapshot = setRbacSnapshot(snapshotForUser(producer));
  assert.deepEqual(snapshot.rolePermissions[ROLES.PRODUCER], PRODUCER_KEYS);
  assert.equal(canAccessPage(ROLES.PRODUCER, 'Visão Geral'), true);
  assert.equal(canAccessPage(ROLES.PRODUCER, 'Usuários'), false);
  assert.equal(canAccessPage(ROLES.PRODUCER, 'Design System'), false);
});

test('permissão revogada some do menu e da página imediatamente', () => {
  const reduced = { ...producer, permissionKeys: PRODUCER_KEYS.filter((key) => key !== 'monitoring.view') };
  setRbacSnapshot(snapshotForUser(reduced));
  assert.equal(canAccessPage(ROLES.PRODUCER, 'Monitoramento'), false);
  assert.equal(canAccessPage(ROLES.PRODUCER, 'Alertas'), false);
  assert.equal(canAccessPage(ROLES.PRODUCER, 'Visão Geral'), true);
});

test('usuário sem permissão não visualiza o item na sidebar (HTML real)', () => {
  const reduced = { ...producer, permissionKeys: ['overview.view', 'reports.view'] };
  setRbacSnapshot(snapshotForUser(reduced));
  const markup = String(shellView(baseState(ROLES.PRODUCER, reduced, 'Visão Geral')));
  assert.ok(markup.includes('data-page="Visão Geral"'));
  assert.ok(markup.includes('data-page="Relatórios"'));
  assert.ok(!markup.includes('data-page="Monitoramento"'), 'Monitoramento deveria estar oculto');
  assert.ok(!markup.includes('data-page="Minhas Plantações"'), 'Plantações deveria estar oculto');
  assert.ok(!markup.includes('data-page="Previsões"'), 'Previsões deveria estar oculto');
  assert.ok(!markup.includes('disabled'), 'itens sem permissão são ocultos, nunca desabilitados');
});

test('sidebar do produtor nunca mostra páginas de administrador', () => {
  setRbacSnapshot(snapshotForUser(producer));
  const markup = String(shellView(baseState(ROLES.PRODUCER, producer, 'Visão Geral')));
  for (const adminPage of ['Usuários', 'Permissões e RBAC', 'Segurança', 'Logs do Sistema', 'Design System', 'Configurações']) {
    assert.ok(!markup.includes(`data-page="${adminPage}"`), `${adminPage} não pode aparecer para produtor`);
  }
});

test('categoria inteira some quando nenhuma página está acessível', () => {
  const noAccess = { ...producer, permissionKeys: [] };
  setRbacSnapshot(snapshotForUser(noAccess));
  const markup = String(shellView(baseState(ROLES.PRODUCER, noAccess, null)));
  assert.ok(!markup.includes('nav-label'), 'o grupo Navegação deveria desaparecer');
  assert.ok(!markup.includes('data-page='), 'nenhum item de menu deveria existir');
  assert.ok(markup.includes('Nenhuma área liberada'));
});

test('administrador mantém acesso às áreas autorizadas', () => {
  setRbacSnapshot(snapshotForUser(admin));
  const markup = String(shellView(baseState(ROLES.ADMIN, admin, 'Usuários')));
  for (const page of ['Dashboard Admin', 'Usuários', 'Permissões e RBAC', 'Segurança', 'Logs do Sistema', 'Integrações', 'Configurações', 'Design System']) {
    assert.ok(markup.includes(`data-page="${page}"`), `${page} deveria aparecer para admin`);
  }
});

test('acesso direto por URL/render é bloqueado sem permissão (403 visual)', () => {
  setRbacSnapshot(snapshotForUser(producer));
  const denied = String(renderPage({ page: 'Usuários', role: ROLES.PRODUCER, roleKey: 'PRODUCER' }));
  assert.ok(denied.includes('Acesso não autorizado'));
  const allowed = String(renderPage(baseState(ROLES.PRODUCER, producer, 'Visão Geral')));
  assert.ok(!allowed.includes('Acesso não autorizado'));
});

test('admin não abre páginas exclusivas de outros perfis por URL', () => {
  setRbacSnapshot(snapshotForUser(admin));
  // 'Minhas Plantações' não pertence à navegação do administrador.
  assert.equal(canOpenPage(ROLES.ADMIN, 'Minhas Plantações'), false);
  const denied = String(renderPage({ page: 'Minhas Plantações', role: ROLES.ADMIN, roleKey: 'ADMIN' }));
  assert.ok(denied.includes('Acesso não autorizado'));
});

test('catálogo RBAC completo continua funcionando para a matriz de permissões', () => {
  const snapshot = normalizeRbacSnapshot({
    users: [producer, admin],
    roles: [
      { key: 'PRODUCER', label: ROLES.PRODUCER, permissionKeys: ['overview.view'] },
      { key: 'ADMIN', label: ROLES.ADMIN, permissionKeys: ADMIN_KEYS },
    ],
    permissions: [{ key: 'overview.view', label: 'Ver painéis' }],
  });
  setRbacSnapshot(snapshot);
  assert.equal(canAccessPage(ROLES.PRODUCER, 'Visão Geral'), true);
  assert.equal(canAccessPage(ROLES.PRODUCER, 'Monitoramento'), false);
  assert.equal(canAccessPage(ROLES.ADMIN, 'Usuários'), true);
});

test('mergeUserIntoSnapshot preserva o papel do usuário quando o catálogo não o inclui', () => {
  const catalog = normalizeRbacSnapshot({ users: [], roles: [{ key: 'ADMIN', label: ROLES.ADMIN, permissionKeys: ADMIN_KEYS }], permissions: [] });
  const merged = mergeUserIntoSnapshot(catalog, producer);
  setRbacSnapshot(merged);
  assert.equal(canAccessPage(ROLES.PRODUCER, 'Visão Geral'), true);
  assert.equal(canAccessPage(ROLES.ADMIN, 'Usuários'), true);
});

test('todas as páginas de navegação têm permissão mapeada', () => {
  setRbacSnapshot(snapshotForUser(admin));
  for (const items of Object.values(NAVIGATION)) {
    for (const item of items) {
      // Com o catálogo completo do admin, toda página mapeada responde true/false
      // pela permissão — nunca por fallback. Páginas sem mapeamento retornam false.
      const adminCan = canAccessPage(ROLES.ADMIN, item.label);
      assert.equal(adminCan, true, `página ${item.label} deveria ter permissão mapeada para ADMIN`);
    }
  }
});
