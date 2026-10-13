import { html } from '../../utils/html.js';
import { VARIETIES } from '../../data/varieties.js';
import { icon } from '../../components/icons.js';
import { badge, button, card, chartCard, metricsGrid, sectionHead } from '../../components/ui.js';
import { lineChart } from '../../components/charts.js';
import { pageHeader } from '../../components/page-header.js';
import { comparisonTable, readingsTable, tableWrapper } from '../../components/tables.js';
import { page } from './page-layout.js';

function formatNumber(value, maximumFractionDigits = 1) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return 'Sem leitura';
  return Number(value).toLocaleString('pt-BR', { maximumFractionDigits });
}

function formatCapture(value) {
  if (!value) return 'Sem captura';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Sem captura' : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

function formatMetric(metric, property = 'current') {
  if (!metric || metric[property] === null || metric[property] === undefined) return 'Sem leitura';
  return `${formatNumber(metric[property])}${metric.unit ? ` ${metric.unit}` : ''}`;
}

function normalizeMetricName(value) {
  return String(value).toLowerCase().replaceAll('_', '');
}

// Únicas métricas tratadas pelo canal ThingSpeak: temperatura (field1) e umidade (field2).
const METRIC_ALIASES = {
  temperature: ['temperature', 'temperaturec', 'tempc', 'temp'],
  humidity: ['humidity', 'relativehumidity', 'airhumidity'],
};

function metricEntry(climate, requested) {
  const metrics = climate?.metrics || {};
  const aliases = METRIC_ALIASES[normalizeMetricName(requested)] || [normalizeMetricName(requested)];
  return Object.entries(metrics).find(([name]) => aliases.includes(normalizeMetricName(name))) || null;
}

function metricFor(climate, requested) {
  return metricEntry(climate, requested)?.[1] || null;
}

function seriesFor(climate, requested) {
  const entry = metricEntry(climate, requested);
  if (!entry) return null;
  const [key] = entry;
  const points = Array.isArray(climate?.series) ? climate.series : [];
  const values = [];
  const labels = [];
  points.forEach((point) => {
    const raw = point.values?.[key];
    if (raw === null || raw === undefined || !Number.isFinite(Number(raw))) return;
    values.push(Number(raw));
    const date = new Date(point.timestamp);
    labels.push(Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(date));
  });
  return { values, labels };
}

function emptySeries() {
  return { values: [], labels: [] };
}

function syncStrip(climate) {
  const available = Boolean(climate?.available);
  const label = available ? `${climate.records} leituras persistidas` : 'Leituras indisponíveis';
  const detail = available ? `Fonte: ${climate.source}${climate.channelId ? ` · canal ${climate.channelId}` : ''}.` : (climate?.message || 'Configure ThingSpeak para receber dados reais.');
  return html`<div class="sync-strip"><div>${icon(available ? 'wifi' : 'cloud', 17)}<strong>${label}</strong><span>${detail}</span></div>${badge(available ? 'Dados da API' : 'Sem fonte', available ? 'success' : 'warning')}</div>`;
}

function noModelCard(title, message, actionLabel, pageName) {
  return card(
    html`<div class="recommend-icon">${icon('model')}</div><div class="recommend-main"><span class="overline">Serviço não configurado</span><h3>${title}</h3><p>${message}</p></div>${button(actionLabel, { variant: 'soft', action: 'navigate', page: pageName })}`,
    'recommend',
  );
}

export function overviewPage({ variety, dashboard }) {
  const climate = dashboard?.climate;
  const plantations = dashboard?.plantations || {};
  const temperature = metricFor(climate, 'temperature');
  const humidity = metricFor(climate, 'humidity');
  const tempSeries = seriesFor(climate, 'temperature') || emptySeries();
  const humiditySeries = seriesFor(climate, 'humidity') || emptySeries();
  const comparison = { climateMetrics: climate?.metrics || {}, plantationsByVariety: plantations.byVariety || [] };
  return page(
    pageHeader({ title: 'Visão Geral', subtitle: 'Acompanhe as leituras disponíveis e os registros da sua produção.', variety }),
    syncStrip(climate),
    metricsGrid([
      { icon: 'thermo', label: 'Temperatura', value: formatMetric(temperature), meta: temperature ? `${formatMetric(temperature, 'minimum')} mín. · ${formatMetric(temperature, 'maximum')} máx.` : 'Aguardando sensor', tone: 'orange' },
      { icon: 'drop', label: 'Umidade do ar', value: formatMetric(humidity), meta: humidity ? `${humidity.samples} amostras` : 'Aguardando sensor', tone: 'blue' },
      { icon: 'leaf', label: 'Plantações em cultivo', value: plantations.growing ?? 0, meta: 'Dados da API Java' },
      { icon: 'truck', label: 'Previsão de colheita', value: 'Não configurada', meta: 'Nenhum modelo de produção ativo', tone: 'purple' },
      { icon: 'warning', label: 'Leituras climáticas', value: climate?.records ?? 0, meta: climate?.available ? 'Registros reais recebidos' : 'Sem leituras no período', tone: climate?.available ? 'green' : 'orange' },
    ]),
    html`<div class="grid-2">${chartCard({ title: 'Temperatura nas últimas 24 horas', subtitle: 'Leituras recebidas pela API · °C', legend: temperature ? formatMetric(temperature) : 'Sem leitura', content: lineChart({ data: tempSeries.values, labels: tempSeries.labels }) })}${chartCard({ title: 'Umidade do ar', subtitle: 'Leituras recebidas pela API · %', legend: humidity ? formatMetric(humidity) : 'Sem leitura', content: lineChart({ data: humiditySeries.values, labels: humiditySeries.labels, color: 'blue' }) })}</div>`,
    html`<div class="recommend-grid">${noModelCard('Indicação de colheita indisponível', 'Ainda não há um modelo preditivo configurado. Nenhuma data ou probabilidade foi inventada.', 'Ver previsões', 'Previsões')}${noModelCard('Informações de mercado indisponíveis', 'A API não está ligada a uma fonte de preços ou demanda. Consulte novamente quando uma fonte for configurada.', 'Ver mercado', 'Mercado e Exportação')}</div>`,
    comparisonTable({ plantations: [], varieties: VARIETIES, comparison }),
  );
}

function integrationStatus(climate) {
  const available = Boolean(climate?.available);
  return html`<div class="integration-status"><div class="thing-logo">${icon('cloud')}</div><div><span>Origem das informações</span><strong>${climate?.source || 'ThingSpeak'}</strong></div>${badge(available ? 'Disponível' : 'Não configurado', available ? 'success' : 'warning')}<div class="status-detail"><span>Registros no período</span><strong>${climate?.records ?? 0}</strong></div><div class="status-detail"><span>Canal</span><strong>${climate?.channelId || 'Não informado'}</strong></div></div>`;
}

export function monitoringPage({ variety, climate }) {
  const temperature = metricFor(climate, 'temperature');
  const humidity = metricFor(climate, 'humidity');
  const tempSeries = seriesFor(climate, 'temperature') || emptySeries();
  const humiditySeries = seriesFor(climate, 'humidity') || emptySeries();
  return page(
    pageHeader({ title: 'Monitoramento Climático', subtitle: 'Leituras persistidas pelo serviço climático para sua conta.', variety }),
    integrationStatus(climate),
    metricsGrid([
      { icon: 'thermo', label: 'Temperatura atual', value: formatMetric(temperature), meta: temperature ? `Máx. ${formatMetric(temperature, 'maximum')}` : 'Sem leitura', tone: 'orange' },
      { icon: 'drop', label: 'Umidade atual', value: formatMetric(humidity), meta: humidity ? `Mín. ${formatMetric(humidity, 'minimum')}` : 'Sem leitura', tone: 'blue' },
      { icon: 'activity', label: 'Amostras', value: climate?.records ?? 0, meta: 'No período retornado pela API' },
      { icon: 'cloud', label: 'Última captura', value: formatCapture(climate?.latestAt), meta: climate?.channelId ? `Canal ${climate.channelId}` : 'Canal não configurado', tone: 'purple' },
    ], 'four'),
    html`<div class="grid-2">${chartCard({ title: 'Temperatura por captura', subtitle: 'Dados ThingSpeak persistidos · °C', content: lineChart({ data: tempSeries.values, labels: tempSeries.labels }) })}${chartCard({ title: 'Umidade por captura', subtitle: 'Dados ThingSpeak persistidos · %', content: lineChart({ data: humiditySeries.values, labels: humiditySeries.labels, color: 'blue' }) })}</div>`,
    readingsTable(climate),
  );
}

function unavailableAnalysis(title, message) {
  return card(html`<div class="empty-state"><span>${icon('model')}</span><strong>${title}</strong><small>${message}</small></div>`, 'table-card');
}

export function forecastsPage({ variety, forecast, climate }) {
  const available = Boolean(forecast?.available && forecast?.predictions?.length);
  const temperature = metricFor(climate, 'temperature');
  const tempSeries = seriesFor(climate, 'temperature') || emptySeries();
  return page(
    pageHeader({ title: 'Previsões', subtitle: `Dados de previsão para ${variety}; somente resultados de modelos ativos são exibidos.`, variety }),
    metricsGrid([
      { icon: 'quality', label: 'Modelo', value: available ? (forecast.model || 'Ativo') : 'Não configurado', meta: forecast?.message || 'Sem predições', tone: 'blue' },
      { icon: 'clock', label: 'Horizonte', value: available ? `${forecast.predictions.length} pontos` : '—', meta: 'Sem estimativas inventadas', tone: 'purple' },
      { icon: 'thermo', label: 'Temperatura atual', value: formatMetric(temperature), meta: 'Leitura observada, não previsão', tone: 'orange' },
      { icon: 'trend', label: 'Previsões disponíveis', value: available ? 'Sim' : 'Não', meta: available ? 'Fonte de modelo configurada' : 'Nenhum modelo ativo', tone: available ? 'green' : 'orange' },
    ], 'four'),
    html`<div class="grid-main">${chartCard({ title: 'Leituras observadas', subtitle: 'Série climática real; não representa previsão', content: lineChart({ data: tempSeries.values, labels: tempSeries.labels }) })}${available ? card(html`<div class="insight-mark">${icon('model')}</div><span class="overline">Modelo conectado</span><h3>${forecast.model}</h3><ul>${forecast.predictions.map((item) => html`<li>${item.date || item.timestamp || ''} · ${item.value}</li>`)}</ul>`, 'insight-card') : unavailableAnalysis('Previsões indisponíveis', forecast?.message || 'Configure um modelo antes de solicitar previsões.')}</div>`,
  );
}

export function marketPage({ variety, market, dashboard }) {
  const available = Boolean(market?.available && market?.series?.length);
  const rows = available ? market.series.map((item) => html`<tr><td>${item.date || item.timestamp || '—'}</td><td>${item.price ?? '—'}</td><td>${item.market || '—'}</td><td>${item.currency || '—'}</td></tr>`) : [];
  return page(
    pageHeader({ title: 'Mercado e Exportação', subtitle: `Informações de mercado para ${variety} somente serão exibidas após configurar uma fonte real.`, variety }),
    metricsGrid([
      { icon: 'market', label: 'Fonte de preço', value: available ? (market.source || 'Conectada') : 'Não configurada', meta: 'Integração externa necessária' },
      { icon: 'trend', label: 'Série de preços', value: available ? market.series.length : '—', meta: 'Nenhum valor demonstrativo exibido', tone: 'blue' },
      { icon: 'activity', label: 'Plantações registradas', value: dashboard?.plantations?.totalPlantations ?? 0, meta: 'API Java', tone: 'purple' },
      { icon: 'truck', label: 'Demanda', value: 'Sem dados', meta: 'Sem fonte de mercado', tone: 'orange' },
    ], 'four'),
    available ? card(html`${sectionHead({ title: 'Dados de mercado', subtitle: `Fonte: ${market.source || 'API configurada'}` })}${tableWrapper(['Data', 'Preço', 'Mercado', 'Moeda'], rows)}`, 'table-card') : unavailableAnalysis('Dados de mercado indisponíveis', market?.message || 'Nenhuma fonte de preços ou demanda está configurada.'),
  );
}
