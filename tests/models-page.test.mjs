import test from 'node:test';
import assert from 'node:assert/strict';
import { modelsPage } from '../js/views/pages/analyst.js';
import { loadPageData } from '../js/services/workspace.js';

const ANALYST = { id: 'u1', name: 'Ana', email: 'ana@a.test', roleKey: 'ANALYST', permissionKeys: ['analytics.view', 'models.manage', 'plantations.read.all'] };
const PRODUCER = { id: 'u2', name: 'Bia', email: 'bia@a.test', roleKey: 'PRODUCER', permissionKeys: ['analytics.view', 'plantations.manage'] };

const forecast = {
  available: true, model: 'gradient_boosting-90d', modelKind: 'ml', modelId: 'abc123',
  horizonDays: 3, confidenceLevel: 0.95, backtestDays: 6,
  message: 'Projeção por machine learning treinada no histórico da estação.',
  metrics: { temperature: { mae: 0.42, rmse: 0.55, r2: 0.98, samples: 18 }, humidity: { mae: 1.1, rmse: 1.4, r2: 0.95, samples: 18 } },
  predictions: [
    { date: '2026-11-05', temperature: 27.1, temperatureLow: 26.0, temperatureHigh: 28.2, humidity: 64, humidityLow: 61, humidityHigh: 67 },
    { date: '2026-11-06', temperature: 27.4, temperatureLow: 26.3, temperatureHigh: 28.5, humidity: 63, humidityLow: 60, humidityHigh: 66 },
    { date: '2026-11-07', temperature: 27.8, temperatureLow: 26.7, temperatureHigh: 28.9, humidity: 62, humidityLow: 59, humidityHigh: 65 },
  ],
};

const modelStatus = {
  statisticalAvailable: true, mlEnabled: true, mlMinTrainDays: 60, completeDays: 90,
  activeModel: {
    modelId: 'abc123', algorithm: 'gradient_boosting', trainedAt: '2026-11-04T12:00:00Z', trainingDays: 90,
    horizonDays: 3, featureCount: 20, active: true,
    metrics: forecast.metrics,
    candidates: [
      { algorithm: 'random_forest', selected: false, metrics: { temperature: { mae: 0.5, rmse: 0.62, r2: 0.97 }, humidity: { rmse: 1.6 } } },
      { algorithm: 'gradient_boosting', selected: true, metrics: { temperature: { mae: 0.42, rmse: 0.55, r2: 0.98 }, humidity: { rmse: 1.4 } } },
    ],
  },
  message: 'Modelo de machine learning ativo.',
};

const agronomy = {
  available: true, baseTemp: 10, upperTemp: 35, latitude: -9.4, cropCoefficient: 0.8,
  assumptions: ['GDD acumulado desde o plantio.'],
  plantations: [{
    plantationId: '33333333-3333-4333-8333-333333333333', variety: 'Crimson Seedless', field: 'Talhão A',
    status: 'GROWING', plantedAt: '2026-09-01', daysSincePlanting: 64, targetGdd: 1500, accumulatedGdd: 1024,
    gddProgressPercent: 68.3, downyMildewRisk: 'LOW', powderyMildewRisk: 'MODERATE', recentHighRiskDays: 1,
    completeDays: 64, harvest: { status: 'PROJECTED', expected: '2026-12-20', earliest: '2026-12-12', latest: '2026-12-28' },
    irrigation: { et0MmDay: 5.2, etcMmDay: 4.16, cropCoefficient: 0.8, vpdKpa: 1.3, recentDays: 7 },
  }],
};

test('página de modelos exibe métricas reais de backtest e projeção', () => {
  const markup = String(modelsPage({ forecast, modelStatus, agronomy, user: ANALYST }));
  assert.ok(markup.includes('Modelos Preditivos'));
  assert.ok(markup.includes('gradient_boosting-90d'));
  assert.ok(markup.includes('Métricas de validação'));
  assert.ok(markup.includes('0,55') || markup.includes('0.55'), 'RMSE real deve aparecer');
  assert.ok(markup.includes('Comparação de algoritmos'));
  assert.ok(markup.includes('Random Forest'));
  // Projeção por dia com faixa de confiança
  assert.ok(markup.includes('Projeção por dia'));
  assert.ok(markup.includes('26') && markup.includes('28,2') || markup.includes('28.2'));
});

