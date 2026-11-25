import test from 'node:test';
import assert from 'node:assert/strict';
import { authFormContent, authView } from '../js/views/auth-view.js';

const loginState = { authMode: 'login', email: '', authMessage: '', authBusy: false, booting: false };

test('login não oferece botão/link "Criar conta"', () => {
  const markup = String(authFormContent(loginState));
  assert.ok(!markup.includes('Criar uma conta'));
  assert.ok(!markup.includes('Criar conta'));
  assert.ok(!markup.includes('data-mode="signup"'));
  assert.ok(!markup.includes('signup-link'));
  assert.ok(markup.includes('data-form="login"'));
  assert.ok(markup.includes('Entrar na plataforma'));
});

test('modo signup por URL/estado cai no login (cadastro público bloqueado)', () => {
  const markup = String(authFormContent({ ...loginState, authMode: 'signup' }));
  assert.ok(markup.includes('data-form="login"'));
  assert.ok(!markup.includes('data-form="signup"'));
});

test('tela de autenticação completa informa que contas são criadas pelo administrador', () => {
  const markup = String(authView(loginState));
  assert.ok(markup.includes('exclusivamente pelo administrador'));
  assert.ok(!markup.includes('data-form="signup"'));
});

test('formulário de login continua funcional com mensagem de erro', () => {
  const markup = String(authFormContent({ ...loginState, authMessage: 'Sua sessão expirou. Entre novamente.' }));
  assert.ok(markup.includes('Sua sessão expirou'));
  assert.ok(markup.includes('name="email"'));
  assert.ok(markup.includes('name="password"'));
});
