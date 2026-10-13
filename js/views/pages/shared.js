import { html } from '../../utils/html.js';
import { findVariety, VARIETIES } from '../../data/varieties.js';
import { icon } from '../../components/icons.js';
import { badge, button, card, chartCard, metricsGrid, sectionHead } from '../../components/ui.js';
import { barChart, lineChart } from '../../components/charts.js';
import { pageHeader } from '../../components/page-header.js';
import { comparisonTable, tableWrapper } from '../../components/tables.js';
import { page } from './page-layout.js';

/* ------------------------------ Comparação ------------------------------ */

export function comparisonPage({ comparison, dashboard, plantations = [], varieties = [] } = {}) {
  const comparisonData = comparison || {
    climateMetrics: dashboard?.climate?.metrics || {},
    plantationsByVariety: dashboard?.plantations?.byVariety || [],
    available: dashboard?.climate?.available || (dashboard?.plantations?.totalPlantations || 0) > 0,
  };
  const buckets = comparisonData.plantationsByVariety || [];
  const ranking = buckets.slice().sort((left, right) => Number(right.plants || 0) - Number(left.plants || 0)).map((item, index) =>
    html`<div><b>${index + 1}º</b><strong>${item.variety}</strong><span>${Number(item.plants || 0).toLocaleString('pt-BR')} plantas · ${item.plantations || 0} áreas</span></div>`,
  );
  const temperature = Object.entries(comparisonData.climateMetrics || {}).find(([name]) => ['temperature', 'temperaturec', 'tempc'].includes(name.toLowerCase().replaceAll('_', '')))?.[1];
  const humidity = Object.entries(comparisonData.climateMetrics || {}).find(([name]) => ['humidity', 'relativehumidity'].includes(name.toLowerCase().replaceAll('_', '')))?.[1];
  const plantValues = buckets.map((item) => Number(item.plants || 0));
  const plantLabels = buckets.map((item) => item.variety);
  const messages = [
    temperature && `Temperatura atual: ${temperature.current ?? '—'} ${temperature.unit || '°C'}`,
    humidity && `Umidade atual: ${humidity.current ?? '—'} ${humidity.unit || '%'}`,
  ].filter(Boolean);
  return page(
    pageHeader({ title: 'Análise Comparativa', subtitle: 'Compare o volume real de plantações; clima é agregado por canal e não é inferido por variedade.', varietyMode: 'hidden' }),
    card(
      html`<div><span class="overline">Dados retornados pelas APIs</span><h2>${comparisonData.available ? 'Resumo das plantações' : 'Dados ainda indisponíveis'}</h2><p>${messages.join(' · ') || 'Não há leituras climáticas no período.'} Não existem preços ou notas de adequação configurados.</p></div>${ranking.length ? html`<div class="ranking-list">${ranking}</div>` : html`<div class="empty-state compact"><small>Nenhuma plantação foi retornada pelo servidor.</small></div>`}`,
      'ranking',
    ),
    chartCard({ title: 'Plantas registradas por variedade', subtitle: 'Contagem de registros do serviço Java', content: barChart(plantValues, plantLabels) }),
    comparisonTable({ plantations, varieties: varieties.length ? varieties : VARIETIES, comparison: comparisonData }),
  );
}

/* -------------------------------- Alertas -------------------------------- */

export function alertsPage() {
  return page(
    pageHeader({ title: 'Central de Alertas', subtitle: 'Os alertas serão exibidos quando uma regra de monitoramento estiver configurada.', varietyMode: 'hidden' }),
    card(html`<div class="empty-state"><span>${icon('bell')}</span><strong>Nenhum alerta fornecido pelos serviços</strong><small>A API ainda não possui um mecanismo de alertas ativo; nenhum aviso de demonstração é exibido como real.</small></div>`, 'table-card'),
  );
}

/* ------------------------------ Configurações ------------------------------ */

const SETTINGS_SECTIONS = [
  ['Geral', 'settings'],
  ['Notificações', 'bell'],
  ['Aparência', 'eye'],
];

