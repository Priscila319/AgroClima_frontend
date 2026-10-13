import { html } from '../utils/html.js';

/** Gráficos SVG/CSS que só visualizam valores recebidos pela aplicação. */
const GRID_LINES_Y = [44, 84, 124, 164];
const CHART_LEFT = 18;
const CHART_WIDTH = 564;

function toSvgPoints(series) {
  const minValue = Math.min(...series);
  const maxValue = Math.max(...series);
  const padding = maxValue === minValue ? Math.max(1, Math.abs(maxValue) * 0.05) : (maxValue - minValue) * 0.08;
  const min = minValue - padding;
  const max = maxValue + padding;
  return series.map((value, index) => {
    const x = CHART_LEFT + index * (CHART_WIDTH / (series.length - 1));
    const y = 164 - ((value - min) / (max - min)) * 120;
    return `${x},${y}`;
  }).join(' ');
}

function emptyChart(message) {
  return html`<div class="chart-empty"><span>Sem dados</span><small>${message}</small></div>`;
}

export function lineChart({ data = [], secondary, color = 'green', labels = [] } = {}) {
  const values = (Array.isArray(data) ? data : []).map(Number).filter(Number.isFinite);
  if (values.length < 2) return emptyChart('São necessárias ao menos duas leituras reais para desenhar a série.');
  const axisLabels = Array.isArray(labels) && labels.length === values.length
    ? labels
    : values.map((_, index) => String(index + 1));
  const secondaryValues = Array.isArray(secondary) && secondary.length === values.length
    ? secondary.map(Number).filter(Number.isFinite)
    : null;
  return html`<div class="chart-wrap"><svg class="line-chart" viewBox="0 0 600 190" preserveAspectRatio="none">
    ${GRID_LINES_Y.map((y) => html`<line x1="18" y1="${y}" x2="582" y2="${y}" class="gridline"/>`)}
    <defs><linearGradient id="fill-${color}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="currentColor" stop-opacity=".18"/><stop offset="100%" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs>
    <polygon points="${toSvgPoints(values)} 582,170 18,170" class="area chart-${color}" fill="url(#fill-${color})"/>
    <polyline points="${toSvgPoints(values)}" class="series chart-${color}"/>
    ${secondaryValues && secondaryValues.length === values.length && html`<polyline points="${toSvgPoints(secondaryValues)}" class="series chart-blue dashed"/>`}
  </svg><div class="axis-labels">${axisLabels.map((label) => html`<span>${label}</span>`)}</div></div>`;
}

export const barChart = (values = [], labels = []) => {
  const safeValues = (Array.isArray(values) ? values : []).map((value) => Math.max(0, Number(value) || 0));
  if (!safeValues.length) return emptyChart('Nenhum registro real está disponível para este gráfico.');
  const safeLabels = Array.isArray(labels) && labels.length === safeValues.length
    ? labels
    : safeValues.map((_, index) => String(index + 1));
  const max = Math.max(1, ...safeValues);
  return html`<div class="bar-chart">${safeValues.map(
    (value, index) => html`<div class="bar-col"><div class="bar-value">${value}</div><div class="bar" style="height:${Math.max(3, value / max * 100)}%"></div><span>${safeLabels[index]}</span></div>`,
  )}</div>`;
};

export const chartLegend = (items = []) =>
  html`<div class="chart-legend">${items.map(({ tone, label }) => html`<span><i class="legend-${tone}"></i>${label}</span>`)}</div>`;

export function donutChart({ modifier = '', total, caption, legend = [], segments = [] }) {
  let gradient = '';
  if (segments.length) {
    const sum = segments.reduce((amount, segment) => amount + Number(segment.value || 0), 0);
    let start = 0;
    gradient = segments.map((segment, index) => {
      const end = index === segments.length - 1 ? 100 : start + (sum ? Number(segment.value || 0) / sum * 100 : 100 / segments.length);
      const color = { green: 'var(--green)', blue: 'var(--blue)', gold: 'var(--gold)', red: 'var(--red)' }[segment.tone] || 'var(--muted)';
      const stop = `${color} ${start}% ${end}%`;
      start = end;
      return stop;
    }).join(', ');
  }
  return html`<div class="donut-wrap"><div class="donut ${modifier}"${gradient ? html` style="background:conic-gradient(${gradient})"` : ''}><div><strong>${total ?? '—'}</strong><span>${caption || ''}</span></div></div><div class="donut-labels">${legend.map(
    ({ tone, label, value }) => html`<span><i class="${tone}"></i>${label} <strong>${value}</strong></span>`,
  )}</div></div>`;
}
