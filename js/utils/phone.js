/**
 * Telefone brasileiro: máscara progressiva, validação rigorosa e normalização.
 *
 * As regras espelham o backend (PhoneNumber.java):
 * - somente dígitos são aproveitados (letras e símbolos são descartados);
 * - DDI +55 é opcional na digitação e sempre incluído no valor enviado à API;
 * - fixo: DDD + 8 dígitos iniciando com 2–5 → (81) 3333-4444;
 * - celular: DDD + 9 dígitos iniciando com 9 → (81) 99999-8888;
 * - DDD precisa existir; sequências repetidas e números incompletos são rejeitados.
 */

const VALID_DDD = new Set([
  '11', '12', '13', '14', '15', '16', '17', '18', '19',
  '21', '22', '24', '27', '28',
  '31', '32', '33', '34', '35', '37', '38',
  '41', '42', '43', '44', '45', '46', '47', '48', '49',
  '51', '53', '54', '55',
  '61', '62', '63', '64', '65', '66', '67', '68', '69',
  '71', '73', '74', '75', '77', '79',
  '81', '82', '83', '84', '85', '86', '87', '88', '89',
  '91', '92', '93', '94', '95', '96', '97', '98', '99',
]);

export const onlyDigits = (value) => String(value ?? '').replace(/\D/g, '');

/** Remove o DDI 55 quando o conjunto tem 12–13 dígitos e limita a 11 (DDD + número). */
function nationalDigits(value) {
  let digits = onlyDigits(value);
  if (digits.length > 11 && digits.startsWith('55')) digits = digits.slice(2);
  return digits.slice(0, 11);
}

/** Máscara progressiva aplicada enquanto o usuário digita. Aceita apenas dígitos. */
export function maskBrPhone(value) {
  const digits = nationalDigits(value);
  if (!digits) return '';
  if (digits.length <= 2) return `(${digits}`;
  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);
  if (rest.length <= 4) return `(${ddd}) ${rest}`;
  const split = rest.length > 8 ? 5 : 4;
  return `(${ddd}) ${rest.slice(0, split)}-${rest.slice(split)}`;
}

/**
 * Valida o número e devolve o formato de armazenamento (somente dígitos com DDI).
 * Campo opcional: vazio é válido e retorna `digits: ''`.
 * @returns {{ valid: boolean, empty: boolean, digits: string, message: string }}
 */
export function validateBrPhone(value) {
  const ok = (digits) => ({ valid: true, empty: !digits, digits, message: '' });
  const fail = (message) => ({ valid: false, empty: false, digits: '', message });

  const raw = onlyDigits(value);
  if (!raw) return ok('');
  let digits = raw;
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) digits = digits.slice(2);

  if (digits.length < 10) return fail('Telefone incompleto: informe DDD + número (10 dígitos para fixo ou 11 para celular).');
  if (digits.length > 11) return fail('Informe apenas um número de telefone com DDD (10 ou 11 dígitos).');

  const ddd = digits.slice(0, 2);
  if (!VALID_DDD.has(ddd)) return fail('DDD inválido: use um código de área brasileiro existente, ex.: (81).');

  const number = digits.slice(2);
  if (/^(\d)\1+$/.test(number) || /^(\d)\1+$/.test(digits)) return fail('Número de telefone inválido: não use sequências repetidas.');
  if (digits.length === 11 && number[0] !== '9') return fail('Celular com 9 dígitos deve começar com 9, ex.: (81) 99999-9999.');
  if (digits.length === 10 && !/^[2-5]/.test(number)) return fail('Telefone fixo deve começar com 2, 3, 4 ou 5, ex.: (81) 3333-3333.');

  return ok(`55${digits}`);
}

/** Formata para exibição um telefone vindo da API (ex.: "5581999998888" → "(81) 99999-8888"). */
export const formatStoredPhone = (stored) => maskBrPhone(stored);
