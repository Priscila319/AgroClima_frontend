import { NAVIGATION, ROLES } from '../config/roles.js';

export const PERMISSIONS = Object.freeze([
  { key: 'overview.view', label: 'Ver painéis e visão geral', area: 'Painéis' },
  { key: 'plantations.manage', label: 'Cadastrar e acompanhar plantações', area: 'Plantações' },
  { key: 'plantations.read.all', label: 'Consultar plantações de todos os produtores', area: 'Plantações' },
  { key: 'monitoring.view', label: 'Consultar monitoramento climático', area: 'Monitoramento' },
  { key: 'analytics.view', label: 'Consultar análises e modelos', area: 'Análises' },
  { key: 'models.manage', label: 'Treinar e remover modelos preditivos', area: 'Modelos Preditivos' },
  { key: 'reports.view', label: 'Consultar e gerar relatórios', area: 'Relatórios' },
  { key: 'users.manage', label: 'Consultar e gerenciar usuários', area: 'Usuários' },
  { key: 'rbac.manage', label: 'Gerenciar papéis e permissões', area: 'Permissões e RBAC' },
  { key: 'security.manage', label: 'Consultar políticas de segurança', area: 'Segurança' },
  { key: 'logs.read', label: 'Consultar registros de auditoria', area: 'Logs do Sistema' },
  { key: 'settings.manage', label: 'Alterar configurações do sistema', area: 'Configurações' },
  { key: 'design.manage', label: 'Visualizar e personalizar o design system', area: 'Design System' },
  { key: 'integrations.manage', label: 'Consultar integrações', area: 'Integrações' },
]);

export const DEFAULT_RBAC = Object.freeze({ users: [], roles: [], permissions: [], rolePermissions: {} });
let activeSnapshot = DEFAULT_RBAC;

const ROLE_KEYS = {
  [ROLES.PRODUCER]: 'PRODUCER',
  [ROLES.ANALYST]: 'ANALYST',
  [ROLES.ADMIN]: 'ADMIN',
};

const PAGE_PERMISSIONS = {
  'Visão Geral': 'overview.view',
  'Dashboard Analítico': 'analytics.view',
  'Dashboard Admin': 'overview.view',
  'Minhas Plantações': 'plantations.manage',
  'Monitoramento': 'monitoring.view',
  'Dados Climáticos': 'monitoring.view',
  'Previsões': 'analytics.view',
  'Mercado e Exportação': 'analytics.view',
  'Dados de Mercado': 'analytics.view',
  'Análise Comparativa': 'analytics.view',
  'Comparação': 'analytics.view',
  'Qualidade dos Dados': 'analytics.view',
  'Modelos Preditivos': 'analytics.view',
  'Histórico': 'reports.view',
  'Relatórios': 'reports.view',
  'Alertas': 'monitoring.view',
  'Usuários': 'users.manage',
  'Permissões e RBAC': 'rbac.manage',
  Segurança: 'security.manage',
  'Logs do Sistema': 'logs.read',
  Configurações: 'settings.manage',
  'Design System': 'design.manage',
  Integrações: 'integrations.manage',
};

export function normalizeRbacSnapshot({ users = [], roles = [], permissions = [] } = {}) {
  const normalizedRoles = roles.map((role) => ({
    key: String(role.key || '').toUpperCase(),
    label: role.label || role.key,
    description: role.description || '',
    permissionKeys: Array.isArray(role.permissionKeys) ? role.permissionKeys : [],
  }));
  return {
    users: Array.isArray(users) ? users : [],
    roles: normalizedRoles,
    permissions: Array.isArray(permissions) ? permissions : [],
    rolePermissions: Object.fromEntries(normalizedRoles.map((role) => [
      role.label,
      role.permissionKeys,
    ])),
  };
}

export function setRbacSnapshot(snapshot) {
  activeSnapshot = snapshot?.rolePermissions ? snapshot : normalizeRbacSnapshot(snapshot);
  return activeSnapshot;
}

export const getRbacSnapshot = () => activeSnapshot;
export const getRbacUsers = () => activeSnapshot.users;

export function findRbacUserByEmail(email) {
  const normalized = String(email ?? '').trim().toLowerCase();
  return activeSnapshot.users.find((user) => String(user.email || '').toLowerCase() === normalized) ?? null;
}

/**
 * Decide se um papel pode abrir uma página. A fonte da verdade é o snapshot
 * de permissões entregue pela API (login/me ou catálogo RBAC). Sem informação
 * do servidor o acesso é NEGADO — nenhum menu é exibido por suposição.
 */
export function canAccessPage(role, pageName) {
  const permission = PAGE_PERMISSIONS[pageName];
  if (!permission) return false;
  const roleLabel = Object.values(ROLES).includes(role) ? role : activeSnapshot.roles.find((item) => item.key === role)?.label;
  const roleKey = ROLE_KEYS[roleLabel] || String(role || '').toUpperCase();
  const roleInfo = activeSnapshot.roles.find((item) => item.key === roleKey);
  return Boolean(roleInfo?.permissionKeys?.includes(permission));
}

/**
 * Uma página só pode ser aberta quando pertence à navegação do perfil E o
 * perfil tem a permissão correspondente. Usado pelo menu, pelo roteador por
 * URL (#/pagina) e pelo renderizador — bloqueia acesso direto não autorizado.
 */
export function canOpenPage(role, pageName) {
  return Boolean(NAVIGATION[role]?.some((item) => item.label === pageName)) && canAccessPage(role, pageName);
}

/**
 * Snapshot mínimo com as permissões efetivas do usuário autenticado,
 * entregues pela API em /api/auth/login e /api/auth/me (campo permissionKeys).
 * Usado por todos os perfis; o catálogo completo continua sendo carregado
 * apenas por quem tem rbac.manage.
 */
export function snapshotForUser(user) {
  const roleKey = String(user?.roleKey || '').toUpperCase();
  return normalizeRbacSnapshot({
    users: user ? [user] : [],
    roles: roleKey ? [{
      key: roleKey,
      label: ROLES[roleKey] || user?.role || roleKey,
      permissionKeys: Array.isArray(user?.permissionKeys) ? user.permissionKeys : [],
    }] : [],
    permissions: [],
  });
}

/** Garante que o snapshot contém o papel do usuário atual com suas permissões efetivas. */
export function mergeUserIntoSnapshot(snapshot, user) {
  const base = snapshot?.rolePermissions ? snapshot : normalizeRbacSnapshot(snapshot);
  const roleKey = String(user?.roleKey || '').toUpperCase();
  if (!roleKey) return base;
  if (base.roles.some((role) => role.key === roleKey)) return base;
  const own = snapshotForUser(user);
  return normalizeRbacSnapshot({
    users: base.users,
    roles: [...base.roles, ...own.roles],
    permissions: base.permissions,
  });
}
