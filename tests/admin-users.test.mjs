import test from 'node:test';
import assert from 'node:assert/strict';
import { rbacPage } from '../js/views/pages/admin-extra.js';
import { normalizeRbacSnapshot } from '../js/modules/access-control.js';
import { ROLES } from '../js/config/roles.js';

const snapshot = normalizeRbacSnapshot({
  users: [{
    id: 'u1', name: 'Mariana Costa', email: 'm@a.test', roleKey: 'PRODUCER', role: ROLES.PRODUCER,
    status: 'ACTIVE', phone: '5581999998888', organization: 'Vale Uvas', jobTitle: 'Produtora',
  }],
  roles: [
    { key: 'PRODUCER', label: ROLES.PRODUCER, permissionKeys: ['overview.view'] },
    { key: 'ADMIN', label: ROLES.ADMIN, permissionKeys: ['users.manage', 'rbac.manage'] },
  ],
  permissions: [{ key: 'overview.view', label: 'Ver painéis', area: 'Painéis' }],
});

test('formulário de criação tem telefone com máscara brasileira e dica de formato', () => {
  const markup = String(rbacPage({ rbac: snapshot }));
  assert.ok(markup.includes('data-form="rbac-user"'));
  assert.ok(markup.includes('data-phone'));
  assert.ok(markup.includes('inputmode="numeric"'));
  assert.ok(markup.includes('placeholder="(81) 99999-9999"'));
  assert.ok(markup.includes('Salvo com DDI 55'));
  assert.ok(markup.includes('Somente administradores criam contas'));
});

test('edição de usuário recarrega o telefone formatado e valida ao salvar', () => {
  const markup = String(rbacPage({ rbac: snapshot, editingUserId: 'u1' }));
  assert.ok(markup.includes('data-form="edit-user"'));
  assert.ok(markup.includes('value="(81) 99999-8888"'), 'telefone armazenado com DDI deve aparecer mascarado');
  assert.ok(markup.includes('value="Mariana Costa"'));
  assert.ok(markup.includes('value="Vale Uvas"'));
  assert.ok(markup.includes('data-action="cancel-edit-user"'));
});

test('erro de telefone inválido é exibido de forma clara no formulário', () => {
  const markup = String(rbacPage({ rbac: snapshot, userFormError: 'DDD inválido: use um código de área brasileiro existente, ex.: (81).' }));
  assert.ok(markup.includes('DDD inválido'));
  assert.ok(markup.includes('role="alert"'));
});

test('sem edição ativa, o formulário de edição não aparece', () => {
  const markup = String(rbacPage({ rbac: snapshot }));
  assert.ok(!markup.includes('data-form="edit-user"'));
  assert.ok(markup.includes('data-action="edit-user"'), 'botão Editar deve existir na tabela');
});
