import { html } from '../../utils/html.js';
import { icon } from '../../components/icons.js';
import { badge, button, card, chartCard, metricsGrid, sectionHead } from '../../components/ui.js';
import { barChart, chartLegend, donutChart, lineChart } from '../../components/charts.js';
import { pageHeader } from '../../components/page-header.js';
import { readingsTable, tableWrapper } from '../../components/tables.js';
import { VARIETIES } from '../../data/varieties.js';
import { page } from './page-layout.js';

const number = (value, digits = 1) => value === null || value === undefined || !Number.isFinite(Number(value))
  ? '—'
  : Number(value).toLocaleString('pt-BR', { maximumFractionDigits: digits });

function metricEntry(climate, key) {
  const aliases = {
    temperature: ['temperature', 'temperaturec', 'tempc', 'temp'],
    humidity: ['humidity', 'relativehumidity', 'airhumidity'],
  }[key] || [key];
  return Object.entries(climate?.metrics || {}).find(([name]) => aliases.includes(name.toLowerCase().replaceAll('_', ''))) || null;
}

function metricSeries(climate, key) {
  const entry = metricEntry(climate, key);
  if (!entry) return { values: [], labels: [] };
  const [name] = entry;
  const values = [];
  const labels = [];
  (climate?.series || []).forEach((point) => {
    const raw = point.values?.[name];
    if (raw === null || raw === undefined || !Number.isFinite(Number(raw))) return;
    values.push(Number(raw));
    const date = new Date(point.timestamp);
    labels.push(Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(date));
  });
  return { values, labels };
}

function pipelineHealth(sources = [], quality = null, forecast = null) {
  const source = (name) => sources.find((item) => item.source === name);
  const climateSource = source('ThingSpeak');
  const javaSource = source('API Java');
  const items = [
    { name: 'API Java e persistência', detail: javaSource?.message || 'Origem de usuários e plantações', icon: 'database', available: javaSource?.available },
    { name: 'Leituras climáticas', detail: climateSource?.configured ? climateSource.message : 'ThingSpeak não configurado', icon: 'cloud', available: climateSource?.available },
    { name: 'Qualidade das leituras', detail: quality?.available ? `${quality.totalRecords} registros avaliados` : 'Sem amostras no período', icon: 'quality', available: quality?.available },
    { name: 'Modelo preditivo', detail: forecast?.available ? (forecast.model || 'Modelo conectado') : 'Nenhum modelo configurado', icon: 'model', available: forecast?.available },
  ];
  return card(
    html`${sectionHead({ title: 'Estado das fontes de dados', subtitle: 'Situação reportada pelos serviços; itens sem fonte não são simulados.' })}<div class="pipeline-list">${items.map((item) => html`<div><div class="pipe-icon tone-${item.available ? 'green' : 'orange'}">${icon(item.icon)}</div><div><strong>${item.name}</strong><span>${item.detail}</span></div>${badge(item.available ? 'Disponível' : 'Indisponível', item.available ? 'success' : 'warning')}</div>`)}</div>`,
    'table-card',
  );
}

