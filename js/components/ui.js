import { html } from '../utils/html.js';
import { icon } from './icons.js';

/** Componentes visuais pequenos e reutilizáveis (equivalentes aos componentes do projeto original). */

export const button = (children, { variant = 'primary', iconName, type = 'button', action, page, disabled = false, title } = {}) =>
  html`<button type="${type}" class="btn btn-${variant}"${action ? html` data-action="${action}"` : ''}${page ? html` data-page="${page}"` : ''}${disabled ? ' disabled' : ''}${title ? html` title="${title}"` : ''}>${iconName && icon(iconName, 17)}<span>${children}</span></button>`;

/**
 * Campo <select>. Sem `action`, o valor fica travado (comportamento do original,
 * onde esses seletores eram controlados e não alteravam nenhum estado).
 */
export function selectField({ value, options, label, action }) {
  const optionsMarkup = options.map(
    (option) => html`<option${option === value ? ' selected' : ''}>${option}</option>`,
  );
  const behavior = action ? html`data-action="${action}"` : html`data-locked-value="${value}"`;
  return html`<label class="field compact">${label && html`<span>${label}</span>`}<select ${behavior}>${optionsMarkup}</select></label>`;
}

export const logo = ({ light = false, name = 'AgroClima Cloud' } = {}) => {
  const [first, ...rest] = String(name || 'AgroClima Cloud').trim().split(/\s+/);
  return html`<div class="logo ${light ? 'logo-light' : ''}"><div class="logo-mark">${icon('leaf', 21)}</div><div><strong>${first || 'AgroClima'}</strong>${rest.length ? html`<span>${rest.join(' ')}</span>` : ''}</div></div>`;
};

export const badge = (children, tone = 'success') =>
  html`<span class="badge badge-${tone}"><span class="status-dot"></span>${children}</span>`;

export const card = (children, className = '') => html`<div class="card ${className}">${children}</div>`;

const metric = ({ icon: iconName, label, value, meta, tone = 'green' }) =>
  card(
    html`<div class="metric-icon tone-${tone}">${icon(iconName)}</div><div class="metric-copy"><span>${label}</span><strong>${value}</strong><small>${meta}</small></div>`,
    'metric',
  );

export const metricsGrid = (metrics, modifier = '') =>
  html`<div class="metrics-grid ${modifier}">${metrics.map(metric)}</div>`;

export const sectionHead = ({ title, subtitle, action }) =>
  html`<div class="section-head"><div><h2>${title}</h2>${subtitle && html`<p>${subtitle}</p>`}</div>${action}</div>`;

export const chartCard = ({ title, subtitle, legend, content }) =>
  card(
    html`<div class="card-title"><div><h3>${title}</h3><p>${subtitle}</p></div>${legend && badge(legend, 'info')}</div>${content}`,
    'chart-card',
  );
