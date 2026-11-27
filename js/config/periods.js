export const PERIOD_OPTIONS = ['Últimas 24 horas', 'Últimos 7 dias', 'Últimos 30 dias'];
export const DEFAULT_PERIOD = PERIOD_OPTIONS[0];
const PERIOD_HOURS = { 'Últimas 24 horas': 24, 'Últimos 7 dias': 24 * 7, 'Últimos 30 dias': 24 * 30 };

export function climatePathForPeriod(period) {
  const hours = PERIOD_HOURS[period];
  if (!hours || hours === 24) return '/api/v1/climate/current';
  const end = new Date();
  const start = new Date(end.getTime() - hours * 3600 * 1000);
  return `/api/v1/climate/history?start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`;
}

export function pointLabel(timestamp, spanMs) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  if (spanMs > 48 * 3600 * 1000) {
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(date);
  }
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(date);
}

export function seriesSpanMs(points) {
  const times = (Array.isArray(points) ? points : []).map((p) => new Date(p.timestamp).getTime()).filter(Number.isFinite);
  return times.length > 1 ? Math.max(...times) - Math.min(...times) : 0;
}
