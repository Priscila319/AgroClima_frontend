/** Utilitários de DOM usados pela camada de eventos e de renderização. */

export const queryRequired = (selector, root = document) => {
  const element = root.querySelector(selector);
  if (!element) throw new Error(`Elemento não encontrado: ${selector}`);
  return element;
};

/** Define o conteúdo de um contêiner a partir de marcação gerada por `html` (valores já escapados). */
export function mount(container, markup) {
  container.innerHTML = String(markup);
}

/** Substitui um elemento por um novo trecho de marcação (usado na troca da área da página). */
export function replaceElement(target, markup) {
  const template = document.createElement('template');
  template.innerHTML = String(markup);
  target.replaceWith(template.content);
}