function settingsNavigation(active) {
  const sections = SETTINGS_SECTIONS.map(([label, iconName]) => html`<button type="button" class="${active === label ? 'active' : ''}" data-action="settings-section" data-section="${label}" aria-current="${active === label ? 'page' : 'false'}">${icon(iconName)}${label}${icon('chevron', 16)}</button>`);
  return html`${sections}<button type="button" data-action="navigate" data-page="Segurança">${icon('shield')}Segurança${icon('chevron', 16)}</button>`;
}

function settingsPanel(settings, section, varieties = []) {
  const general = settings.general;
  const notifications = settings.notifications;
  const theme = settings.appearance.theme;
  if (section === 'Notificações') {
    return html`${sectionHead({ title: 'Notificações', subtitle: 'Escolha quais avisos aparecem no painel.' })}
      <div class="settings-check-list">
        <label><span><strong>Avisos sobre o clima</strong><small>Alertas relacionados às condições da plantação.</small></span><input type="checkbox" data-setting="notifications.climateAlerts"${notifications.climateAlerts ? ' checked' : ''}></label>
        <label><span><strong>Avisos do sistema</strong><small>Notificações sobre a plataforma e seus serviços.</small></span><input type="checkbox" data-setting="notifications.systemAlerts"${notifications.systemAlerts ? ' checked' : ''}></label>
        <label><span><strong>Resumo por e-mail</strong><small>Preferência para receber um resumo periódico.</small></span><input type="checkbox" data-setting="notifications.emailSummary"${notifications.emailSummary ? ' checked' : ''}></label>
      </div>`;
  }
  if (section === 'Aparência') {
    return html`${sectionHead({ title: 'Aparência', subtitle: 'Selecione o tema que será usado em todas as páginas.' })}
      <div class="theme-options">
        <label class="${theme === 'light' ? 'selected' : ''}"><input type="radio" name="theme" value="light" data-action="change-theme" data-setting="appearance.theme"${theme === 'light' ? ' checked' : ''}><div class="theme-preview light"></div><strong>Tema claro</strong></label>
        <label class="${theme === 'dark' ? 'selected' : ''}"><input type="radio" name="theme" value="dark" data-action="change-theme" data-setting="appearance.theme"${theme === 'dark' ? ' checked' : ''}><div class="theme-preview dark"></div><strong>Tema escuro</strong></label>
      </div><p class="settings-hint">A mudança é aplicada imediatamente; use Salvar alterações para persistir no servidor.</p>`;
  }
  const varietyCatalog = varieties.length ? varieties.filter((variety) => variety.active !== false) : VARIETIES;
  const varietyOptions = varietyCatalog.map((variety) => html`<option value="${variety.name}"${variety.name === general.defaultVariety ? ' selected' : ''}>${variety.name}</option>`);
  return html`${sectionHead({ title: 'Configurações gerais', subtitle: 'Defina o nome, a região e as preferências iniciais da plataforma.' })}
    <div class="form-grid">
      <label class="field"><span>Nome do sistema</span><input name="systemName" data-setting="general.systemName" value="${general.systemName}" required maxlength="48"></label>
      <label class="field"><span>Região padrão</span><select name="region" data-setting="general.region"><option${general.region === 'Petrolina / Juazeiro' ? ' selected' : ''}>Petrolina / Juazeiro</option><option${general.region === 'Vale do São Francisco' ? ' selected' : ''}>Vale do São Francisco</option><option${general.region === 'Outra região' ? ' selected' : ''}>Outra região</option></select></label>
      <label class="field"><span>Variedade inicial</span><select name="defaultVariety" data-setting="general.defaultVariety">${varietyOptions}</select></label>
      <label class="field full"><span>Informações institucionais</span><textarea name="institutionalInfo" data-setting="general.institutionalInfo" maxlength="240">${general.institutionalInfo}</textarea></label>
    </div>`;
}

