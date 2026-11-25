import { html } from '../../utils/html.js';
import { icon } from '../../components/icons.js';
import { badge, button, card, chartCard, metricsGrid, sectionHead } from '../../components/ui.js';
import { barChart, donutChart } from '../../components/charts.js';
import { pageHeader } from '../../components/page-header.js';
import { tableWrapper } from '../../components/tables.js';
import { page } from './page-layout.js';
import { ROLES } from '../../config/roles.js';
import { DEFAULT_RBAC } from '../../modules/access-control.js';

const hiddenVarietyHeader = (title, subtitle) => pageHeader({ title, subtitle, varietyMode: 'hidden' });

function formatDateTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Data indisponível' : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function serviceCards(dashboard, integrationStatus, pythonHealth) {
  const java = dashboard?.sources?.find((item) => item.source === 'API Java');
  const services = [
    { name: 'API Java', status: java?.available ? 'Disponível' : 'Indisponível', detail: 'JWT · RBAC · JPA', icon: 'server', tone: java?.available ? 'success' : 'warning' },
    { name: 'Persistência', status: java?.available ? 'Acessível' : 'Verificar', detail: 'MySQL · Flyway', icon: 'database', tone: java?.available ? 'success' : 'warning' },
    { name: 'API Python', status: pythonHealth?.status || 'Não consultada', detail: 'FastAPI · métricas', icon: 'activity', tone: pythonHealth?.status === 'UP' ? 'success' : 'warning' },
    { name: 'ThingSpeak', status: integrationStatus?.configured ? 'Configurado' : 'Não configurado', detail: integrationStatus?.channelId ? `Canal ${integrationStatus.channelId}` : 'Sem canal definido', icon: 'cloud', tone: integrationStatus?.configured ? 'success' : 'neutral' },
  ];
  return html`<div class="services">${services.map((service) => card(
    html`<div class="service-icon">${icon(service.icon)}</div><div><span>${service.name}</span><strong>${service.status}</strong></div>${badge(service.detail, service.tone)}`,
    'service-card',
  ))}</div>`;
}

function recentActivity(auditLogs = []) {
  const icons = { 'Plantações': 'leaf', 'Relatórios': 'report', 'Usuários': 'users', 'Permissões e RBAC': 'lock', 'Segurança': 'shield', 'Configurações': 'settings', 'Sessão': 'lock' };
  const items = auditLogs.slice(0, 4).map((event) => html`<div><span class="activity-symbol tone-blue">${icon(icons[event.resource] || 'activity')}</span><div><strong>${event.action}</strong><span>${event.user} · ${event.resource}</span></div><time>${formatDateTime(event.occurredAt)}</time></div>`);
  return card(
    html`${sectionHead({ title: 'Atividade recente', subtitle: 'Eventos gravados na auditoria central', action: button('Abrir logs', { variant: 'ghost', action: 'navigate', page: 'Logs do Sistema' }) })}${items.length ? html`<div class="activity-list">${items}</div>` : html`<div class="empty-state compact"><small>A API ainda não retornou eventos de auditoria.</small></div>`}`,
    'table-card',
  );
}

export function adminDashboardPage({ auditLogs = [], rbac = DEFAULT_RBAC, dashboard, integrationStatus, pythonHealth } = {}) {
  const users = rbac.users || [];
  const activeUsers = users.filter((user) => user.status === 'Ativo' || user.status === 'ACTIVE').length;
  const blockedUsers = users.length - activeUsers;
  const today = new Date();
  const sameDay = (left, right) => !Number.isNaN(left.getTime()) && left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
  const sessionsToday = auditLogs.filter((event) => event.action === 'Iniciou sessão' && sameDay(new Date(event.occurredAt), today)).length;
  const failedEvents = auditLogs.filter((event) => event.status !== 'Concluído').length;
  const roleCounts = [
    users.filter((user) => user.roleKey === 'PRODUCER' || user.role === ROLES.PRODUCER).length,
    users.filter((user) => user.roleKey === 'ANALYST' || user.role === ROLES.ANALYST).length,
    users.filter((user) => user.roleKey === 'ADMIN' || user.role === ROLES.ADMIN).length,
  ];
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return date;
  });
  const sessionsByDay = days.map((day) => auditLogs.filter((event) => event.action === 'Iniciou sessão' && sameDay(new Date(event.occurredAt), day)).length);
  const dayLabels = days.map((date) => new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(date).replace('.', ''));
  return page(
    hiddenVarietyHeader('Dashboard Administrativo', 'Resumo de contas, integrações e auditoria retornados pelos serviços.'),
    metricsGrid([
      { icon: 'users', label: 'Usuários ativos', value: activeUsers, meta: `${users.length} contas na API` },
      { icon: 'lock', label: 'Usuários bloqueados', value: blockedUsers, meta: 'Status persistido no MySQL', tone: 'orange' },
      { icon: 'activity', label: 'Acessos hoje', value: sessionsToday, meta: 'Eventos de sessão auditados', tone: 'blue' },
      { icon: 'shield', label: 'Eventos com falha', value: failedEvents, meta: 'Auditoria central', tone: 'purple' },
    ], 'four'),
    serviceCards(dashboard, integrationStatus, pythonHealth),
    html`<div class="grid-2">${chartCard({ title: 'Sessões auditadas', subtitle: 'Eventos de login nos últimos sete dias', content: barChart(sessionsByDay, dayLabels) })}${chartCard({
      title: 'Usuários por papel',
      subtitle: `Distribuição das ${users.length} contas do servidor`,
      content: donutChart({
        modifier: 'admin', total: String(users.length), caption: 'usuários',
        legend: [
          { tone: 'green', label: 'Produtores', value: String(roleCounts[0]) },
          { tone: 'blue', label: 'Analistas', value: String(roleCounts[1]) },
          { tone: 'gold', label: 'Administradores', value: String(roleCounts[2]) },
        ],
        segments: [{ tone: 'green', value: roleCounts[0] }, { tone: 'blue', value: roleCounts[1] }, { tone: 'gold', value: roleCounts[2] }],
      }),
    })}</div>`,
    recentActivity(auditLogs),
  );
}

