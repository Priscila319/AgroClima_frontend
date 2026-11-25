/**
 * Design System funcional: tokens persistidos no backend (seção `design` de
 * /api/settings) e aplicados como variáveis CSS em tempo real em todas as páginas.
 *
 * Os valores padrão espelham exatamente css/variables.css e css/themes.css,
 * preservando a identidade visual original quando nada foi personalizado.
 * As mesmas regras são validadas pelo SettingsService.java.
 */

export const DEFAULT_DESIGN = Object.freeze({
  light: {
    primary: '#167c55', primaryHover: '#116d4a', secondary: '#0b3024',
    background: '#f5f8f6', surface: '#ffffff', text: '#192923',
    textMuted: '#6d7d76', border: '#e2e9e5', button: '#167c55', buttonText: '#ffffff',
  },
  dark: {
    primary: '#5fc28d', primaryHover: '#116d4a', secondary: '#d4e9dc',
    background: '#101a15', surface: '#1a2922', text: '#e7f0ea',
    textMuted: '#a8b9b0', border: '#34483d', button: '#5fc28d', buttonText: '#ffffff',
  },
  typography: { bodyFont: 'dm-sans', headingFont: 'manrope', fontScale: 100 },
  components: { cardRadius: 15, buttonRadius: 9, borderWidth: 1, cardShadow: 'soft' },
});

export const FONT_STACKS = Object.freeze({
  'dm-sans': '"DM Sans", sans-serif',
  manrope: '"Manrope", sans-serif',
  system: 'system-ui, "Segoe UI", Roboto, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono: 'ui-monospace, "Cascadia Mono", "Courier New", monospace',
});

export const FONT_OPTIONS = Object.freeze([
  { value: 'dm-sans', label: 'DM Sans (padrão)' },
  { value: 'manrope', label: 'Manrope' },
  { value: 'system', label: 'Fonte do sistema' },
  { value: 'serif', label: 'Serifada (Georgia)' },
  { value: 'mono', label: 'Monoespaçada' },
]);

export const CARD_SHADOWS = Object.freeze({
  none: 'none',
  soft: '0 2px 5px rgba(21,53,40,.025)',
  medium: '0 8px 28px rgba(21,53,40,.07)',
  strong: '0 12px 32px rgba(21,53,40,.16)',
});

export const SHADOW_OPTIONS = Object.freeze([
  { value: 'none', label: 'Sem sombra' },
  { value: 'soft', label: 'Suave (padrão)' },
  { value: 'medium', label: 'Média' },
  { value: 'strong', label: 'Marcada' },
]);

/** Rótulos e caminhos dos controles de cor exibidos no Design System. */
export const COLOR_FIELDS = Object.freeze([
  { key: 'primary', label: 'Cor primária' },
  { key: 'secondary', label: 'Cor secundária (títulos e menu)' },
  { key: 'background', label: 'Fundo das páginas' },
  { key: 'surface', label: 'Fundo dos cards' },
  { key: 'text', label: 'Texto principal' },
  { key: 'textMuted', label: 'Texto secundário' },
  { key: 'border', label: 'Bordas' },
  { key: 'button', label: 'Botão primário' },
  { key: 'buttonText', label: 'Texto do botão primário' },
  { key: 'primaryHover', label: 'Botão primário (hover)' },
]);

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

function sanitizePalette(palette, fallback) {
  const result = { ...fallback };
  Object.keys(fallback).forEach((key) => {
    const value = palette?.[key];
    if (typeof value === 'string' && HEX_COLOR.test(value)) result[key] = value.toLowerCase();
  });
  return result;
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

/** Completa/normaliza um design vindo da API ou do rascunho com os padrões. */
export function normalizeDesign(design = {}) {
  const source = design || {};
  const typography = source.typography || {};
  const components = source.components || {};
  return {
    light: sanitizePalette(source.light, DEFAULT_DESIGN.light),
    dark: sanitizePalette(source.dark, DEFAULT_DESIGN.dark),
    typography: {
      bodyFont: FONT_STACKS[typography.bodyFont] ? typography.bodyFont : DEFAULT_DESIGN.typography.bodyFont,
      headingFont: FONT_STACKS[typography.headingFont] ? typography.headingFont : DEFAULT_DESIGN.typography.headingFont,
      fontScale: clampNumber(typography.fontScale, 85, 125, DEFAULT_DESIGN.typography.fontScale),
    },
    components: {
      cardRadius: clampNumber(components.cardRadius, 0, 28, DEFAULT_DESIGN.components.cardRadius),
      buttonRadius: clampNumber(components.buttonRadius, 0, 24, DEFAULT_DESIGN.components.buttonRadius),
      borderWidth: clampNumber(components.borderWidth, 0, 3, DEFAULT_DESIGN.components.borderWidth),
      cardShadow: CARD_SHADOWS[components.cardShadow] ? components.cardShadow : DEFAULT_DESIGN.components.cardShadow,
    },
  };
}

/**
 * Converte os tokens em variáveis CSS para o tema informado. Função pura:
 * é a mesma usada pela interface e pelos testes automatizados.
 */
export function buildDesignCssVars(design, theme = 'light') {
  const normalized = normalizeDesign(design);
  const palette = theme === 'dark' ? normalized.dark : normalized.light;
  const { typography, components } = normalized;
  return {
    '--green': palette.primary,
    '--green-strong': palette.primaryHover,
    '--forest-2': palette.secondary,
    '--canvas': palette.background,
    '--surface': palette.surface,
    '--ink': palette.text,
    '--muted': palette.textMuted,
    '--line': palette.border,
    '--btn-primary-bg': palette.button,
    '--btn-primary-text': palette.buttonText,
    '--font-body': FONT_STACKS[typography.bodyFont],
    '--font-heading': FONT_STACKS[typography.headingFont],
    '--root-font-size': `${typography.fontScale}%`,
    '--card-radius': `${components.cardRadius}px`,
    '--btn-radius': `${components.buttonRadius}px`,
    '--card-border-width': `${components.borderWidth}px`,
    '--card-shadow': CARD_SHADOWS[components.cardShadow],
  };
}

const APPLIED_VARS = Object.keys(buildDesignCssVars(DEFAULT_DESIGN));

/**
 * Aplica os tokens em tempo real no documento (ou em um elemento informado).
 * Variáveis inline têm prioridade sobre as folhas de estilo dos dois temas,
 * então a personalização vale para claro e escuro sem duplicar regras.
 */
export function applyDesignTokens(design, theme = 'light', root = document.documentElement) {
  const vars = buildDesignCssVars(design, theme);
  APPLIED_VARS.forEach((name) => root.style.removeProperty(name));
  Object.entries(vars).forEach(([name, value]) => root.style.setProperty(name, value));
  return vars;
}
