import test from 'node:test';
import assert from 'node:assert/strict';
import { formatStoredPhone, maskBrPhone, onlyDigits, validateBrPhone } from '../js/utils/phone.js';

test('máscara celular progressiva: (81) 99999-9999', () => {
  assert.equal(maskBrPhone('8'), '(8');
  assert.equal(maskBrPhone('81'), '(81');
  assert.equal(maskBrPhone('819'), '(81) 9');
  assert.equal(maskBrPhone('8199999'), '(81) 9999-9');
  assert.equal(maskBrPhone('81999998888'), '(81) 99999-8888');
});

test('máscara fixo: (81) 3333-4444', () => {
  assert.equal(maskBrPhone('8133334444'), '(81) 3333-4444');
});

test('letras e caracteres indevidos são bloqueados na entrada', () => {
  assert.equal(maskBrPhone('abc81def99999gh8888'), '(81) 99999-8888');
  assert.equal(maskBrPhone('!@#$%^&*()_+81'), '(81');
  assert.equal(onlyDigits('a1b2c3'), '123');
});

test('campo limita a um único número (11 dígitos nacionais)', () => {
  // Dois números colados: o excedente é descartado pela máscara.
  assert.equal(maskBrPhone('8199999888881988887777'), '(81) 99999-8888');
  const check = validateBrPhone('81999998888 81988887777');
  assert.equal(check.valid, false);
  assert.match(check.message, /apenas um número/);
});

test('DDI 55 é removido na digitação e incluído no armazenamento', () => {
  assert.equal(maskBrPhone('5581999998888'), '(81) 99999-8888');
  assert.equal(validateBrPhone('+55 (81) 99999-8888').digits, '5581999998888');
  assert.equal(validateBrPhone('558133334444').digits, '558133334444');
});

test('celular válido aceito e padronizado com DDI', () => {
  const check = validateBrPhone('(81) 99999-8888');
  assert.equal(check.valid, true);
  assert.equal(check.digits, '5581999998888');
});

test('fixo válido aceito e padronizado com DDI', () => {
  const check = validateBrPhone('(81) 3333-4444');
  assert.equal(check.valid, true);
  assert.equal(check.digits, '558133334444');
});

test('DDD inválido rejeitado com mensagem clara', () => {
  for (const ddd of ['00', '23', '25', '26', '29', '30', '36', '39', '50', '52', '56', '57', '58', '59', '60', '70', '72', '76', '78', '80', '90']) {
    const check = validateBrPhone(`(${ddd}) 99999-8888`);
    assert.equal(check.valid, false, `DDD ${ddd} deveria ser inválido`);
    assert.match(check.message, /DDD inválido/);
  }
});

test('DDD válido de todas as regiões aceito', () => {
  for (const ddd of ['11', '21', '31', '41', '51', '61', '71', '81', '91', '48', '65', '95']) {
    assert.equal(validateBrPhone(`(${ddd}) 99999-8888`).valid, true, `DDD ${ddd} deveria ser válido`);
  }
});

test('número incompleto rejeitado', () => {
  const check = validateBrPhone('(81) 9999-888');
  assert.equal(check.valid, false);
  assert.match(check.message, /incompleto/);
});

test('sequências repetidas rejeitadas', () => {
  // 00000000000 cai primeiro na regra de DDD inexistente; as demais na de repetição.
  for (const value of ['00000000000', '11111111111', '(11) 11111-1111', '(81) 99999-9999', '(81) 3333-3333']) {
    const check = validateBrPhone(value);
    assert.equal(check.valid, false, `${value} deveria ser inválido`);
    assert.match(check.message, /repetidas|DDD inválido/);
  }
  assert.match(validateBrPhone('11111111111').message, /repetidas/);
});

test('celular de 9 dígitos precisa começar com 9', () => {
  const check = validateBrPhone('(81) 89999-8888');
  assert.equal(check.valid, false);
  assert.match(check.message, /começar com 9/);
});

test('fixo precisa começar com 2, 3, 4 ou 5', () => {
  assert.equal(validateBrPhone('(81) 1333-4444').valid, false);
  assert.equal(validateBrPhone('(81) 9333-4444').valid, false);
  assert.equal(validateBrPhone('(81) 2333-4444').valid, true);
  assert.equal(validateBrPhone('(81) 5333-4444').valid, true);
});

test('campo vazio é válido (opcional) e não envia dígitos', () => {
  const check = validateBrPhone('');
  assert.equal(check.valid, true);
  assert.equal(check.empty, true);
  assert.equal(check.digits, '');
});

test('telefone armazenado com DDI é recarregado formatado para edição', () => {
  assert.equal(formatStoredPhone('5581999998888'), '(81) 99999-8888');
  assert.equal(formatStoredPhone('558133334444'), '(81) 3333-4444');
  assert.equal(formatStoredPhone(''), '');
  // O valor recarregado continua válido.
  assert.equal(validateBrPhone(formatStoredPhone('5581999998888')).digits, '5581999998888');
});