const getInitials = (fullName) => String(fullName || 'Usuário').split(' ').map((part) => part[0]).join('').slice(0, 2);

export function usersPage({ rbac = DEFAULT_RBAC } = {}) {
  const users = rbac.users || [];
  const activeUsers = users.filter((user) => user.status === 'Ativo' || user.status === 'ACTIVE').length;
  const blockedUsers = users.length - activeUsers;
  const rows = users.map((user) => html`<tr><td><div class="user-cell"><span>${getInitials(user.name)}</span><strong>${user.name}</strong></div></td><td>${user.email}</td><td>${user.role}</td><td>${badge(user.status, user.status === 'Ativo' || user.status === 'ACTIVE' ? 'success' : 'danger')}</td><td>${formatDateTime(user.lastLoginAt)}</td><td>${button('Gerenciar', { variant: 'ghost', action: 'navigate', page: 'Permissões e RBAC' })}</td></tr>`);
  return page(
    hiddenVarietyHeader('Usuários', 'Consulte contas e acessos gerenciados pela API Java.'),
    card(html`${sectionHead({ title: 'Contas cadastradas', subtitle: `${activeUsers} ativas · ${blockedUsers} bloqueadas no servidor` })}${tableWrapper(['Nome', 'E-mail', 'Papel', 'Status', 'Último acesso', 'Ações'], rows)}`, 'table-card'),
    html`<div class="admin-callout">${icon('lock', 17)}<span>Crie usuários, altere papéis e bloqueie ou reative contas em <strong>Permissões e RBAC</strong>. As alterações são aplicadas pelo backend.</span>${button('Gerenciar usuários', { variant: 'secondary', action: 'navigate', page: 'Permissões e RBAC' })}</div>`,
  );
}

const ARCHITECTURE_STEPS = [
  { name: 'Frontend', detail: 'SPA existente', icon: 'grid' },
  { name: 'API Java', detail: 'JWT · RBAC · REST', icon: 'lock' },
  { name: 'MySQL Server', detail: 'JPA · Flyway', icon: 'database' },
  { name: 'API Python', detail: 'FastAPI · Pandas', icon: 'activity' },
  { name: 'ThingSpeak', detail: 'Canal configurável', icon: 'cloud' },
];

function architectureFlow() {
  const steps = ARCHITECTURE_STEPS.map((step, index) => html`<div class="arch-group"><div class="arch-step"><div>${icon(step.icon)}</div><strong>${step.name}</strong><span>${step.detail}</span></div>${index < ARCHITECTURE_STEPS.length - 1 && html`<span class="flow-arrow">→</span>`}</div>`);
  return card(
    html`${sectionHead({ title: 'Arquitetura integrada', subtitle: 'O frontend chama APIs same-origin; o serviço Python consulta o Java e não acessa o MySQL Server.' })}<div class="architecture-flow">${steps}</div><div class="architecture-note">${icon('shield')}<span><strong>Escopo protegido:</strong> JWT e permissões são verificados pela API Java; ThingSpeak usa configuração de ambiente e segredo servidor-servidor.</span></div>`,
    'architecture',
  );
}

export function integrationsPage({ integrationStatus, pythonHealth, dashboard } = {}) {
  const javaAvailable = dashboard?.sources?.find((item) => item.source === 'API Java')?.available;
  const data = [
    { name: 'API Java', description: 'Autenticação JWT, autorização RBAC e API REST.', status: javaAvailable ? 'Disponível' : 'Não verificada', updated: 'Serviço de domínio', icon: 'server', tone: javaAvailable ? 'success' : 'warning' },
    { name: 'Persistência', description: 'MySQL com JPA/Hibernate e migrations Flyway.', status: javaAvailable ? 'Acessível' : 'Não verificada', updated: 'Através da API Java', icon: 'database', tone: javaAvailable ? 'success' : 'warning' },
    { name: 'API Python', description: 'Leituras, métricas, qualidade e dashboards analíticos.', status: pythonHealth?.status || 'Não verificada', updated: 'FastAPI', icon: 'activity', tone: pythonHealth?.status === 'UP' ? 'success' : 'warning' },
    { name: 'ThingSpeak', description: 'Canal e campos definidos por variáveis de ambiente.', status: integrationStatus?.configured ? 'Configurado' : 'Não configurado', updated: integrationStatus?.channelId ? `Canal ${integrationStatus.channelId}` : 'Sem canal definido', icon: 'cloud', tone: integrationStatus?.configured ? 'success' : 'neutral' },
  ];
  const cards = data.map((item) => card(
    html`<div class="integration-card-top"><div class="service-icon">${icon(item.icon)}</div>${badge(item.status, item.tone)}</div><h3>${item.name}</h3><p>${item.description}</p><div><span>Detalhe</span><strong>${item.updated}</strong></div>`,
    'integration-card',
  ));
  return page(
    hiddenVarietyHeader('Integrações', 'Estado e configuração das APIs, persistência e fonte climática.'),
    architectureFlow(),
    html`<div class="integration-grid">${cards}</div>`,
  );
}
