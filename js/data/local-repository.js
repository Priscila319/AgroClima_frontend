/**
 * Repositório local da demonstração.
 * Este projeto não tem API nem banco de dados: os registros são guardados no
 * localStorage deste navegador e usam um pequeno fallback em memória quando
 * o armazenamento do navegador não está disponível.
 */

const PREFIX = 'agroclima:';
const memory = new Map();

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function storage() {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

export function readRecord(name, fallback) {
  const key = `${PREFIX}${name}`;
  try {
    const raw = storage()?.getItem(key);
    if (raw !== null && raw !== undefined) return JSON.parse(raw);
  } catch {
    // Mantém a aplicação utilizável em navegação privada/ambientes sem storage.
  }
  return memory.has(key) ? clone(memory.get(key)) : clone(fallback);
}

export function writeRecord(name, value) {
  const key = `${PREFIX}${name}`;
  const copy = clone(value);
  memory.set(key, copy);
  try {
    storage()?.setItem(key, JSON.stringify(copy));
  } catch {
    // O estado continua disponível na memória durante esta sessão.
  }
  return clone(copy);
}

export const loadPlantations = () => readRecord('plantations', []);
export const savePlantations = (plantations) => writeRecord('plantations', plantations);

export const loadSettings = (fallback) => readRecord('settings', fallback);
export const saveSettingsRecord = (settings) => writeRecord('settings', settings);

export const loadRbac = (fallback) => readRecord('rbac', fallback);
export const saveRbac = (rbac) => writeRecord('rbac', rbac);

export const loadAuditEvents = () => readRecord('audit-events', []);
export const saveAuditEvents = (events) => writeRecord('audit-events', events);
