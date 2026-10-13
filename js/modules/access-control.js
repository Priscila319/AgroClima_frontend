import { ROLES } from '../config/roles.js';

export const PERMISSIONS = Object.freeze([
  { key: 'overview.view', label: 'Ver painéis e visão geral', area: 'Painéis' },
  { key: 'plantations.manage', label: 'Cadastrar e acompanhar plantações', area: 'Plantações' },
  { key: 'plantations.read.all', label: 'Consultar plantações de todos os produtores', area: 'Plantações' },
  { key: 'monitoring.view', label: 'Consultar monitoramento climático', area: 'Monitoramento' },
  { key: 'analytics.view', label: 'Consultar análises e modelos', area: 'Análises' },
  { key: 'reports.view', label: 'Consultar e gerar relatórios', area: 'Relatórios' },
  { key: 'users.manage', label: 'Consultar e gerenciar usuários', area: 'Usuários' },
  { key: 'rbac.manage', label: 'Gerenciar papéis e permissões', area: 'Permissões e RBAC' },
  { key: 'security.manage', label: 'Consultar políticas de segurança', area: 'Segurança' },
  { key: 'logs.read', label: 'Consultar registros de auditoria', area: 'Logs do Sistema' },
  { key: 'settings.manage', label: 'Alterar configurações do sistema', area: 'Configurações' },
  { key: 'design.manage', label: 'Visualizar componentes', area: 'Design System' },
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

export function canAccessPage(role, pageName) {
  const permission = PAGE_PERMISSIONS[pageName];
  if (!permission) return true;
  const roleLabel = Object.values(ROLES).includes(role) ? role : activeSnapshot.roles.find((item) => item.key === role)?.label;
  const roleKey = ROLE_KEYS[roleLabel] || String(role || '').toUpperCase();
  const roleInfo = activeSnapshot.roles.find((item) => item.key === roleKey);
  if (roleInfo) return roleInfo.permissionKeys.includes(permission);
  // Somente fallback de UX antes do servidor entregar o catálogo. A API continua sendo a autoridade.
  return roleKey === 'ADMIN' || ['PRODUCER', 'ANALYST'].includes(roleKey);
}