export function settingsPage({ settings, settingsSection = 'Geral', settingsMessage = '', varieties = [] } = {}) {
  const activeSection = SETTINGS_SECTIONS.some(([name]) => name === settingsSection) ? settingsSection : 'Geral';
  const savedSettings = settings || {
    general: { systemName: 'AgroClima Cloud', region: 'Petrolina / Juazeiro', defaultVariety: VARIETIES[0].name, institutionalInfo: '' },
    notifications: { climateAlerts: true, systemAlerts: true, emailSummary: false },
    appearance: { theme: 'light' },
  };
  return page(
    pageHeader({ title: 'Configurações', subtitle: 'Altere preferências que afetam o painel e a navegação.', varietyMode: 'hidden' }),
    html`<div class="settings-layout">${card(settingsNavigation(activeSection), 'settings-nav')}${card(html`<form class="settings-form" data-form="settings">${settingsMessage && html`<p class="form-feedback" role="status">${settingsMessage}</p>`}${settingsPanel(savedSettings, activeSection, varieties)}<div class="settings-divider"></div><div class="button-row end"><button type="button" class="btn btn-secondary" data-action="cancel-settings">Descartar mudanças</button><button type="submit" class="btn btn-primary">Salvar alterações</button></div></form>`, 'settings-content')}</div>`,
  );
}

/* ------------------------------ Design System ------------------------------ */

const SWATCHES = ['forest', 'emerald', 'blue', 'navy', 'wine', 'gold', 'danger', 'cloud'];
const SYSTEM_STATES = [
  ['activity', 'Carregando', 'Atualizando informações...', 'Carregamento de demonstração ativado.'],
  ['warning', 'Sem dados', 'Nenhum registro no período.', 'Estado vazio selecionado para visualização.'],
  ['wifi', 'Conexão perdida', 'Confira sua conexão.', 'Estado de conexão selecionado para visualização.'],
];

export function designSystemPage({ designMessage = '' } = {}) {
  const colors = card(html`<h3>Cores do produto</h3><div class="swatches">${SWATCHES.map((name) => html`<div><i class="swatch-${name}"></i><span>${name}</span></div>`)}</div>`);
  const typography = card(html`<h3>Tipografia</h3><div class="type-samples"><b>Display / Semibold</b><strong>Dashboard de clima</strong><p>Interface / Regular — Dados claros para decisões melhores.</p></div>`);
  const components = card(html`<h3>Botões e indicadores</h3><div class="component-row"><button type="button" class="btn btn-primary" data-action="design-interaction" data-message="O botão principal está funcionando.">Primário</button><button type="button" class="btn btn-secondary" data-action="design-interaction" data-message="O botão secundário está funcionando.">Secundário</button><button type="button" class="btn btn-ghost" data-action="design-interaction" data-message="O botão de texto está funcionando.">Texto</button>${badge('Sucesso')}${badge('Atenção', 'warning')}</div>${designMessage && html`<p class="design-feedback" role="status">${icon('check', 15)}${designMessage}</p>`}`);
  const states = card(html`<h3>Estados do sistema</h3><div class="state-grid">${SYSTEM_STATES.map(([iconName, title, description, message]) => html`<button type="button" data-action="design-interaction" data-message="${message}">${icon(iconName)}<b>${title}</b><span>${description}</span></button>`)}</div>`);
  const fields = card(html`<h3>Campos e controles</h3><div class="form-grid"><label class="field"><span>Campo de texto</span><input placeholder="Digite para testar"></label><label class="field"><span>Lista de opções</span><select><option>Opção de exemplo</option><option>Outra opção</option></select></label><label class="design-check"><input type="checkbox" checked><span>Controle selecionável</span></label></div><button type="button" class="btn btn-secondary" data-action="design-interaction" data-message="Os campos do design system estão prontos para interação.">Testar campos</button>`);
  return page(
    pageHeader({ title: 'Design System', subtitle: 'Visualize componentes, confira estados e teste as interações.', varietyMode: 'hidden' }),
    html`<div class="ds-grid">${colors}${typography}${components}${states}${fields}</div>`,
  );
}

/* ------------------------- Fallback para páginas futuras ------------------------- */

export function genericPage({ title, role }) {
  return page(
    pageHeader({ title, subtitle: `Área de ${role || 'trabalho'} da plataforma.`, varietyMode: 'hidden' }),
    card(html`<div class="empty-state"><span>${icon('grid')}</span><strong>Esta área ainda não foi configurada</strong><small>As páginas funcionais do sistema são exibidas pelo menu de cada perfil.</small></div>`, 'table-card'),
  );
}