export function analyticsDashboardPage({ analystDashboard, dashboard, forecast }) {
  const summary = analystDashboard?.summary || dashboard;
  const climate = summary?.climate;
  const quality = analystDashboard?.quality;
  const temperature = metricEntry(climate, 'temperature')?.[1];
  const tempSeries = metricSeries(climate, 'temperature');
  const humiditySeries = metricSeries(climate, 'humidity');
  const valid = quality?.validRecords || 0;
  const review = quality?.reviewRecords || 0;
  const rejected = quality?.rejectedRecords || 0;
  const totalQuality = quality?.totalRecords || 0;
  const integrity = chartCard({
    title: 'Qualidade dos dados',
    subtitle: 'Contagens retornadas pela análise do serviço Python',
    content: donutChart({
      total: quality?.completenessPercent === null || quality?.completenessPercent === undefined ? '—' : `${number(quality.completenessPercent)}%`,
      caption: 'completude',
      legend: [
        { tone: 'green', label: 'Válidos', value: number(valid, 0) },
        { tone: 'gold', label: 'Revisar', value: number(review, 0) },
        { tone: 'red', label: 'Rejeitados', value: number(rejected, 0) },
      ],
      segments: [{ tone: 'green', value: valid }, { tone: 'gold', value: review }, { tone: 'red', value: rejected }],
    }),
  });
  return page(
    pageHeader({ title: 'Dashboard Analítico', subtitle: 'Indicadores climáticos, qualidade e plantações entregues pelos serviços.', varietyMode: 'hidden' }),
    metricsGrid([
      { icon: 'database', label: 'Registros climáticos', value: number(climate?.records || 0, 0), meta: climate?.available ? 'Leituras persistidas e agregadas' : 'Sem leituras no período' },
      { icon: 'cloud', label: 'Última captura', value: climate?.latestAt ? new Intl.DateTimeFormat('pt-BR', { timeStyle: 'short' }).format(new Date(climate.latestAt)) : '—', meta: climate?.channelId ? `Canal ${climate.channelId}` : 'Canal não configurado', tone: 'blue' },
      { icon: 'quality', label: 'Completude', value: quality?.completenessPercent == null ? '—' : `${number(quality.completenessPercent)}%`, meta: totalQuality ? `${number(totalQuality, 0)} registros avaliados` : 'Sem amostras', tone: 'green' },
      { icon: 'model', label: 'Modelo preditivo', value: forecast?.available ? (forecast.model || 'Ativo') : 'Não configurado', meta: forecast?.message || 'Nenhuma estimativa gerada', tone: 'purple' },
      { icon: 'leaf', label: 'Plantações', value: number(summary?.plantations?.totalPlantations || 0, 0), meta: `${number(summary?.plantations?.totalPlants || 0, 0)} plantas registradas`, tone: 'orange' },
    ]),
    html`<div class="grid-main">${chartCard({ title: 'Temperatura observada', subtitle: 'Leituras recebidas pela API · °C', legend: temperature ? `${number(temperature.current)} ${temperature.unit || '°C'}` : 'Sem leitura', content: html`${chartLegend([{ tone: 'green', label: 'Observado' }])}${lineChart({ data: tempSeries.values, labels: tempSeries.labels })}` })}${integrity}</div>`,
    html`<div class="grid-2">${chartCard({ title: 'Umidade observada', subtitle: 'Leituras recebidas pela API · %', content: lineChart({ data: humiditySeries.values, labels: humiditySeries.labels, color: 'blue' }) })}${pipelineHealth(summary?.sources || [], quality, forecast)}</div>`,
  );
}

function formatEventDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Data indisponível' : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function analystHistoryPage({ plantationHistory = [] } = {}) {
  const events = plantationHistory.flatMap((plantation) => {
    const rows = [{
      id: `${plantation.id}-planting`,
      timestamp: plantation.plantedAt,
      resource: 'Plantações',
      title: `Plantio de ${plantation.variety} cadastrado`,
      detail: `${Number(plantation.quantity || 0).toLocaleString('pt-BR')} plantas${plantation.field ? ` · ${plantation.field}` : ''}.`,
    }];
    if (plantation.harvestedAt) rows.push({
      id: `${plantation.id}-harvest`,
      timestamp: plantation.harvestedAt,
      resource: 'Colheita',
      title: `Colheita de ${plantation.variety} registrada`,
      detail: 'Data registrada pelo serviço Java.',
    });
    return rows;
  }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const harvests = events.filter((event) => event.resource === 'Colheita').length;
  return page(
    pageHeader({ title: 'Histórico', subtitle: 'Linha do tempo baseada nos registros de plantações e colheitas do serviço Java.', varietyMode: 'hidden' }),
    metricsGrid([
      { icon: 'clock', label: 'Eventos de plantio', value: events.length - harvests, meta: 'Registros consultados', tone: 'blue' },
      { icon: 'leaf', label: 'Áreas no histórico', value: plantationHistory.length, meta: 'Escopo autorizado pelo servidor', tone: 'green' },
      { icon: 'activity', label: 'Colheitas registradas', value: harvests, meta: 'Datas informadas no servidor', tone: 'purple' },
    ], 'four'),
    card(
      html`${sectionHead({ title: 'Linha do tempo', subtitle: 'O servidor controla o escopo das plantações visíveis para seu perfil.' })}
        ${events.length ? html`<div class="event-timeline">${events.map((event) => html`<article class="event-timeline-item"><span class="event-timeline-icon">${icon(event.resource === 'Colheita' ? 'check' : 'leaf', 17)}</span><div class="event-timeline-copy"><div><span class="overline">${event.resource}</span><time>${formatEventDate(event.timestamp)}</time></div><h3>${event.title}</h3><p>${event.detail}</p></div>${badge('Persistido', 'success')}</article>`)}</div>` : html`<div class="empty-state"><span>${icon('clock')}</span><strong>Nenhum registro encontrado</strong><small>A API Java não retornou plantações para esse período.</small></div>`}`,
      'table-card analyst-history-card',
    ),
  );
}

