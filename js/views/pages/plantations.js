import { VARIETIES } from '../../data/varieties.js';
import { html } from '../../utils/html.js';
import { icon } from '../../components/icons.js';
import { badge, button, card, chartCard, metricsGrid, sectionHead } from '../../components/ui.js';
import { barChart } from '../../components/charts.js';
import { pageHeader } from '../../components/page-header.js';
import { tableWrapper } from '../../components/tables.js';
import { PLANTATION_STATUSES } from '../../modules/plantations.js';
import { page } from './page-layout.js';

const formatDate = (value) => {
  if (!value) return 'Ainda não registrada';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Data indisponível' : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(date);
};

const formatDateTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

function plantationRows(plantations) {
  if (!plantations.length) {
    return html`<tr><td colspan="7"><div class="empty-state"><span>${icon('leaf')}</span><strong>Nenhuma plantação cadastrada</strong><small>Use o formulário acima para registrar o primeiro plantio.</small></div></td></tr>`;
  }
  return plantations.map((plantation) => {
    const harvested = plantation.status === PLANTATION_STATUSES.HARVESTED;
    const grape = VARIETIES.find((variety) => variety.name === plantation.variety);
    return html`<tr>
      <td><div class="variety-cell"><span class="grape-dot grape-${grape?.color || 'green'}"></span><div><strong>${plantation.variety}</strong><small>${plantation.field || 'Talhão não informado'}</small></div></div></td>
      <td>${Number(plantation.quantity).toLocaleString('pt-BR')} plantas</td>
      <td>${formatDate(plantation.plantedAt)}</td>
      <td>${formatDate(plantation.harvestedAt)}</td>
      <td>${badge(plantation.status, harvested ? 'info' : 'success')}</td>
      <td>${plantation.notes || '—'}</td>
      <td>${harvested
        ? html`<span class="completed-label">${icon('check', 15)} Colhida ${formatDateTime(plantation.harvestedAt)}</span>`
        : html`<button type="button" class="btn btn-secondary" data-action="harvest-plantation" data-id="${plantation.id}">${icon('check', 16)} Marcar como colhida</button>`}</td>
    </tr>`;
  });
}

function newPlantationForm(message = '', catalog = []) {
  const available = catalog.length ? catalog.filter((entry) => entry.active !== false).map((entry) => entry.name) : VARIETIES.map(({ name }) => name);
  const varieties = available.map((name) => html`<option value="${name}">${name}</option>`);
  return card(
    html`${sectionHead({ title: 'Cadastrar plantação', subtitle: 'Informe a variedade e a quantidade de plantas.' })}
      ${message && html`<p class="form-feedback" role="status">${message}</p>`}
      <form class="form-grid plantation-form" data-form="create-plantation">
        <label class="field"><span>Tipo da uva</span><select name="variety" required>${varieties}</select></label>
        <label class="field"><span>Quantidade de plantas</span><input type="number" name="quantity" min="1" step="1" required placeholder="Ex.: 1200"></label>
        <label class="field"><span>Talhão ou área <small>(opcional)</small></span><input name="field" maxlength="80" placeholder="Ex.: Talhão Norte"></label>
        <label class="field full"><span>Observações <small>(opcional)</small></span><textarea name="notes" maxlength="240" placeholder="Anote um detalhe importante sobre este plantio"></textarea></label>
        <div class="planting-date-note full">${icon('clock', 16)}<span><strong>Data de início automática.</strong> O sistema registra o dia e o horário ao salvar. A data da colheita só será preenchida quando você marcar a plantação como colhida.</span></div>
        <div class="plantation-submit full"><button type="submit" class="btn btn-primary">${icon('plus', 16)} Cadastrar plantação</button></div>
      </form>`,
    'table-card plantation-form-card',
  );
}

