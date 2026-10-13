import { html } from '../../utils/html.js';
import { icon } from '../../components/icons.js';
import { badge, button, card, metricsGrid, sectionHead } from '../../components/ui.js';
import { pageHeader } from '../../components/page-header.js';
import { tableWrapper } from '../../components/tables.js';
import { ROLES } from '../../config/roles.js';
import { PERMISSIONS, DEFAULT_RBAC } from '../../modules/access-control.js';
import { page } from './page-layout.js';

const FALLBACK_ROLES = [
  { key: 'PRODUCER', label: ROLES.PRODUCER },
  { key: 'ANALYST', label: ROLES.ANALYST },
  { key: 'ADMIN', label: ROLES.ADMIN },
];

function formatDateTime(value) {
  if (!value) return 'Nunca';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Data indisponível' : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function rolesFor(snapshot) {
  return snapshot.roles?.length ? snapshot.roles : FALLBACK_ROLES;
}

function permissionsFor(snapshot) {
  return snapshot.permissions?.length ? snapshot.permissions : PERMISSIONS;
}

function roleSelect(user, roles) {
  const selectedKey = user.roleKey || roles.find((role) => role.label === user.role)?.key;
  return html`<label class="sr-only" for="role-${user.id}">Papel de ${user.name}</label><select id="role-${user.id}" class="rbac-role-select" data-action="rbac-user-role" data-user-id="${user.id}">${roles.map((role) => html`<option value="${role.key}"${role.key === selectedKey ? ' selected' : ''}>${role.label}</option>`)}</select>`;
}

function statusSelect(user) {
  const active = user.status === 'Ativo' || user.status === 'ACTIVE';
  return html`<label class="sr-only" for="status-${user.id}">Situação de ${user.name}</label><select id="status-${user.id}" data-action="user-status" data-user-id="${user.id}"><option value="ACTIVE"${active ? ' selected' : ''}>Ativo</option><option value="BLOCKED"${active ? '' : ' selected'}>Bloqueado</option></select>`;
}

function rolePermissionCount(snapshot, role) {
  return snapshot.rolePermissions?.[role.label]?.length ?? role.permissionKeys?.length ?? 0;
}

