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

const RISK_LABELS = { LOW: 'Baixo', MODERATE: 'Moderado', HIGH: 'Alto', INSUFFICIENT_DATA: 'Sem dados' };
const RISK_TONES = { LOW: 'success', MODERATE: 'warning', HIGH: 'danger', INSUFFICIENT_DATA: 'neutral' };
const ALGORITHM_LABELS = { auto: 'Automático (melhor RMSE)', random_forest: 'Random Forest', gradient_boosting: 'Gradient Boosting' };
const HARVEST_LABELS = { REACHED: 'Alvo atingido', PROJECTED: 'Projetada', BEYOND_HORIZON: 'Além do horizonte', INSUFFICIENT_DATA: 'Sem dados' };

const riskBadge = (level) => badge(RISK_LABELS[level] || RISK_LABELS.INSUFFICIENT_DATA, RISK_TONES[level] || 'neutral');
const algorithmLabel = (key) => ALGORITHM_LABELS[key] || key || '—';

function formatDate(value) {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

function modelTrainingPanel({ canManage, status, busy, algorithm, horizon, message, error }) {
  if (!canManage) return '';
  const active = status?.activeModel;
  const enabled = Boolean(status?.mlEnabled);
  const completeDays = status?.completeDays ?? 0;
  const minDays = status?.mlMinTrainDays ?? 60;
  const algorithmOptions = Object.entries(ALGORITHM_LABELS).map(
    ([value, label]) => html`<option value="${value}"${value === algorithm ? ' selected' : ''}>${label}</option>`,
  );
  const horizonOptions = [1, 2, 3, 5, 7].map(
    (value) => html`<option value="${value}"${value === Number(horizon) ? ' selected' : ''}>${value} dia(s)</option>`,
  );
  return card(html`
    ${sectionHead({ title: 'Treinamento de machine learning', subtitle: 'Treina no histórico real da estação e valida por walk-forward (MAE / RMSE / R²).' })}
    ${enabled ? '' : html`<div class="form-feedback warning" role="status">${icon('warning', 16)}<span>Histórico insuficiente: ${number(completeDays, 0)} dia(s) completo(s), mínimo de ${number(minDays, 0)}. O treinamento é habilitado automaticamente ao acumular dados.</span></div>`}
    <div class="model-controls">
      <label class="field compact"><span>Algoritmo</span><select data-action="model-algorithm"${busy ? ' disabled' : ''}>${algorithmOptions}</select></label>
      <label class="field compact"><span>Horizonte</span><select data-action="model-horizon"${busy ? ' disabled' : ''}>${horizonOptions}</select></label>
      <div class="button-row">
        ${button(busy ? 'Treinando…' : 'Treinar modelo', { iconName: 'model', action: 'train-model', disabled: busy || !enabled })}
        ${active ? button('Remover modelo', { variant: 'ghost', iconName: 'close', action: 'delete-model', disabled: busy }) : ''}
        ${button('Atualizar', { variant: 'ghost', iconName: 'activity', action: 'refresh-models', disabled: busy })}
      </div>
    </div>
    ${error ? html`<div class="form-feedback error" role="alert">${icon('warning', 16)}<span>${error}</span></div>` : ''}
    ${message ? html`<div class="form-feedback success" role="status">${icon('check', 16)}<span>${message}</span></div>` : ''}
    ${active ? html`<p class="model-meta">Modelo ativo: <strong>${algorithmLabel(active.algorithm)}</strong> · treinado em ${formatDate(active.trainedAt)} · ${number(active.trainingDays, 0)} dias · ${number(active.featureCount, 0)} features · horizonte ${number(active.horizonDays, 0)} dia(s).</p>` : ''}
  `, 'table-card model-training');
}

function modelForecastSection(forecast) {
  const predictions = Array.isArray(forecast?.predictions) ? forecast.predictions : [];
  if (!forecast?.available || !predictions.length) {
    return card(html`<div class="empty-state"><span>${icon('model')}</span><strong>Projeção indisponível</strong><small>${forecast?.message || 'Acumule dias completos de leitura para habilitar a projeção.'}</small></div>`, 'table-card');
  }
  const rows = predictions.map((item) => html`<tr>
    <td>${formatDate(item.date)}</td>
    <td>${number(item.temperature)} °C</td>
    <td class="muted-cell">${number(item.temperatureLow)} – ${number(item.temperatureHigh)} °C</td>
    <td>${number(item.humidity)}%</td>
    <td class="muted-cell">${number(item.humidityLow)} – ${number(item.humidityHigh)}%</td>
  </tr>`);
  const chart = lineChart({
    data: predictions.map((item) => item.temperature),
    labels: predictions.map((item) => formatDate(item.date)),
    color: 'green',
  });
  return html`<div class="grid-main">
    ${chartCard({ title: 'Temperatura projetada', subtitle: `Modelo ${forecast.model || '—'} · intervalo de ~95%`, content: chart })}
    ${card(html`${sectionHead({ title: 'Projeção por dia', subtitle: 'Faixa Low/High = intervalo de confiança do backtest.' })}${tableWrapper(['Data', 'Temperatura', 'Faixa °C', 'Umidade', 'Faixa %'], rows)}`, 'table-card')}
  </div>`;
}

function modelMetricsSection(forecast, status) {
  const metrics = forecast?.metrics || {};
  const temperature = metrics.temperature || {};
  const humidity = metrics.humidity || {};
  const active = status?.activeModel;
  const candidates = Array.isArray(active?.candidates) ? active.candidates : [];
  const candidateRows = candidates.map((candidate) => html`<tr>
    <td>${algorithmLabel(candidate.algorithm)}${candidate.selected ? ' ✓' : ''}</td>
    <td>${number(candidate.metrics?.temperature?.mae, 2)}</td>
    <td>${number(candidate.metrics?.temperature?.rmse, 2)}</td>
    <td>${number(candidate.metrics?.temperature?.r2, 3)}</td>
    <td>${number(candidate.metrics?.humidity?.rmse, 2)}</td>
  </tr>`);
  return card(html`
    ${sectionHead({ title: 'Métricas de validação (backtest walk-forward)', subtitle: forecast?.backtestDays ? `${forecast.backtestDays} origens de teste · erro real, sem dados artificiais.` : 'Erro medido em dados retidos do histórico.' })}
    ${tableWrapper(['Alvo', 'MAE', 'RMSE', 'R²', 'Amostras'], [
      html`<tr><td>Temperatura (°C)</td><td>${number(temperature.mae, 2)}</td><td>${number(temperature.rmse, 2)}</td><td>${number(temperature.r2, 3)}</td><td>${number(temperature.samples, 0)}</td></tr>`,
      html`<tr><td>Umidade (%)</td><td>${number(humidity.mae, 2)}</td><td>${number(humidity.rmse, 2)}</td><td>${number(humidity.r2, 3)}</td><td>${number(humidity.samples, 0)}</td></tr>`,
    ])}
    ${candidates.length ? html`<h3 class="model-subhead">Comparação de algoritmos</h3>${tableWrapper(['Algoritmo', 'MAE temp', 'RMSE temp', 'R² temp', 'RMSE umid'], candidateRows)}` : ''}
  `, 'table-card');
}

function agronomySection(agronomy) {
  const plantations = Array.isArray(agronomy?.plantations) ? agronomy.plantations : [];
  if (!agronomy?.available || !plantations.length) {
    return card(html`<div class="empty-state"><span>${icon('leaf')}</span><strong>Indicadores agronômicos indisponíveis</strong><small>${agronomy?.message || 'Cadastre plantações e acumule leituras para calcular GDD, colheita, doença e irrigação.'}</small></div>`, 'table-card');
  }
  const cards = plantations.map((item) => {
    const harvest = item.harvest;
    const irrigation = item.irrigation;
    const progress = Math.max(0, Math.min(100, Number(item.gddProgressPercent) || 0));
    const harvestText = harvest?.status === 'PROJECTED' && harvest.expected
      ? `${formatDate(harvest.expected)} (${formatDate(harvest.earliest)} – ${formatDate(harvest.latest)})`
      : HARVEST_LABELS[harvest?.status] || '—';
    return card(html`
      <div class="agronomy-head">
        <div><span class="overline">${item.field || 'Talhão não informado'}</span><h3>${item.variety}</h3></div>
        ${badge(item.status === 'GROWING' ? 'Em cultivo' : item.status === 'HARVESTED' ? 'Colhida' : 'Arquivada', item.status === 'GROWING' ? 'success' : 'neutral')}
      </div>
      <div class="agronomy-progress"><div class="agronomy-bar" style="width:${progress}%"></div></div>
      <p class="model-meta">${number(item.accumulatedGdd)} / ${number(item.targetGdd)} GDD (${number(progress)}%)${item.daysSincePlanting != null ? ` · ${number(item.daysSincePlanting, 0)} dias desde o plantio` : ''}</p>
      <ul class="agronomy-list">
        <li>${icon('clock', 15)}<span>Colheita: <strong>${harvestText}</strong></span></li>
        <li>${icon('warning', 15)}<span>Míldio: ${riskBadge(item.downyMildewRisk)} · Oídio: ${riskBadge(item.powderyMildewRisk)}</span></li>
        <li>${icon('drop', 15)}<span>ET0: <strong>${number(irrigation?.et0MmDay)} mm/dia</strong> · ETc: <strong>${number(irrigation?.etcMmDay)} mm/dia</strong> (Kc ${number(irrigation?.cropCoefficient, 2)})</span></li>
        <li>${icon('activity', 15)}<span>DPV médio: <strong>${number(irrigation?.vpdKpa)} kPa</strong> · ${number(item.recentHighRiskDays, 0)} dia(s) de risco alto recente</span></li>
      </ul>
      ${item.message ? html`<p class="model-meta">${item.message}</p>` : ''}
    `, 'agronomy-card');
  });
  return html`<div class="agronomy-grid">${cards}</div>`;
}

export function modelsPage({ forecast, modelStatus, agronomy, modelMessage = '', modelBusy = false, modelError = '', modelAlgorithm = 'auto', modelHorizon = 3, user } = {}) {
  const canManage = Boolean(user?.permissionKeys?.includes?.('models.manage'));
  const status = modelStatus;
  const active = status?.activeModel;
  const kindLabel = forecast?.modelKind === 'ml' ? 'Machine learning' : forecast?.modelKind === 'statistical' ? 'Estatístico' : 'Modelo';
  const headline = forecast?.available ? (forecast.model || 'Modelo conectado') : 'Nenhum modelo ativo';
  return page(
    pageHeader({ title: 'Modelos Preditivos', subtitle: 'Projeção climática e indicadores agronômicos calculados do histórico real da estação.', varietyMode: 'hidden' }),
    card(html`<div class="model-badge">${icon('model', 28)}</div><div><span class="overline">${kindLabel}</span><h2>${headline}</h2><p>${forecast?.message || status?.message || modelMessage || 'O serviço não retornou um modelo preditivo ativo.'}</p></div>${badge(forecast?.available ? 'Disponível' : 'Indisponível', forecast?.available ? 'success' : 'warning')}`, 'model-hero'),
    metricsGrid([
      { icon: 'database', label: 'Dias completos', value: number(status?.completeDays ?? 0, 0), meta: status?.mlEnabled ? 'Histórico suficiente para ML' : `Mínimo de ${number(status?.mlMinTrainDays ?? 60, 0)} para ML`, tone: 'blue' },
      { icon: 'model', label: 'Modelo ativo', value: active ? algorithmLabel(active.algorithm) : (forecast?.available ? 'Estatístico' : '—'), meta: active ? `Treinado em ${formatDate(active.trainedAt)}` : 'Sem modelo ML treinado', tone: 'purple' },
      { icon: 'trend', label: 'MAE temperatura', value: forecast?.metrics?.temperature?.mae != null ? `${number(forecast.metrics.temperature.mae, 2)} °C` : '—', meta: 'Erro médio absoluto (backtest)', tone: 'green' },
      { icon: 'quality', label: 'R² temperatura', value: number(forecast?.metrics?.temperature?.r2, 3), meta: 'Qualidade do ajuste no backtest', tone: 'orange' },
    ], 'four'),
    modelTrainingPanel({ canManage, status, busy: modelBusy, algorithm: modelAlgorithm, horizon: modelHorizon, message: modelMessage, error: modelError }),
    modelForecastSection(forecast),
    modelMetricsSection(forecast, status),
    sectionHead({ title: 'Indicadores agronômicos por plantação', subtitle: 'GDD desde o plantio, janela de colheita, risco de doença e necessidade hídrica (ET0 Hargreaves × Kc).' }),
    agronomySection(agronomy),
    card(html`<div class="form-feedback warning" role="note">${icon('warning', 16)}<span>Projeção do histórico da estação — <strong>não é previsão meteorológica</strong>. Sem sensor de chuva ou umidade do solo; a irrigação é demanda atmosférica estimada. Nenhum resultado artificial é exibido.</span></div>`, 'table-card'),
  );
}