export function plantationsPage({ plantations = [], varieties = [], producerMessage = '' } = {}) {
  const growing = plantations.filter((entry) => entry.status === PLANTATION_STATUSES.GROWING).length;
  const harvested = plantations.filter((entry) => entry.status === PLANTATION_STATUSES.HARVESTED).length;
  const totalPlants = plantations.reduce((sum, entry) => sum + Number(entry.quantity || 0), 0);
  return page(
    pageHeader({ title: 'Minhas Plantações', subtitle: 'Acompanhe o que está em cultivo e registre cada colheita.', varietyMode: 'hidden' }),
    metricsGrid([
      { icon: 'leaf', label: 'Plantações cadastradas', value: plantations.length, meta: 'Todas ficam no seu histórico', tone: 'green' },
      { icon: 'activity', label: 'Em cultivo', value: growing, meta: 'Aguardando a colheita', tone: 'blue' },
      { icon: 'check', label: 'Já colhidas', value: harvested, meta: 'Data guardada no histórico', tone: 'purple' },
      { icon: 'grid', label: 'Plantas registradas', value: totalPlants.toLocaleString('pt-BR'), meta: 'Somando todas as áreas', tone: 'orange' },
    ], 'four'),
    newPlantationForm(producerMessage, varieties),
    card(
      html`${sectionHead({ title: 'Acompanhamento e histórico', subtitle: 'A data de início é registrada no cadastro; a colheita recebe a data quando você confirma.' })}
        ${tableWrapper(['Tipo da uva / área', 'Quantidade', 'Início do plantio', 'Data da colheita', 'Status', 'Observações', 'Ação'], plantationRows(plantations))}`,
      'table-card plantation-table-card',
    ),
  );
}

export function producerHistoryPage({ plantations = [], plantationHistory = [], auditLogs = [] } = {}) {
  const history = plantationHistory.length ? plantationHistory : plantations;
  const events = history.flatMap((plantation) => {
    const items = [{
      id: `${plantation.id}-start`,
      timestamp: plantation.plantedAt,
      title: `Plantio de ${plantation.variety} cadastrado`,
      description: `${Number(plantation.quantity).toLocaleString('pt-BR')} plantas${plantation.field ? ` · ${plantation.field}` : ''}.`,
      kind: 'plantio',
    }];
    if (plantation.harvestedAt) items.push({
      id: `${plantation.id}-harvest`,
      timestamp: plantation.harvestedAt,
      title: `Colheita de ${plantation.variety} registrada`,
      description: `Plantação marcada como colhida por ${plantation.harvestedBy || 'produtor'}.`,
      kind: 'colheita',
    });
    return items;
  });
  const recentReports = auditLogs
    .filter((event) => ['Relatórios', 'Análises'].includes(event.resource))
    .map((event) => ({
      id: event.id,
      timestamp: event.occurredAt,
      title: event.action,
      description: `${event.user} · ${event.details || event.resource}`,
      kind: 'analise',
    }));
  const timeline = [...events, ...recentReports].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  return page(
    pageHeader({ title: 'Histórico', subtitle: 'Veja quando cada plantação começou e quando a colheita foi registrada.', varietyMode: 'hidden' }),
    card(
      html`${sectionHead({ title: 'Linha do tempo das plantações', subtitle: 'Os registros continuam disponíveis mesmo depois da colheita.' })}
        ${timeline.length ? html`<div class="plantation-timeline">${timeline.map((event) => html`<article><span class="timeline-marker ${event.kind}">${icon(event.kind === 'colheita' ? 'check' : event.kind === 'analise' ? 'report' : 'leaf', 16)}</span><div><time>${formatDateTime(event.timestamp)}</time><h3>${event.title}</h3><p>${event.description}</p></div></article>`)}</div>` : html`<div class="empty-state"><span>${icon('clock')}</span><strong>Seu histórico ainda está vazio</strong><small>Cadastre uma plantação para começar a acompanhar as datas.</small></div>`}`,
      'table-card history-card',
    ),
  );
}

