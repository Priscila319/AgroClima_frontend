import { html } from '../utils/html.js';
import { VARIETIES } from '../data/varieties.js';
import { badge, button, card, sectionHead } from './ui.js';

const tableWrapper = (head, body) =>
  html`<div class="table-scroll"><table><thead><tr>${head.map((column) => html`<th>${column}</th>`)}</tr></thead><tbody>${body}</tbody></table></div>`;

export function comparisonTable({ plantations = [], varieties = VARIETIES, comparison = null } = {}) {
  const varietyNames = [...new Set([
    ...varieties.map((variety) => typeof variety === 'string' ? variety : variety.name),
    ...(comparison?.plantationsByVariety || []).map((item) => item.variety),
    ...plantations.map((item) => item.variety),
  ])].filter(Boolean);
  const rows = varietyNames.map((name) => {
    const serverSummary = comparison?.plantationsByVariety?.find((item) => item.variety === name);
    const entries = plantations.filter((plantation) => plantation.variety === name);
    const plants = serverSummary?.plants ?? entries.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const areas = serverSummary?.plantations ?? entries.length;
    const harvested = serverSummary?.harvested ?? entries.filter((entry) => entry.status === 'Colhida').length;
    return html`<tr><td><strong>${name}</strong></td><td>${areas}</td><td>${plants.toLocaleString('pt-BR')}</td><td>${harvested}</td></tr>`;
  });
  const metrics = comparison?.climateMetrics || {};
  const climateText = Object.entries(metrics).map(([name, item]) => `${name}: ${item.current ?? '—'} ${item.unit || ''}`).join(' · ');
  return card(
    html`${sectionHead({
      title: 'Comparativo de plantações',
      subtitle: 'Os dados climáticos são agregados por canal; a API não associa sensores a uma variedade.',
      action: button('Ver comparação', { variant: 'ghost', iconName: 'compare', action: 'navigate', page: 'Comparação' }),
    })}${climateText && html`<p class="comparison-climate">Leituras atuais: ${climateText}</p>`}${rows.length
      ? tableWrapper(['Variedade', 'Áreas cadastradas', 'Plantas registradas', 'Áreas colhidas'], rows)
      : html`<div class="empty-state compact"><small>Nenhuma plantação está cadastrada no servidor.</small></div>`}`,
    'table-card',
  );
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Data indisponível' : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'medium' }).format(date);
}

const MEASUREMENT_LABELS = { temperature: 'Temperatura (°C)', humidity: 'Umidade (%)' };

export function readingsTable(climate = null) {
  const points = Array.isArray(climate?.series) ? climate.series.slice().reverse() : [];
  const keys = [...new Set(points.flatMap((point) => Object.keys(point.values || {})))];
  const headers = ['Data / hora', ...keys.map((key) => MEASUREMENT_LABELS[key] || key), 'Canal', 'Qualidade'];
  const rows = points.length
    ? points.slice(0, 12).map((point) => html`<tr><td>${formatDate(point.timestamp)}</td>${keys.map((key) => html`<td>${point.values?.[key] ?? '—'}</td>`)}<td>${climate?.channelId || 'ThingSpeak'}</td><td>${badge('Disponível', 'success')}</td></tr>`)
    : [html`<tr><td colspan="${headers.length}"><div class="empty-state compact"><small>Nenhuma leitura climática foi retornada pela API no período.</small></div></td></tr>`];
  return card(
    html`${sectionHead({
      title: 'Leituras recentes',
      subtitle: climate?.available ? `${climate.records} registros retornados pela API${climate.latestAt ? ` · atualização ${formatDate(climate.latestAt)}` : ''}.` : 'Aguardando uma fonte ThingSpeak configurada e leituras persistidas.',
      action: points.length ? button('Exportar CSV', { variant: 'ghost', iconName: 'download', action: 'download-climate-report' }) : null,
    })}${tableWrapper(headers, rows)}`,
    'table-card',
  );
}

export { tableWrapper };