test('painel de treinamento aparece apenas com models.manage', () => {
  const comPermissao = String(modelsPage({ forecast, modelStatus, agronomy, user: ANALYST }));
  assert.ok(comPermissao.includes('data-action="train-model"'));
  assert.ok(comPermissao.includes('data-action="model-algorithm"'));
  assert.ok(comPermissao.includes('data-action="delete-model"'));

  const semPermissao = String(modelsPage({ forecast, modelStatus, agronomy, user: PRODUCER }));
  assert.ok(!semPermissao.includes('data-action="train-model"'), 'produtor sem models.manage não vê o botão de treinar');
  assert.ok(!semPermissao.includes('data-action="delete-model"'));
  assert.ok(!semPermissao.includes('data-action="model-algorithm"'));
});

test('histórico insuficiente desabilita o treino e explica o mínimo', () => {
  const status = { ...modelStatus, mlEnabled: false, completeDays: 12, activeModel: null };
  const markup = String(modelsPage({ forecast: { available: false }, modelStatus: status, user: ANALYST }));
  assert.ok(markup.includes('Histórico insuficiente'));
  assert.ok(markup.includes('data-action="train-model" disabled'), 'botão de treinar deve estar desabilitado sem histórico');
});

test('seção agronômica mostra GDD, colheita, doença e irrigação por plantação', () => {
  const markup = String(modelsPage({ forecast, modelStatus, agronomy, user: ANALYST }));
  assert.ok(markup.includes('Indicadores agronômicos por plantação'));
  assert.ok(markup.includes('Crimson Seedless'));
  assert.ok(markup.includes('Talhão A'));
  assert.ok(markup.includes('1024') || markup.includes('1.024'), 'GDD acumulado real');
  assert.ok(markup.includes('ET0'));
  assert.ok(markup.includes('Moderado'), 'risco de oídio moderado');
  assert.ok(markup.includes('agronomy-bar'));
});

test('sem dados a página não inventa resultados', () => {
  const markup = String(modelsPage({ forecast: { available: false, message: 'Sem histórico.' }, modelStatus: null, agronomy: { available: false, plantations: [] }, user: ANALYST }));
  assert.ok(markup.includes('Projeção indisponível'));
  assert.ok(markup.includes('Indicadores agronômicos indisponíveis'));
  assert.ok(markup.includes('não é previsão meteorológica'));
  assert.ok(!markup.includes('data-action="delete-model"'), 'sem modelo ativo não há botão de remover');
});

test('erro de treinamento é exibido como alerta', () => {
  const markup = String(modelsPage({ forecast, modelStatus, agronomy, user: ANALYST, modelError: 'Histórico insuficiente para treinar.' }));
  assert.ok(markup.includes('role="alert"'));
  assert.ok(markup.includes('form-feedback error'));
  assert.ok(markup.includes('Histórico insuficiente para treinar.'));
});

test('estado ocupado (busy) desabilita os controles e mostra Treinando', () => {
  const markup = String(modelsPage({ forecast, modelStatus, agronomy, user: ANALYST, modelBusy: true }));
  assert.ok(markup.includes('Treinando…'));
  assert.ok(markup.includes('data-action="train-model" disabled'));
});

function mockFetch(calls) {
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    return { ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => ({}) };
  };
  globalThis.sessionStorage = { getItem: () => 'jwt-test', setItem: () => {}, removeItem: () => {} };
}

test('loadPageData busca status, projeção e agronomia na página de modelos', async () => {
  const calls = [];
  mockFetch(calls);
  await loadPageData('Modelos Preditivos', 'ANALYST', ['analytics.view', 'models.manage', 'plantations.read.all']);
  assert.ok(calls.some((url) => url.endsWith('/api/v1/models/status')), 'deve buscar o status dos modelos');
  assert.ok(calls.some((url) => url.endsWith('/api/v1/models/forecast')), 'deve buscar a projeção do modelo');
  assert.ok(calls.some((url) => url.endsWith('/api/v1/agronomy/plantations')), 'deve buscar os indicadores agronômicos');
});

test('loadPageData não busca agronomia sem permissão de plantações (evita 403)', async () => {
  const calls = [];
  mockFetch(calls);
  await loadPageData('Modelos Preditivos', 'ANALYST', ['analytics.view', 'models.manage']);
  assert.ok(calls.some((url) => url.endsWith('/api/v1/models/status')));
  assert.ok(!calls.some((url) => url.endsWith('/api/v1/agronomy/plantations')), 'agronomia não deve ser buscada sem plantations.manage/read.all');
});

test('loadPageData busca agronomia com plantations.manage (produtor)', async () => {
  const calls = [];
  mockFetch(calls);
  await loadPageData('Modelos Preditivos', 'PRODUCER', ['analytics.view', 'plantations.manage']);
  assert.ok(calls.some((url) => url.endsWith('/api/v1/agronomy/plantations')));
});