function producerReportRows(plantations, varietyNames) {
  const rows = varietyNames.map((name) => {
    const entries = plantations.filter((plantation) => plantation.variety === name);
    const count = entries.reduce((sum, entry) => sum + Number(entry.quantity || 0), 0);
    const harvested = entries.filter((entry) => entry.status === PLANTATION_STATUSES.HARVESTED).length;
    const color = VARIETIES.find((variety) => variety.name === name)?.color || 'green';
    return html`<tr><td><div class="variety-cell"><span class="grape-dot grape-${color}"></span><strong>${name}</strong></div></td><td>${entries.length}</td><td>${count.toLocaleString('pt-BR')}</td><td>${harvested}</td><td>${entries.filter((entry) => entry.status === PLANTATION_STATUSES.GROWING).length}</td></tr>`;
  });
  return tableWrapper(['Tipo da uva', 'Áreas cadastradas', 'Plantas registradas', 'Áreas colhidas', 'Em cultivo'], rows);
}

export function producerReportsPage({ plantations = [], plantationHistory = [], varieties = [] } = {}) {
  const records = plantationHistory.length ? plantationHistory : plantations;
  const catalog = varieties.length ? varieties.filter((entry) => entry.active !== false).map((entry) => entry.name) : VARIETIES.map((entry) => entry.name);
  const varietyNames = [...new Set([...catalog, ...records.map((entry) => entry.variety)])];
  const totalPlants = records.reduce((sum, entry) => sum + Number(entry.quantity || 0), 0);
  const harvested = records.filter((entry) => entry.status === PLANTATION_STATUSES.HARVESTED).length;
  const active = records.filter((entry) => entry.status === PLANTATION_STATUSES.GROWING).length;
  const counts = varietyNames.map((name) => records.filter((entry) => entry.variety === name).reduce((sum, entry) => sum + Number(entry.quantity || 0), 0));
  const max = Math.max(1, ...counts);
  const bars = counts.map((value) => value ? Math.max(6, Math.round(value / max * 100)) : 0);
  const labels = varietyNames.map((name) => VARIETIES.find((entry) => entry.name === name)?.short || name);
  return page(
    pageHeader({ title: 'Relatórios', subtitle: 'Resumo das plantações persistidas no serviço AgroClima.', varietyMode: 'hidden' }),
    html`<div class="report-notice">${icon('database', 16)}<span>O relatório reúne dados retornados pela API Java, inclusive o histórico de colheitas.</span><button type="button" class="btn btn-primary" data-action="download-producer-report">${icon('download', 16)} Baixar CSV</button></div>`,
    metricsGrid([
      { icon: 'leaf', label: 'Plantações', value: records.length, meta: 'Registros do servidor', tone: 'green' },
      { icon: 'activity', label: 'Em cultivo', value: active, meta: 'Ainda não colhidas', tone: 'blue' },
      { icon: 'check', label: 'Já colhidas', value: harvested, meta: 'Mantidas no histórico', tone: 'purple' },
      { icon: 'grid', label: 'Plantas registradas', value: totalPlants.toLocaleString('pt-BR'), meta: 'Total informado', tone: 'orange' },
    ], 'four'),
    html`<div class="grid-2">${chartCard({ title: 'Plantas por tipo de uva', subtitle: 'Quantidade informada nas plantações cadastradas', content: barChart(bars, labels) })}${card(html`${sectionHead({ title: 'Como ler este resumo', subtitle: 'Dados enviados e mantidos pela API Java.' })}<ul class="simple-list"><li>${icon('leaf', 16)} Acompanhe quantas plantas ainda estão em cultivo.</li><li>${icon('clock', 16)} A data é gravada pelo servidor no plantio e na colheita.</li><li>${icon('report', 16)} Consulte os plantios já encerrados no histórico.</li></ul>`, 'report-explainer')}</div>`,
    card(
      html`${sectionHead({ title: 'Resumo por tipo de uva', subtitle: 'Quantidade e situação das áreas cadastradas.' })}${producerReportRows(records, varietyNames)}`,
      'table-card report-table-card',
    ),
  );
}

export function buildProducerCsv(plantations = []) {
  const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const lines = [
    ['Tipo da uva', 'Quantidade de plantas', 'Talhão ou área', 'Data de início', 'Data de colheita', 'Status', 'Observações'],
    ...plantations.map((plantation) => [plantation.variety, plantation.quantity, plantation.field, plantation.plantedAt, plantation.harvestedAt || '', plantation.status, plantation.notes]),
  ];
  return `\uFEFF${lines.map((line) => line.map(quote).join(';')).join('\r\n')}`;
}
