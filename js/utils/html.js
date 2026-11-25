/**
 * Template tag `html` — monta marcação HTML escapando automaticamente todo
 * valor interpolado (proteção contra XSS). Fragmentos produzidos por `html`
 * (ou marcados com `trusted`) são inseridos sem novo escape, e arrays são
 * concatenados, o que permite compor templates com `.map()`.
 *
 * Quebras de linha (e a indentação em volta delas) dentro do template são
 * descartadas, como o JSX faz, para que a formatação do código-fonte não
 * crie espaços visíveis entre elementos inline.
 */
class SafeHtml {
  constructor(value) {
    this.value = value;
  }

  toString() {
    return this.value;
  }
}

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ESCAPES[char]);
}

function toMarkup(value) {
  if (value instanceof SafeHtml) return value.value;
  if (Array.isArray(value)) return value.map(toMarkup).join('');
  if (value === null || value === undefined || value === false) return '';
  return escapeHtml(value);
}

export function html(strings, ...values) {
  const markup = strings.reduce((result, chunk, index) => {
    const staticPart = chunk.replace(/\s*\n\s*/g, '');
    return result + staticPart + (index < values.length ? toMarkup(values[index]) : '');
  }, '');
  return new SafeHtml(markup);
}

/** Marca um texto como HTML já confiável (somente conteúdo estático do próprio código). */
export const trusted = (markup) => new SafeHtml(markup);