function permissionMatrix(snapshot, roles) {
  const permissions = permissionsFor(snapshot);
  const header = ['Permissão', ...roles.map((role) => role.label)].map((label) => html`<th>${label}</th>`);
  const rows = permissions.map((permission) => html`<tr>
    <td><strong>${permission.label || permission.key}</strong><small class="cell-note">${permission.area || 'Geral'}</small></td>
    ${roles.map((role) => {
      const required = role.key === 'ADMIN';
      const granted = snapshot.rolePermissions?.[role.label] || role.permissionKeys || [];
      const checked = granted.includes(permission.key);
      return html`<td class="permission-cell"><label><input type="checkbox" aria-label="${permission.label || permission.key} — ${role.label}" data-action="rbac-permission" data-role="${role.key}" data-permission="${permission.key}"${checked ? ' checked' : ''}${required ? ' disabled title="As permissões do Administrador são controladas pelo servidor"' : ''}><span>${checked ? 'Permitido' : 'Sem acesso'}</span></label></td>`;
    })}
  </tr>`);
  return html`<div class="table-scroll"><table class="permission-matrix"><thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

export function rbacPage({ rbac = DEFAULT_RBAC, rbacMessage = '' } = {}) {
  const snapshot = rbac || DEFAULT_RBAC;
  const roles = rolesFor(snapshot);
  const permissions = permissionsFor(snapshot);
  const users = snapshot.users || [];
  const userRows = users.map((user) => html`<tr>
    <td><strong>${user.name}</strong><small class="cell-note">${user.email}</small></td>
    <td>${roleSelect(user, roles)}</td>
    <td>${statusSelect(user)}</td>
    <td>${formatDateTime(user.lastLoginAt)}</td>
  </tr>`);
  const roleCards = roles.map((role) => card(
    html`<div class="rbac-role-card-icon">${icon(role.key === 'ADMIN' ? 'lock' : role.key === 'ANALYST' ? 'activity' : 'leaf')}</div><div><span>Papel</span><strong>${role.label}</strong><small>${users.filter((user) => user.roleKey === role.key || user.role === role.label).length} usuários · ${rolePermissionCount(snapshot, role)} permissões</small></div>`,
    'rbac-role-card',
  ));
  const roleOptions = roles.map((role) => html`<option value="${role.key}">${role.label}</option>`);
  const activeUsers = users.filter((user) => user.status === 'Ativo' || user.status === 'ACTIVE').length;
  return page(
    pageHeader({ title: 'Permissões e RBAC', subtitle: 'Papéis, permissões e contas são administrados pelo servidor.', varietyMode: 'hidden' }),
    html`<div class="security-notice">${icon('lock', 17)}<span>A matriz exibida reflete as permissões da API. Cada rota protegida valida o token, o papel e as permissões no backend Java.</span></div>`,
    rbacMessage && html`<p class="form-feedback" role="status">${rbacMessage}</p>`,
    metricsGrid([
      { icon: 'users', label: 'Usuários', value: users.length, meta: `${activeUsers} contas ativas`, tone: 'blue' },
      { icon: 'lock', label: 'Papéis', value: roles.length, meta: 'Catálogo retornado pela API' },
      { icon: 'check', label: 'Permissões', value: permissions.length, meta: 'Consultadas no servidor', tone: 'purple' },
    ], 'four'),
    html`<div class="rbac-role-grid">${roleCards}</div>`,
    card(
      html`${sectionHead({ title: 'Usuários e papéis', subtitle: 'Alterações são persistidas no servidor e aplicadas pelo controle de acesso da API.' })}
        ${tableWrapper(['Usuário', 'Papel', 'Situação', 'Último acesso'], userRows)}
        <form class="rbac-add-user" data-form="rbac-user"><h3>Criar conta de usuário</h3><div class="form-grid">
          <label class="field"><span>Nome</span><input name="name" required minlength="2" maxlength="160" placeholder="Nome completo"></label>
          <label class="field"><span>E-mail</span><input name="email" type="email" required maxlength="254" placeholder="nome@empresa.com"></label>
          <label class="field"><span>Senha inicial</span><input name="password" type="password" required minlength="8" maxlength="72" autocomplete="new-password"></label>
          <label class="field"><span>Telefone</span><input name="phone" maxlength="30"></label>
          <label class="field"><span>Empresa</span><input name="organization" maxlength="160"></label>
          <label class="field"><span>Cargo</span><input name="jobTitle" maxlength="120"></label>
          <label class="field"><span>Papel inicial</span><select name="role">${roleOptions}</select></label>
          <button type="submit" class="btn btn-primary">${icon('plus', 16)} Criar usuário</button>
        </div></form>`,
      'table-card',
    ),
    card(
      html`${sectionHead({ title: 'Matriz de permissões', subtitle: 'O backend valida estas permissões em todas as operações protegidas. O papel Administrador é preservado pelo serviço.' })}${permissionMatrix(snapshot, roles)}`,
      'table-card permission-card',
    ),
  );
}

const SECURITY_OPTIONS = [
  ['strongPasswords', 'Exigir senha forte', 'Política aplicada pelo serviço de autenticação.'],
  ['requireMfa', 'Exigir autenticação em duas etapas', 'Indisponível até que um provedor MFA seja configurado.', true],
  ['notifyNewLogin', 'Avisar sobre novo acesso', 'Indisponível enquanto o serviço de notificações não estiver integrado.', true],
  ['lockAfterFailures', 'Bloquear após tentativas repetidas', 'Bloqueio temporário aplicado no backend após falhas consecutivas.'],
];

export function securityPage({ settings, auditLogs = [] } = {}) {
  const security = settings?.security ?? {};
  const deniedAttempts = auditLogs.filter((event) => event.resource === 'Sessão' && event.status !== 'Concluído');
  const latestDenied = deniedAttempts[0];
  const options = SECURITY_OPTIONS.map(([key, label, description, unsupported]) => html`<label class="security-option"><span class="security-option-copy"><strong>${label}</strong><small>${description}</small></span><input type="checkbox" name="${key}" data-setting="security.${key}"${security[key] ? ' checked' : ''}${unsupported ? ' disabled' : ''}><span class="toggle-track" aria-hidden="true"></span></label>`);
  return page(
    pageHeader({ title: 'Segurança', subtitle: 'Preferências aplicadas pela autenticação e pela autorização da API Java.', varietyMode: 'hidden' }),
    metricsGrid([
      { icon: 'shield', label: 'Política de senha forte', value: security.strongPasswords ? 'Ativa' : 'Desativada', meta: 'Validada na API', tone: 'green' },
      { icon: 'lock', label: 'Autenticação em duas etapas', value: security.requireMfa ? 'Solicitada' : 'Não configurada', meta: 'Provedor MFA indisponível', tone: 'blue' },
      { icon: 'clock', label: 'Duração do token', value: `${security.sessionTimeout || '30'} min`, meta: 'Validade aplicada ao JWT', tone: 'purple' },
      { icon: 'bell', label: 'Aviso de novo acesso', value: security.notifyNewLogin ? 'Ativo' : 'Não configurado', meta: 'Serviço de e-mail indisponível', tone: 'orange' },
    ], 'four'),
    card(
      html`${sectionHead({ title: 'Políticas de acesso', subtitle: 'Edite e salve as opções compatíveis com os serviços configurados.' })}
        <form class="security-form" data-form="settings"><div class="security-options">${options}</div>
          <label class="field security-timeout"><span>Tempo máximo de sessão</span><select name="sessionTimeout" data-setting="security.sessionTimeout"><option value="15"${String(security.sessionTimeout) === '15' ? ' selected' : ''}>15 minutos</option><option value="30"${String(security.sessionTimeout) === '30' ? ' selected' : ''}>30 minutos</option><option value="60"${String(security.sessionTimeout) === '60' ? ' selected' : ''}>60 minutos</option><option value="120"${String(security.sessionTimeout) === '120' ? ' selected' : ''}>2 horas</option></select></label>
          <div class="security-alert">${icon(latestDenied ? 'warning' : 'shield', 17)}<div><strong>${latestDenied ? `${deniedAttempts.length} tentativa(s) de acesso negada(s)` : 'Nenhuma tentativa negada na auditoria carregada'}</strong><span>${latestDenied ? `${latestDenied.user} · ${formatDateTime(latestDenied.occurredAt)} · ${latestDenied.details}` : 'Os eventos registrados pela API são consultados em Logs do Sistema.'}</span></div></div>
          <p class="security-disclaimer">A API valida JWT, permissões, escopo de produtor e políticas de senha. MFA e avisos por e-mail permanecem desativados até integrar seus provedores.</p>
          <div class="button-row end"><button type="submit" class="btn btn-primary">Salvar preferências</button></div>
        </form>`,
      'table-card security-card',
    ),
  );
}

function rowMarkup(event, expanded) {
  const detailRow = expanded ? html`<tr class="log-detail-row"><td colspan="7"><div><strong>Detalhes do evento</strong><p>${event.details || 'Nenhum detalhe adicional informado.'}</p><small>Origem: ${event.source} · ID: ${event.id}</small></div></td></tr>` : '';
  return html`<tr><td><strong>${event.user}</strong></td><td>${event.action}</td><td>${event.resource}</td><td>${formatDateTime(event.occurredAt)}</td><td>${event.source}</td><td>${badge(event.status, event.status === 'Concluído' ? 'success' : 'warning')}</td><td><button type="button" class="btn btn-ghost" data-action="toggle-log-details" data-id="${event.id}" aria-expanded="${expanded}">${expanded ? 'Fechar' : 'Detalhes'}</button></td></tr>${detailRow}`;
}

export function systemLogsPage({ auditLogs = [], logSearch = '', logStatus = 'Todos', logResource = 'Todos', logSort = 'newest', expandedLogId = null } = {}) {
  let events = auditLogs.filter((event) => {
    const haystack = [event.user, event.action, event.resource, event.details, event.source].join(' ').toLocaleLowerCase('pt-BR');
    const matchesText = !logSearch || haystack.includes(logSearch.toLocaleLowerCase('pt-BR'));
    const matchesStatus = logStatus === 'Todos' || event.status === logStatus;
    const matchesResource = logResource === 'Todos' || event.resource === logResource;
    return matchesText && matchesStatus && matchesResource;
  });
  events = events.slice().sort((a, b) => logSort === 'oldest' ? new Date(a.occurredAt) - new Date(b.occurredAt) : new Date(b.occurredAt) - new Date(a.occurredAt));
  const resources = ['Todos', ...new Set(auditLogs.map((event) => event.resource))];
  const statusOptions = ['Todos', 'Concluído', 'Falhou'];
  const rows = events.map((event) => rowMarkup(event, expandedLogId === event.id));
  return page(
    pageHeader({ title: 'Logs do Sistema', subtitle: 'Auditoria persistida: consulte quem fez o quê, quando e em qual recurso.', varietyMode: 'hidden' }),
    metricsGrid([
      { icon: 'logs', label: 'Eventos registrados', value: auditLogs.length, meta: 'Últimos eventos retornados pela API' },
      { icon: 'check', label: 'Operações concluídas', value: auditLogs.filter((event) => event.status === 'Concluído').length, meta: 'Status do serviço de auditoria', tone: 'green' },
      { icon: 'clock', label: 'Eventos nesta consulta', value: events.length, meta: 'Após aplicar os filtros', tone: 'blue' },
    ], 'four'),
    card(
      html`<form class="toolbar log-filters" data-form="filter-logs"><label class="searchbox">${icon('search')}<input name="search" value="${logSearch}" placeholder="Buscar usuário, ação ou recurso" aria-label="Buscar logs"></label>
        <label class="field compact"><span>Status</span><select name="status">${statusOptions.map((status) => html`<option value="${status}"${status === logStatus ? ' selected' : ''}>${status === 'Todos' ? 'Todos os status' : status}</option>`)}</select></label>
        <label class="field compact"><span>Recurso</span><select name="resource">${resources.map((resource) => html`<option value="${resource}"${resource === logResource ? ' selected' : ''}>${resource === 'Todos' ? 'Todos os recursos' : resource}</option>`)}</select></label>
        <button type="submit" class="btn btn-primary">Aplicar filtros</button><button type="button" class="btn btn-secondary" data-action="clear-log-filters">Limpar</button></form>
        <div class="log-toolbar"><span>${events.length} ${events.length === 1 ? 'evento encontrado' : 'eventos encontrados'}</span><button type="button" class="btn btn-ghost" data-action="sort-logs">${icon('activity', 15)} ${logSort === 'newest' ? 'Mais recentes primeiro' : 'Mais antigos primeiro'}</button></div>
        ${events.length ? tableWrapper(['Usuário responsável', 'Ação realizada', 'Recurso afetado', 'Data e hora', 'Origem', 'Status', 'Detalhes'], rows) : html`<div class="empty-state"><span>${icon('logs')}</span><strong>Nenhum evento encontrado</strong><small>A auditoria ainda não retornou eventos para este filtro.</small></div>`}`,
      'table-card log-card',
    ),
    html`<p class="log-retention-note">A tela mostra os últimos 500 eventos consultados do armazenamento central da API Java; não usa o localStorage do navegador.</p>`,
  );
}
