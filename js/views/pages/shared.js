import { html } from '../../utils/html.js';
import { findVariety, VARIETIES } from '../../data/varieties.js';
import { COLOR_FIELDS, DEFAULT_DESIGN, FONT_OPTIONS, SHADOW_OPTIONS, normalizeDesign } from '../../modules/design-tokens.js';
import { canOpenPage } from '../../modules/access-control.js';
import { getState } from '../../state/store.js';
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
  // O atalho para Segurança só aparece para quem pode abrir a página.
  const securityLink = canOpenPage(getState().role, 'Segurança')
    ? html`<button type="button" data-action="navigate" data-page="Segurança">${icon('shield')}Segurança${icon('chevron', 16)}</button>`
    : '';
  return html`${sections}${securityLink}`;
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

function colorControl(theme, field, value) {
  const path = `${theme}.${field.key}`;
  return html`<label class="ds-color"><span>${field.label}</span><div><input type="color" value="${value}" data-design="${path}" aria-label="${field.label} (${theme === 'dark' ? 'tema escuro' : 'tema claro'})"><code data-design-value="${path}">${value}</code></div></label>`;
}

function fontSelect(label, path, current) {
  return html`<label class="field"><span>${label}</span><select data-design="${path}">${FONT_OPTIONS.map((option) => html`<option value="${option.value}"${option.value === current ? ' selected' : ''}>${option.label}</option>`)}</select></label>`;
}

function rangeControl(label, path, value, min, max, suffix, step = 1) {
  return html`<label class="field ds-range"><span>${label} <output data-design-value="${path}" data-suffix="${suffix}">${value}${suffix}</output></span><input type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-design="${path}"></label>`;
}

export function designSystemPage({ settings, designDraft, designMessage = '', designError = false, theme = 'light' } = {}) {
  const design = normalizeDesign(designDraft || settings?.design || DEFAULT_DESIGN);
  const activeTheme = theme === 'dark' ? 'dark' : 'light';
  const palette = design[activeTheme];
  const dirty = Boolean(designDraft);

  const themeTabs = html`<div class="ds-theme-tabs" role="group" aria-label="Tema em edição"><button type="button" class="${activeTheme === 'light' ? 'active' : ''}" data-action="design-theme" data-theme="light" aria-pressed="${activeTheme === 'light'}">${icon('sun', 15)} Tema claro</button><button type="button" class="${activeTheme === 'dark' ? 'active' : ''}" data-action="design-theme" data-theme="dark" aria-pressed="${activeTheme === 'dark'}">${icon('moon', 15)} Tema escuro</button></div>`;

  const colors = card(html`<h3>Cores do produto — ${activeTheme === 'dark' ? 'tema escuro' : 'tema claro'}</h3>${themeTabs}<p class="ds-hint">Cada tema tem sua própria paleta. A alteração é aplicada em tempo real em todas as páginas.</p><div class="ds-colors">${COLOR_FIELDS.map((field) => colorControl(activeTheme, field, palette[field.key]))}</div>`);

  const typography = card(html`<h3>Tipografia</h3><div class="form-grid">
    ${fontSelect('Fonte dos textos', 'typography.bodyFont', design.typography.bodyFont)}
    ${fontSelect('Fonte dos títulos', 'typography.headingFont', design.typography.headingFont)}
    ${rangeControl('Tamanho geral das fontes', 'typography.fontScale', design.typography.fontScale, 85, 125, '%', 5)}
  </div><div class="type-samples"><b>Display / Semibold</b><strong>Dashboard de clima</strong><p>Interface / Regular — Dados claros para decisões melhores.</p></div>`);

  const components = card(html`<h3>Aparência dos componentes</h3><div class="form-grid">
    ${rangeControl('Arredondamento dos cards', 'components.cardRadius', design.components.cardRadius, 0, 28, 'px')}
    ${rangeControl('Arredondamento dos botões', 'components.buttonRadius', design.components.buttonRadius, 0, 24, 'px')}
    ${rangeControl('Espessura das bordas', 'components.borderWidth', design.components.borderWidth, 0, 3, 'px')}
    <label class="field"><span>Sombra dos cards</span><select data-design="components.cardShadow">${SHADOW_OPTIONS.map((option) => html`<option value="${option.value}"${option.value === design.components.cardShadow ? ' selected' : ''}>${option.label}</option>`)}</select></label>
  </div>`);

  const preview = card(html`<h3>Pré-visualização</h3><div class="component-row"><button type="button" class="btn btn-primary">Primário</button><button type="button" class="btn btn-secondary">Secundário</button><button type="button" class="btn btn-ghost">Texto</button>${badge('Sucesso')}${badge('Atenção', 'warning')}</div><div class="form-grid ds-preview-fields"><label class="field"><span>Campo de texto</span><input placeholder="Digite para testar"></label><label class="field"><span>Lista de opções</span><select><option>Opção de exemplo</option><option>Outra opção</option></select></label></div><div class="ds-preview-card card"><strong>Card de exemplo</strong><p>Bordas, cantos, sombra e cores seguem os tokens ao lado.</p></div>`);

  const publish = card(html`<h3>Salvar e restaurar</h3>
    ${designMessage && (designError
      ? html`<p class="form-feedback error" role="alert">${icon('warning', 15)} ${designMessage}</p>`
      : html`<p class="form-feedback" role="status">${icon('check', 15)} ${designMessage}</p>`)}
    <p class="ds-hint">${dirty ? 'Há alterações não salvas em pré-visualização.' : 'Nenhuma alteração pendente: o design salvo está em uso.'} As configurações ficam no servidor e valem para todos os usuários, inclusive após atualizar a página ou entrar novamente.</p>
    <div class="button-row"><button type="submit" class="btn btn-primary">${icon('check', 16)} Salvar design</button><button type="button" class="btn btn-secondary" data-action="design-discard"${dirty ? '' : ' disabled'}>Descartar alterações</button><button type="button" class="btn btn-ghost" data-action="design-reset">Restaurar padrão</button></div>`);

  return page(
    pageHeader({ title: 'Design System', subtitle: 'Personalize cores, fontes e componentes. Tudo é aplicado em tempo real e persistido no servidor.', varietyMode: 'hidden' }),
    html`<form data-form="design-system"><div class="ds-grid">${colors}${typography}${components}${preview}${publish}</div></form>`,
  );
}

/* ------------------------- Fallback para páginas futuras ------------------------- */

export function genericPage({ title, role }) {
  return page(
    pageHeader({ title, subtitle: `Área de ${role || 'trabalho'} da plataforma.`, varietyMode: 'hidden' }),
    card(html`<div class="empty-state"><span>${icon('grid')}</span><strong>Esta área ainda não foi configurada</strong><small>As páginas funcionais do sistema são exibidas pelo menu de cada perfil.</small></div>`, 'table-card'),
  );
}