function catalogNames(varieties, records) {
  const fromApi = (varieties || []).filter((entry) => entry.active !== false).map((entry) => entry.name);
  return [...new Set([...fromApi, ...(records || []).map((entry) => entry.variety)])];
}

function reportTableRows(plantations, varieties, climate) {
  const names = catalogNames(varieties, plantations);
  const rows = names.map((name) => {
    const entries = plantations.filter((item) => item.variety === name);
    const plants = entries.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const harvested = entries.filter((item) => item.status === 'Colhida').length;
    const color = VARIETIES.find((entry) => entry.name === name)?.color || 'green';
    return html`<tr><td><div class="variety-cell"><span class="grape-dot grape-${color}"></span><strong>${name}</strong></div></td><td>${entries.length}</td><td>${plants.toLocaleString('pt-BR')}</td><td>${harvested}</td></tr>`;
  });
  const metrics = Object.entries(climate?.metrics || {}).map(([name, metric]) => `${name}: ${metric.current ?? '—'} ${metric.unit || ''}`).join(' · ');
  return html`${metrics && html`<p class="comparison-climate">Leituras agregadas por canal: ${metrics}. Não há vínculo sensor-variedade.</p>`}${tableWrapper(['Variedade', 'Plantações', 'Plantas registradas', 'Colhidas'], rows)}`;
}

export function analystReportsPage({ plantations = [], plantationHistory = [], varieties = [], analystDashboard, dashboard }) {
  const records = plantationHistory.length ? plantationHistory : plantations;
  const summary = analystDashboard?.summary || dashboard;
  const totalPlants = records.reduce((total, item) => total + Number(item.quantity || 0), 0);
  const plantCounts = catalogNames(varieties, records).map((name) => records.filter((item) => item.variety === name).reduce((sum, item) => sum + Number(item.quantity || 0), 0));
  const labels = catalogNames(varieties, records).map((name) => VARIETIES.find((entry) => entry.name === name)?.short || name);
  return page(
    pageHeader({ title: 'Relatórios', subtitle: 'Dados climáticos analisados e plantações consultadas com autorização da API.', varietyMode: 'hidden' }),
    html`<div class="report-notice">${icon('database', 16)}<span>Somente dados reais retornados pelos serviços são incluídos; não há preços ou modelos simulados.</span><button type="button" class="btn btn-primary" data-action="download-analyst-report">${icon('download', 16)} Gerar relatório CSV</button></div>`,
    metricsGrid([
      { icon: 'grid', label: 'Variedades cadastradas', value: catalogNames(varieties, records).length, meta: 'Catálogo da API Java' },
      { icon: 'leaf', label: 'Plantações consultadas', value: records.length, meta: 'Escopo definido pelo servidor', tone: 'green' },
      { icon: 'activity', label: 'Plantas registradas', value: totalPlants.toLocaleString('pt-BR'), meta: 'Somatório retornado pela API', tone: 'blue' },
      { icon: 'cloud', label: 'Leituras climáticas', value: summary?.climate?.records ?? 0, meta: summary?.climate?.available ? 'API Python' : 'Sem leituras disponíveis', tone: 'purple' },
    ], 'four'),
    html`<div class="grid-2">${chartCard({ title: 'Temperatura observada', subtitle: 'Leituras reais do canal ThingSpeak', content: lineChart({ data: (summary?.climate?.series || []).map((point) => Number(point.values?.temperature)).filter(Number.isFinite) }) })}${chartCard({ title: 'Plantas por variedade', subtitle: 'Quantidade em plantações persistidas', content: barChart(plantCounts, labels) })}</div>`,
    card(html`${sectionHead({ title: 'Resumo por variedade', subtitle: 'A API não atribui medições agregadas a uma variedade específica.' })}${reportTableRows(records, varieties, summary?.climate)}`, 'table-card report-table-card'),
  );
}

