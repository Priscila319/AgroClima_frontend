import { html } from '../../utils/html.js';
import { VARIETIES } from '../../data/varieties.js';
import { icon } from '../../components/icons.js';
import { badge, button, card, chartCard, metricsGrid, sectionHead } from '../../components/ui.js';
import { lineChart } from '../../components/charts.js';
import { pageHeader } from '../../components/page-header.js';
import { comparisonTable, readingsTable, tableWrapper } from '../../components/tables.js';
import { page } from './page-layout.js';
import { pointLabel, seriesSpanMs } from '../../config/periods.js';

function formatNumber(value, maximumFractionDigits = 1) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return 'Sem leitura';
  return Number(value).toLocaleString('pt-BR', { maximumFractionDigits });
}

function formatCapture(value) {
  if (!value) return 'Sem captura';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Sem captura' : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

function formatIsoDate(value) {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
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

const RISK_LABELS = { LOW: 'Baixo', MODERATE: 'Moderado', HIGH: 'Alto', INSUFFICIENT_DATA: 'Sem dados' };
const RISK_TONES = { LOW: 'success', MODERATE: 'warning', HIGH: 'danger', INSUFFICIENT_DATA: 'neutral' };

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
  const spanMs = seriesSpanMs(points);
  points.forEach((point) => {
    const raw = point.values?.[key];
    if (raw === null || raw === undefined || !Number.isFinite(Number(raw))) return;
    values.push(Number(raw));
    labels.push(pointLabel(point.timestamp, spanMs));
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

function noModelCard(title, message, actionLabel, pageName, extraClass = '') {
  return card(
    html`<div class="recommend-icon">${icon('model')}</div><div class="recommend-main"><span class="overline">Serviço não configurado</span><h3>${title}</h3><p>${message}</p></div>${button(actionLabel, { variant: 'soft', action: 'navigate', page: pageName })}`,
    `recommend ${extraClass}`.trim(),
  );
}

function pickActiveAgronomy(agronomy, selectedVariety) {
  const list = Array.isArray(agronomy?.plantations) ? agronomy.plantations : [];
  if (!list.length) return null;
  const growing = list.filter((item) => item.status === 'GROWING');
  const pool = growing.length ? growing : list;
  return pool.find((item) => item.variety === selectedVariety) || pool[0];
}

function harvestMetricSummary(agronomy, variety) {
  const target = pickActiveAgronomy(agronomy, variety);
  if (!agronomy?.available || !target) {
    return {
      value: 'Sem plantação',
      meta: agronomy?.message || 'Cadastre em Minhas Plantações',
      tone: 'purple',
    };
  }
  const harvest = target.harvest;
  const prefix = target.field ? `${target.variety} (${target.field})` : target.variety;
  if (harvest?.status === 'REACHED') {
    return {
      value: 'Pronta p/ colher',
      meta: `${prefix} · meta atingida em ${formatIsoDate(harvest.reachedOn)}`,
      tone: 'green',
    };
  }
  if (harvest?.status === 'PROJECTED' && harvest.expected) {
    return {
      value: formatIsoDate(harvest.expected),
      meta: `${prefix} · janela ${formatIsoDate(harvest.earliest)} a ${formatIsoDate(harvest.latest)}`,
      tone: 'green',
    };
  }
  if (harvest?.status === 'BEYOND_HORIZON') {
    return {
      value: '> 120 dias',
      meta: `${prefix} · ${formatNumber(target.gddProgressPercent)}% de GDD`,
      tone: 'orange',
    };
  }
  return {
    value: 'Aguardando clima',
    meta: `${prefix} · acumulando leituras`,
    tone: 'purple',
  };
}

function harvestRecommendationCard(agronomy, variety) {
  const target = pickActiveAgronomy(agronomy, variety);
  if (!agronomy?.available || !target) {
    return noModelCard(
      'Indicação de colheita indisponível',
      agronomy?.message || 'Cadastre uma plantação em Minhas Plantações para calcular a previsão de colheita.',
      'Minhas plantações',
      'Minhas Plantações',
    );
  }

  const harvest = target.harvest;
  const progress = Math.max(0, Math.min(100, Number(target.gddProgressPercent) || 0));
  let headline = 'Acumulando leituras climáticas';
  if (harvest?.status === 'REACHED') {
    headline = `Colheita atingida (${formatIsoDate(harvest.reachedOn)})`;
  } else if (harvest?.status === 'PROJECTED' && harvest.expected) {
    headline = `${formatIsoDate(harvest.expected)} (${formatIsoDate(harvest.earliest)} – ${formatIsoDate(harvest.latest)})`;
  } else if (harvest?.status === 'BEYOND_HORIZON') {
    headline = 'Acima de 120 dias no ritmo atual';
  }

  return card(
    html`
      <div class="recommend-icon">${icon('leaf')}</div>
      <div class="recommend-main">
        <span class="overline">Projeção por Graus-Dia (GDD)</span>
        <h3>${target.variety}${target.field ? ` · ${target.field}` : ''}</h3>
        <div class="recommend-date">${headline}</div>
        <p>${harvest?.message || target.message || 'Cálculo baseado na soma térmica diária da estação.'}</p>
        <div class="confidence">
          <span>Soma térmica: ${formatNumber(target.accumulatedGdd, 0)} / ${formatNumber(target.targetGdd, 0)} GDD</span>
          <strong>${formatNumber(progress, 1)}%</strong>
          <div><i style="width:${progress}%"></i></div>
        </div>
        <div class="recommend-tags">
          ${badge(`Míldio: ${RISK_LABELS[target.downyMildewRisk] || 'Sem dados'}`, RISK_TONES[target.downyMildewRisk] || 'neutral')}
          ${badge(`Oídio: ${RISK_LABELS[target.powderyMildewRisk] || 'Sem dados'}`, RISK_TONES[target.powderyMildewRisk] || 'neutral')}
        </div>
      </div>
      ${button('Ver previsões', { variant: 'soft', action: 'navigate', page: 'Previsões' })}
    `,
    'recommend',
  );
}

function marketOverviewCard() {
  return card(
    html`
      <div class="recommend-icon">${icon('market')}</div>
      <div class="recommend-main">
        <span class="overline">Referências oficiais</span>
        <h3>Mercado e Exportação</h3>
        <p>Consulte cotações de referência da CONAB, valor de produção por estado (IBGE/PAM) e dados de exportação FOB (ComexStat).</p>
      </div>
      ${button('Ver mercado', { variant: 'soft', action: 'navigate', page: 'Mercado e Exportação' })}
    `,
    'recommend logistics',
  );
}

export function overviewPage({ variety, dashboard, agronomy }) {
  const climate = dashboard?.climate;
  const plantations = dashboard?.plantations || {};
  const temperature = metricFor(climate, 'temperature');
  const humidity = metricFor(climate, 'humidity');
  const tempSeries = seriesFor(climate, 'temperature') || emptySeries();
  const humiditySeries = seriesFor(climate, 'humidity') || emptySeries();
  const comparison = { climateMetrics: climate?.metrics || {}, plantationsByVariety: plantations.byVariety || [] };
  const harvestMetric = harvestMetricSummary(agronomy, variety);

  return page(
    pageHeader({ title: 'Visão Geral', subtitle: 'Acompanhe as leituras disponíveis e os registros da sua produção.', variety }),
    syncStrip(climate),
    metricsGrid([
      { icon: 'thermo', label: 'Temperatura', value: formatMetric(temperature), meta: temperature ? `${formatMetric(temperature, 'minimum')} mín. · ${formatMetric(temperature, 'maximum')} máx.` : 'Aguardando sensor', tone: 'orange' },
      { icon: 'drop', label: 'Umidade do ar', value: formatMetric(humidity), meta: humidity ? `${humidity.samples} amostras` : 'Aguardando sensor', tone: 'blue' },
      { icon: 'leaf', label: 'Plantações em cultivo', value: plantations.growing ?? 0, meta: 'Dados da API Java' },
      { icon: 'truck', label: 'Previsão de colheita', value: harvestMetric.value, meta: harvestMetric.meta, tone: harvestMetric.tone },
      { icon: 'warning', label: 'Leituras climáticas', value: climate?.records ?? 0, meta: climate?.available ? 'Registros reais recebidos' : 'Sem leituras no período', tone: climate?.available ? 'green' : 'orange' },
    ]),
    html`<div class="grid-2">${chartCard({ title: 'Temperatura nas últimas 24 horas', subtitle: 'Leituras recebidas pela API · °C', legend: temperature ? formatMetric(temperature) : 'Sem leitura', content: lineChart({ data: tempSeries.values, labels: tempSeries.labels }) })}${chartCard({ title: 'Umidade do ar', subtitle: 'Leituras recebidas pela API · %', legend: humidity ? formatMetric(humidity) : 'Sem leitura', content: lineChart({ data: humiditySeries.values, labels: humiditySeries.labels, color: 'blue' }) })}</div>`,
    html`<div class="recommend-grid">${harvestRecommendationCard(agronomy, variety)}${marketOverviewCard()}</div>`,
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

export function forecastsPage({ variety, forecast, climate, agronomy }) {
  const available = Boolean(forecast?.available && forecast?.predictions?.length);
  const temperature = metricFor(climate, 'temperature');
  const tempSeries = seriesFor(climate, 'temperature') || emptySeries();
  const plantations = Array.isArray(agronomy?.plantations) ? agronomy.plantations : [];

  const agronomyCards = plantations.map((item) => {
    const harvest = item.harvest;
    const progress = Math.max(0, Math.min(100, Number(item.gddProgressPercent) || 0));
    const harvestLabel = harvest?.status === 'REACHED'
      ? `Alvo atingido em ${formatIsoDate(harvest.reachedOn)}`
      : harvest?.status === 'PROJECTED' && harvest.expected
        ? `${formatIsoDate(harvest.expected)} (${formatIsoDate(harvest.earliest)} – ${formatIsoDate(harvest.latest)})`
        : harvest?.message || 'Acumulando leituras climáticas';

    return card(html`
      <div class="agronomy-head">
        <div><span class="overline">${item.field || 'Talhão não informado'}</span><h3>${item.variety}</h3></div>
        ${badge(item.status === 'GROWING' ? 'Em cultivo' : item.status === 'HARVESTED' ? 'Colhida' : 'Arquivada', item.status === 'GROWING' ? 'success' : 'neutral')}
      </div>
      <div class="agronomy-progress"><div class="agronomy-bar" style="width:${progress}%"></div></div>
      <p class="model-meta">${formatNumber(item.accumulatedGdd, 0)} / ${formatNumber(item.targetGdd, 0)} GDD (${formatNumber(progress, 1)}%)${item.daysSincePlanting != null ? ` · ${item.daysSincePlanting} dia(s) desde o plantio` : ''}</p>
      <ul class="agronomy-list">
        <li>${icon('clock', 15)}<span>Previsão de colheita: <strong>${harvestLabel}</strong></span></li>
        <li>${icon('warning', 15)}<span>Míldio: ${badge(RISK_LABELS[item.downyMildewRisk] || 'Sem dados', RISK_TONES[item.downyMildewRisk] || 'neutral')} · Oídio: ${badge(RISK_LABELS[item.powderyMildewRisk] || 'Sem dados', RISK_TONES[item.powderyMildewRisk] || 'neutral')}</span></li>
        <li>${icon('drop', 15)}<span>ETc estimada: <strong>${formatNumber(item.irrigation?.etcMmDay, 2)} mm/dia</strong> (ET0 ${formatNumber(item.irrigation?.et0MmDay, 2)} mm/dia)</span></li>
      </ul>
      ${item.message ? html`<p class="model-meta">${item.message}</p>` : ''}
    `, 'agronomy-card');
  });

  return page(
    pageHeader({ title: 'Previsões', subtitle: `Projeção climática da estação e estimativa de colheita para suas plantações.`, variety }),
    metricsGrid([
      { icon: 'quality', label: 'Modelo climático', value: available ? (forecast.model || 'Ativo') : 'Não configurado', meta: forecast?.message || 'Sem predições', tone: 'blue' },
      { icon: 'clock', label: 'Horizonte', value: available ? `${forecast.predictions.length} dia(s)` : '—', meta: 'Projeção da estação', tone: 'purple' },
      { icon: 'thermo', label: 'Temperatura atual', value: formatMetric(temperature), meta: 'Leitura observada, não previsão', tone: 'orange' },
      { icon: 'trend', label: 'Previsões disponíveis', value: available ? 'Sim' : 'Não', meta: available ? 'Calculado no serviço Python' : 'Aguardando histórico mínimo (7 dias)', tone: available ? 'green' : 'orange' },
    ], 'four'),
    html`<div class="grid-main">${chartCard({ title: 'Leituras observadas', subtitle: 'Série climática real; não representa previsão', content: lineChart({ data: tempSeries.values, labels: tempSeries.labels }) })}${available ? card(html`<div class="insight-mark">${icon('model')}</div><span class="overline">Projeção climática</span><h3>${forecast.model}</h3><ul>${forecast.predictions.map((item) => html`<li><strong>${formatIsoDate(item.date || item.timestamp)}</strong> · ${formatNumber(item.temperature)} °C · ${formatNumber(item.humidity)}% UR</li>`)}</ul>`, 'insight-card') : unavailableAnalysis('Previsões climáticas indisponíveis', forecast?.message || 'Acumule ao menos 7 dias completos para projeção climática.')}</div>`,
    sectionHead({ title: 'Previsão de colheita por plantação', subtitle: 'Calculada por soma térmica (Graus-Dia / GDD) desde a data de início de cada plantio.' }),
    agronomyCards.length ? html`<div class="agronomy-grid">${agronomyCards}</div>` : unavailableAnalysis('Sem previsão de colheita', agronomy?.message || 'Cadastre uma plantação em Minhas Plantações para acompanhar a estimativa.'),
  );
}

function formatBrl(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—';
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function marketPage({ variety, market, dashboard, grapePrices, grapeProduction, exportValue }) {
  const available = Boolean(market?.available && market?.series?.length);
  const rows = available ? market.series.map((item) => html`<tr><td>${item.date || item.timestamp || '—'}</td><td>${item.price ?? '—'}</td><td>${item.market || '—'}</td><td>${item.currency || '—'}</td></tr>`) : [];
  const priceItems = grapePrices?.items || [];
  const productionItems = [...(grapeProduction?.items || [])].sort((a, b) => (b.valor ?? -1) - (a.valor ?? -1));
  const hasGrapeData = priceItems.length > 0 || productionItems.length > 0;
  const priceRows = priceItems.map((item) => html`<tr><td>${item.ano_safra}</td><td>${item.tipo_dado || '—'}</td><td>${item.variedade_grupo || '—'}</td><td>${item.grau_glucometrico || '—'}</td><td>${item.regiao_praca || '—'}</td><td>${formatBrl(item.preco_brl_kg)}</td></tr>`);
  const productionRows = productionItems.map((item) => html`<tr><td>${item.localidade}</td><td>${item.valor === null || item.valor === undefined ? '—' : item.valor.toLocaleString('pt-BR')}</td><td>${item.unidade || '—'}</td></tr>`);
  return page(
    pageHeader({ title: 'Mercado e Exportação', subtitle: hasGrapeData ? `Preços de uva (CONAB) e valor da produção por estado (IBGE/PAM). São dados de referência do mercado de uva, não específicos de ${variety}.` : `Informações de mercado para ${variety} somente serão exibidas após configurar uma fonte real.`, variety }),
    metricsGrid([
      { icon: 'market', label: 'Fonte de preço', value: hasGrapeData ? 'CONAB · IBGE' : (available ? (market.source || 'Conectada') : 'Não configurada'), meta: hasGrapeData ? 'Arquivos CSV do projeto' : 'Integração externa necessária' },
      { icon: 'trend', label: 'Série de preços', value: priceItems.length || (available ? market.series.length : '—'), meta: priceItems.length ? 'Registros de preço da uva (CONAB)' : 'Nenhum valor demonstrativo exibido', tone: 'blue' },
      { icon: 'activity', label: 'Plantações registradas', value: dashboard?.plantations?.totalPlantations ?? 0, meta: 'API Java', tone: 'purple' },
      {
        icon: 'truck',
        label: 'Exportação (FOB)',
        value: exportValue?.disponivel
          ? `US$ ${Number(exportValue.valor_exportado_usd).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
          : 'Sem dados',
        meta: exportValue?.disponivel
          ? `Preço médio US$ ${exportValue.preco_medio_usd_kg ?? '—'}/kg · ${exportValue.fonte}`
          : 'ComexStat não disponível',
        tone: exportValue?.disponivel ? 'green' : 'orange',
      },
    ], 'four'),
    priceRows.length ? card(html`${sectionHead({ title: 'Preços da uva (CONAB)', subtitle: 'Preço mínimo oficial e cotações de mercado, em R$/kg' })}${tableWrapper(['Safra', 'Tipo', 'Variedade/grupo', 'Grau', 'Região/praça', 'Preço'], priceRows)}`, 'table-card') : '',
    exportValue?.disponivel
      ? card(html`
        ${sectionHead({
          title: 'Valor de exportação de uvas',
          subtitle: `Fonte: ${exportValue.fonte} · Período: ${exportValue.periodo}`,
        })}
        <div class="metrics-inline">
          <div>
            <strong>Valor exportado</strong>
            <div>US$ ${Number(exportValue.valor_exportado_usd).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          </div>
          <div>
            <strong>Quantidade</strong>
            <div>${Number(exportValue.quantidade_toneladas).toLocaleString('pt-BR')} t</div>
          </div>
          <div>
            <strong>Preço médio</strong>
            <div>US$ ${exportValue.preco_medio_usd_kg ?? '—'}/kg</div>
          </div>
        </div>
        <p class="muted">NCM ${exportValue.ncm} — ${exportValue.produto}</p>
      `, 'table-card')
      : '',
    productionRows.length ? card(html`${sectionHead({ title: 'Valor da produção de uva por estado (IBGE/PAM 2025)', subtitle: 'Ordenado do maior para o menor valor' })}${tableWrapper(['Localidade', 'Valor', 'Unidade'], productionRows)}`, 'table-card') : '',
    (hasGrapeData || exportValue?.disponivel) ? '' : (available ? card(html`${sectionHead({ title: 'Dados de mercado', subtitle: `Fonte: ${market.source || 'API configurada'}` })}${tableWrapper(['Data', 'Preço', 'Mercado', 'Moeda'], rows)}`, 'table-card') : unavailableAnalysis('Dados de mercado indisponíveis', market?.message || 'Nenhuma fonte de preços ou demanda está configurada.')),
  );
}
