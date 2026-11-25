import test from 'node:test';
import assert from 'node:assert/strict';
import { designSystemPage } from '../js/views/pages/shared.js';
import { getSettings } from '../js/modules/settings.js';
import { DEFAULT_DESIGN, normalizeDesign } from '../js/modules/design-tokens.js';

test('página de Design System expõe controles funcionais de personalização', () => {
  const markup = String(designSystemPage({ settings: getSettings({}), theme: 'light' }));
  // Cores por tema
  for (const key of ['primary', 'secondary', 'background', 'surface', 'text', 'textMuted', 'border', 'button', 'buttonText', 'primaryHover']) {
    assert.ok(markup.includes(`data-design="light.${key}"`), `controle de cor light.${key} ausente`);
  }
  // Tipografia
  assert.ok(markup.includes('data-design="typography.bodyFont"'));
  assert.ok(markup.includes('data-design="typography.headingFont"'));
  assert.ok(markup.includes('data-design="typography.fontScale"'));
  // Componentes
  assert.ok(markup.includes('data-design="components.cardRadius"'));
  assert.ok(markup.includes('data-design="components.buttonRadius"'));
  assert.ok(markup.includes('data-design="components.borderWidth"'));
  assert.ok(markup.includes('data-design="components.cardShadow"'));
  // Ações reais
  assert.ok(markup.includes('data-form="design-system"'));
  assert.ok(markup.includes('Salvar design'));
  assert.ok(markup.includes('data-action="design-reset"'));
  assert.ok(markup.includes('data-action="design-discard"'));
  assert.ok(markup.includes('data-action="design-theme"'));
});

test('aba do tema escuro edita a paleta dark', () => {
  const markup = String(designSystemPage({ settings: getSettings({}), theme: 'dark' }));
  assert.ok(markup.includes('data-design="dark.primary"'));
  assert.ok(!markup.includes('data-design="light.primary"'));
  assert.ok(markup.includes('tema escuro'));
});

test('rascunho é refletido nos controles e habilita descartar', () => {
  const draft = normalizeDesign(structuredClone(DEFAULT_DESIGN));
  draft.light.primary = '#7c3d67';
  const markup = String(designSystemPage({ settings: getSettings({}), designDraft: draft, theme: 'light' }));
  assert.ok(markup.includes('value="#7c3d67"'));
  assert.ok(markup.includes('Há alterações não salvas'));
  assert.ok(!markup.includes('data-action="design-discard" disabled'));
});

test('erro ao salvar é exibido como alerta, não como sucesso', () => {
  const markup = String(designSystemPage({ settings: getSettings({}), theme: 'light', designMessage: 'Você não tem permissão para esta operação.', designError: true }));
  assert.ok(markup.includes('role="alert"'));
  assert.ok(markup.includes('form-feedback error'));
  const ok = String(designSystemPage({ settings: getSettings({}), theme: 'light', designMessage: 'Design salvo no servidor.', designError: false }));
  assert.ok(ok.includes('role="status"'));
  assert.ok(!ok.includes('form-feedback error'));
});

test('sem rascunho, descartar fica desabilitado e os valores salvos aparecem', () => {
  const settings = getSettings({ design: { light: { button: '#123456' } } });
  const markup = String(designSystemPage({ settings, theme: 'light' }));
  assert.ok(markup.includes('value="#123456"'));
  assert.ok(markup.includes('data-action="design-discard" disabled'));
});
