import { html } from '../utils/html.js';
import { findVariety, VARIETIES } from '../data/varieties.js';
import { getState } from '../state/store.js';
import { selectField } from './ui.js';
import { PERIOD_OPTIONS } from '../config/periods.js';

const PERIOD_AWARE_TITLES = ['Monitoramento Climático', 'Previsões']

function varietySelector(varietyName, { locked }) {
  const catalog = getState().varieties || [];
  const names = catalog.filter((entry) => entry.active !== false).map((entry) => entry.name);
  const options = names.length ? names : VARIETIES.map((variety) => variety.name);
  const current = findVariety(varietyName) || { color: 'green', type: 'Variedade cadastrada' };
  return html`<div class="variety-selector"><div class="grape-dot grape-${current.color}"></div>${selectField({
    label: 'Tipo de uva',
    value: varietyName,
    options: options.includes(varietyName) ? options : [varietyName, ...options],
    action: locked ? undefined : 'change-variety',
  })}<div class="variety-type">${current.type || 'Variedade cadastrada'}</div></div>`;
}

/** Cabeçalho preservando o seletor de variedade carregado do catálogo Java. */
export function pageHeader({ title, subtitle, variety, varietyMode = 'live' }) {
  return html`<header class="page-heading"><div><div class="eyebrow">AgroClima Cloud <span>/</span> ${title}</div><h1>${title}</h1><p>${subtitle}</p></div><div class="page-filters">${
    varietyMode !== 'hidden' && varietySelector(variety, { locked: varietyMode === 'locked' })
  }${PERIOD_AWARE_TITLES.includes(title)
    ? selectField({ label: 'Período', value: getState().period || PERIOD_OPTIONS[0], options: PERIOD_OPTIONS, action: 'change-period' })
    : selectField({ label: 'Período', value: PERIOD_OPTIONS[0], options: PERIOD_OPTIONS })}
}
