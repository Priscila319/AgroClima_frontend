import { overviewPage, monitoringPage, forecastsPage, marketPage } from '../views/pages/producer.js';
import { plantationsPage, producerHistoryPage, producerReportsPage } from '../views/pages/plantations.js';
import { analyticsDashboardPage, analystHistoryPage, analystReportsPage, qualityPage, modelsPage } from '../views/pages/analyst.js';
import { adminDashboardPage, usersPage, integrationsPage } from '../views/pages/admin.js';
import { rbacPage, securityPage, systemLogsPage } from '../views/pages/admin-extra.js';
import { alertsPage, comparisonPage, designSystemPage, genericPage, settingsPage } from '../views/pages/shared.js';
import { canAccessPage } from '../modules/access-control.js';
import { html } from '../utils/html.js';
import { page } from '../views/pages/page-layout.js';
import { pageHeader } from '../components/page-header.js';
import { card } from '../components/ui.js';
import { ROLES } from './roles.js';

/** Rótulo do menu → página. Telas dependentes do perfil são resolvidas abaixo. */
const PAGE_RENDERERS = {
  'Visão Geral': overviewPage,
  'Minhas Plantações': plantationsPage,
  'Monitoramento': monitoringPage,
  'Dados Climáticos': monitoringPage,
  'Previsões': forecastsPage,
  'Mercado e Exportação': marketPage,
  'Dados de Mercado': marketPage,
  'Dashboard Analítico': analyticsDashboardPage,
  'Qualidade dos Dados': qualityPage,
  'Modelos Preditivos': modelsPage,
  'Dashboard Admin': adminDashboardPage,
  'Usuários': usersPage,
  'Permissões e RBAC': rbacPage,
  Segurança: securityPage,
  'Logs do Sistema': systemLogsPage,
  'Integrações': integrationsPage,
  'Configurações': settingsPage,
  'Design System': designSystemPage,
  'Comparação': comparisonPage,
  'Análise Comparativa': comparisonPage,
  'Alertas': alertsPage,
};

function accessDenied(title) {
  return page(
    pageHeader({ title, subtitle: 'Seu papel atual não permite abrir esta área.', varietyMode: 'hidden' }),
    card(html`<div class="empty-state"><span>🔒</span><strong>Acesso não autorizado</strong><small>Volte ao menu disponível para o seu papel ou peça ajuda a um administrador.</small></div>`, 'table-card'),
  );
}

export function renderPage(state) {
  const { page: title, role } = state;
  if (!canAccessPage(role, title)) return accessDenied(title || 'Página');
  if (title === 'Histórico') {
    return role === ROLES.ANALYST ? analystHistoryPage(state) : producerHistoryPage(state);
  }
  if (title === 'Relatórios') {
    return role === ROLES.ANALYST ? analystReportsPage(state) : producerReportsPage(state);
  }
  const renderer = PAGE_RENDERERS[title] ?? genericPage;
  return renderer({ ...state, title, role });
}
