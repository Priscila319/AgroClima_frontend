import { html } from '../../utils/html.js';

/** Contêiner padrão de uma página interna (equivale ao antigo `<div class="page">`). */
export const page = (...children) => html`<section class="page">${children}</section>`;