export function buildAnalystCsv(state = {}) {
  const records = state.plantationHistory?.length ? state.plantationHistory : (state.plantations || []);
  const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const lines = [
    ['Tipo de registro', 'Variedade', 'Quantidade', 'Talhão', 'Início', 'Colheita', 'Status'],
    ...records.map((item) => ['Plantação', item.variety, item.quantity, item.field, item.plantedAt, item.harvestedAt, item.status]),
    ['Métrica climática', '', '', '', '', '', ''],
    ...Object.entries(state.analystDashboard?.summary?.climate?.metrics || state.dashboard?.climate?.metrics || {}).map(([name, metric]) => [name, metric.current, metric.average, metric.minimum, metric.maximum, metric.unit, metric.samples]),
  ];
  return `\uFEFF${lines.map((line) => line.map(quote).join(';')).join('\r\n')}`;
}

export function qualityPage({ variety, quality, analystDashboard, climate }) {
  const result = quality || analystDashboard?.quality;
  const climateData = climate || analystDashboard?.summary?.climate;
  const completeness = result?.completenessPercent;
  const valid = result?.validRecords || 0;
  const review = result?.reviewRecords || 0;
  const rejected = result?.rejectedRecords || 0;
  return page(
    pageHeader({ title: 'Qualidade dos Dados', subtitle: 'Validação e completude das leituras processadas pelo serviço Python.', variety }),
    metricsGrid([
      { icon: 'quality', label: 'Completude', value: completeness == null ? '—' : `${number(completeness)}%`, meta: result?.available ? `${number(result.totalRecords, 0)} registros avaliados` : 'Sem amostras', tone: 'green' },
      { icon: 'check', label: 'Válidos', value: number(valid, 0), meta: 'Classificação da API', tone: 'blue' },
      { icon: 'warning', label: 'Para revisar', value: number(review, 0), meta: 'Valores fora da faixa ou incompletos', tone: 'orange' },
      { icon: 'activity', label: 'Rejeitados', value: number(rejected, 0), meta: 'Não utilizados nos cálculos', tone: 'purple' },
    ], 'four'),
    chartCard({ title: 'Qualidade das leituras', subtitle: 'Contagens reais reportadas pelo serviço Python', content: donutChart({
      total: result?.totalRecords ?? 0,
      caption: 'registros',
      legend: [{ tone: 'green', label: 'Válidos', value: number(valid, 0) }, { tone: 'gold', label: 'Revisar', value: number(review, 0) }, { tone: 'red', label: 'Rejeitados', value: number(rejected, 0) }],
      segments: [{ tone: 'green', value: valid }, { tone: 'gold', value: review }, { tone: 'red', value: rejected }],
    }) }),
    readingsTable(climateData),
  );
}

export function modelsPage({ forecast, modelMessage = '' } = {}) {
  return page(
    pageHeader({ title: 'Modelos Preditivos', subtitle: 'Estado dos modelos de previsão conectados ao serviço Python.', varietyMode: 'hidden' }),
    card(html`<div class="model-badge">${icon('model', 28)}</div><div><span class="overline">Estado da análise</span><h2>${forecast?.available ? (forecast.model || 'Modelo conectado') : 'Nenhum modelo configurado'}</h2><p>${forecast?.message || modelMessage || 'O serviço não retornou um modelo preditivo ativo.'}</p></div>${badge(forecast?.available ? 'Disponível' : 'Indisponível', forecast?.available ? 'success' : 'warning')}`, 'model-hero'),
    card(html`<div class="empty-state"><span>${icon('activity')}</span><strong>Treinamento não disponível</strong><small>Esta implantação não possui endpoint de treinamento nem métricas de modelo. A interface não gera resultados artificiais.</small></div>`, 'table-card'),
  );
}
