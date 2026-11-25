import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  CARD_SHADOWS, DEFAULT_DESIGN, FONT_STACKS, applyDesignTokens, buildDesignCssVars, normalizeDesign,
} from '../js/modules/design-tokens.js';

test('tokens padrão reproduzem exatamente os valores do CSS original (tema claro)', () => {
  const vars = buildDesignCssVars(DEFAULT_DESIGN, 'light');
  assert.equal(vars['--green'], '#167c55');
  assert.equal(vars['--green-strong'], '#116d4a');
  assert.equal(vars['--forest-2'], '#0b3024');
  assert.equal(vars['--canvas'], '#f5f8f6');
  assert.equal(vars['--surface'], '#ffffff');
  assert.equal(vars['--ink'], '#192923');
  assert.equal(vars['--muted'], '#6d7d76');
  assert.equal(vars['--line'], '#e2e9e5');
  assert.equal(vars['--btn-primary-bg'], '#167c55');
  assert.equal(vars['--btn-primary-text'], '#ffffff');
  assert.equal(vars['--root-font-size'], '100%');
  assert.equal(vars['--card-radius'], '15px');
  assert.equal(vars['--btn-radius'], '9px');
  assert.equal(vars['--card-border-width'], '1px');
  assert.equal(vars['--card-shadow'], '0 2px 5px rgba(21,53,40,.025)');
});

test('tokens padrão do tema escuro espelham css/themes.css', () => {
  const themesCss = readFileSync(new URL('../css/themes.css', import.meta.url), 'utf8');
  const vars = buildDesignCssVars(DEFAULT_DESIGN, 'dark');
  assert.equal(vars['--green'], '#5fc28d');
  assert.equal(vars['--canvas'], '#101a15');
  assert.equal(vars['--surface'], '#1a2922');
  assert.equal(vars['--ink'], '#e7f0ea');
  // Confere que o valor padrão realmente existe no bloco dark do CSS.
  const darkBlock = themesCss.split(':root[data-theme="dark"] {')[1].split('}')[0];
  assert.ok(darkBlock.includes('--green: #5fc28d'));
  assert.ok(darkBlock.includes('--canvas: #101a15'));
});

test('personalização de cores é refletida nas variáveis globais', () => {
  const design = structuredClone(DEFAULT_DESIGN);
  design.light.primary = '#7c3d67';
  design.light.button = '#7c3d67';
  design.light.background = '#fdf6f0';
  const vars = buildDesignCssVars(design, 'light');
  assert.equal(vars['--green'], '#7c3d67');
  assert.equal(vars['--btn-primary-bg'], '#7c3d67');
  assert.equal(vars['--canvas'], '#fdf6f0');
  // O tema escuro mantém a própria paleta.
  assert.equal(buildDesignCssVars(design, 'dark')['--green'], '#5fc28d');
});

test('fontes e escala tipográfica viram variáveis CSS válidas', () => {
  const design = structuredClone(DEFAULT_DESIGN);
  design.typography.bodyFont = 'serif';
  design.typography.headingFont = 'system';
  design.typography.fontScale = 115;
  const vars = buildDesignCssVars(design, 'light');
  assert.equal(vars['--font-body'], FONT_STACKS.serif);
  assert.equal(vars['--font-heading'], FONT_STACKS.system);
  assert.equal(vars['--root-font-size'], '115%');
});

test('componentes: raio, borda e sombra configuráveis', () => {
  const design = structuredClone(DEFAULT_DESIGN);
  design.components.cardRadius = 4;
  design.components.buttonRadius = 20;
  design.components.borderWidth = 2;
  design.components.cardShadow = 'strong';
  const vars = buildDesignCssVars(design, 'light');
  assert.equal(vars['--card-radius'], '4px');
  assert.equal(vars['--btn-radius'], '20px');
  assert.equal(vars['--card-border-width'], '2px');
  assert.equal(vars['--card-shadow'], CARD_SHADOWS.strong);
});

test('normalizeDesign completa valores ausentes e rejeita lixo com segurança', () => {
  const normalized = normalizeDesign({
    light: { primary: '#ABCDEF', surface: 'url(javascript:alert(1))' },
    typography: { bodyFont: 'fonte-inexistente', fontScale: 9000 },
    components: { cardRadius: -5, cardShadow: 'glow' },
  });
  assert.equal(normalized.light.primary, '#abcdef');
  assert.equal(normalized.light.surface, DEFAULT_DESIGN.light.surface);
  assert.equal(normalized.typography.bodyFont, 'dm-sans');
  assert.equal(normalized.typography.fontScale, 125);
  assert.equal(normalized.components.cardRadius, 0);
  assert.equal(normalized.components.cardShadow, 'soft');
  assert.deepEqual(normalized.dark, DEFAULT_DESIGN.dark);
});

test('applyDesignTokens escreve variáveis inline no elemento alvo (tempo real)', () => {
  const written = new Map();
  const fakeRoot = {
    style: {
      setProperty: (name, value) => written.set(name, value),
      removeProperty: (name) => written.delete(name),
    },
  };
  const design = structuredClone(DEFAULT_DESIGN);
  design.dark.background = '#000000';
  applyDesignTokens(design, 'dark', fakeRoot);
  assert.equal(written.get('--canvas'), '#000000');
  assert.equal(written.get('--surface'), '#1a2922');
  // Trocar de tema reaplica a paleta correta, sem resíduos da anterior.
  applyDesignTokens(design, 'light', fakeRoot);
  assert.equal(written.get('--canvas'), '#f5f8f6');
});

test('CSS global consome os tokens (sem cores/fontes fixas nos componentes-chave)', () => {
  const components = readFileSync(new URL('../css/components.css', import.meta.url), 'utf8');
  const base = readFileSync(new URL('../css/base.css', import.meta.url), 'utf8');
  assert.ok(components.includes('.card { background: var(--surface); border: var(--card-border-width, 1px) solid var(--line); border-radius: var(--card-radius, 15px); box-shadow: var(--card-shadow'));
  assert.ok(components.includes('.btn-primary { background: var(--btn-primary-bg, var(--green)); color: var(--btn-primary-text'));
  assert.ok(components.includes('.btn-primary:hover { background: var(--green-strong'));
  assert.ok(base.includes('font-family: var(--font-body'));
  assert.ok(base.includes('font-family: var(--font-heading'));
  assert.ok(base.includes('font-size: var(--root-font-size'));
});
