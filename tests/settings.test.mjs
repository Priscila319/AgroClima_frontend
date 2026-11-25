import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS, getSettings, setSettingPath } from '../js/modules/settings.js';
import { DEFAULT_DESIGN } from '../js/modules/design-tokens.js';

test('getSettings mescla design persistido com os padrões', () => {
  const settings = getSettings({ design: { light: { primary: '#7c3d67' } }, appearance: { theme: 'dark' } });
  assert.equal(settings.design.light.primary, '#7c3d67');
  assert.equal(settings.design.light.surface, DEFAULT_DESIGN.light.surface);
  assert.equal(settings.design.typography.bodyFont, 'dm-sans');
  assert.equal(settings.appearance.theme, 'dark');
  assert.equal(settings.general.systemName, 'AgroClima Cloud');
});

test('design sobrevive a documento parcial ou vazio (restauração após login)', () => {
  assert.deepEqual(getSettings({}).design, DEFAULT_DESIGN);
  assert.deepEqual(getSettings().design, DEFAULT_DESIGN);
  assert.deepEqual(getSettings({ design: null }).design, DEFAULT_DESIGN);
});

test('tema inválido volta para light', () => {
  assert.equal(getSettings({ appearance: { theme: 'neon' } }).appearance.theme, 'light');
});

test('DEFAULT_SETTINGS inclui a seção design', () => {
  assert.deepEqual(DEFAULT_SETTINGS.design, DEFAULT_DESIGN);
});

test('setSettingPath aplica caminhos aninhados sem mutar o original', () => {
  const original = { design: { light: { primary: '#167c55' } } };
  const updated = setSettingPath(original, 'design.light.primary', '#000000');
  assert.equal(updated.design.light.primary, '#000000');
  assert.equal(original.design.light.primary, '#167c55');
});
