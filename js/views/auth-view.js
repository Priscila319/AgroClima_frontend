import { html } from '../utils/html.js';
import { icon } from '../components/icons.js';
import { badge, button, logo } from '../components/ui.js';

const GRAPE_COUNT = 10;
const AUTH_POINTS = [
  'Plantações e colheitas persistidas no servidor',
  'Leituras ThingSpeak quando configuradas',
  'Acesso por perfil validado pela API',
];

const backToLogin = html`<button type="button" class="back-link" data-action="auth-mode" data-mode="login">← Voltar ao login</button>`;

const textField = ({ label, placeholder, type = 'text', name, required = true, autocomplete = '', minLength, maxLength }) =>
  html`<label class="field"><span>${label}</span><input name="${name}" type="${type}" placeholder="${placeholder}"${required ? ' required' : ''}${autocomplete ? html` autocomplete="${autocomplete}"` : ''}${minLength ? html` minlength="${minLength}"` : ''}${maxLength ? html` maxlength="${maxLength}"` : ''}></label>`;

function loginForm(email, authMessage = '', busy = false) {
  return html`<div class="auth-heading"><span class="overline">Acesso à plataforma</span><h1>Bem-vindo ao AgroClima Cloud</h1><p>Entre com a conta cadastrada no serviço seguro da plataforma.</p></div>${authMessage && html`<p class="form-feedback auth-feedback" role="alert">${authMessage}</p>`}<form data-form="login"><label class="field"><span>E-mail</span><input id="login-email" name="email" type="email" value="${email}" placeholder="nome@empresa.com" autocomplete="username" required></label><label class="field"><span>Senha</span><div class="input-icon"><input name="password" type="password" placeholder="Digite sua senha" autocomplete="current-password" required maxlength="72">${icon('eye')}</div></label>${button(busy ? 'Entrando…' : 'Entrar na plataforma', { type: 'submit', disabled: busy })}</form><div class="signup-link">Ainda não tem uma conta? <button type="button" data-action="auth-mode" data-mode="signup">Criar uma conta</button></div><p class="auth-security-note">A autenticação e as permissões são verificadas pela API Java. Não use contas demonstrativas.</p>`;
}

function signupForm(authMessage = '', busy = false) {
  return html`${backToLogin}<div class="auth-heading"><h1>Crie sua conta</h1><p>O cadastro público cria uma conta de Produtor. Um administrador poderá alterar o perfil.</p></div>${authMessage && html`<p class="form-feedback auth-feedback" role="alert">${authMessage}</p>`}<form data-form="signup"><div class="form-grid">${textField({ name: 'name', label: 'Nome completo', placeholder: 'Seu nome', autocomplete: 'name', minLength: 2, maxLength: 160 })}${textField({ name: 'email', label: 'E-mail', placeholder: 'nome@empresa.com', type: 'email', autocomplete: 'email', maxLength: 254 })}${textField({ name: 'phone', label: 'Telefone', placeholder: '(87) 99999-0000', required: false, autocomplete: 'tel', maxLength: 30 })}${textField({ name: 'organization', label: 'Empresa', placeholder: 'Nome da empresa', required: false, maxLength: 160 })}${textField({ name: 'jobTitle', label: 'Cargo', placeholder: 'Seu cargo', required: false, maxLength: 120 })}${textField({ name: 'password', label: 'Senha', placeholder: 'Mínimo 8 caracteres', type: 'password', autocomplete: 'new-password', minLength: 8, maxLength: 72 })}${textField({ name: 'confirmPassword', label: 'Confirmar senha', placeholder: 'Repita a senha', type: 'password', autocomplete: 'new-password', minLength: 8, maxLength: 72 })}</div><label class="terms"><input name="terms" type="checkbox" required>Li e aceito os Termos de Uso e a Política de Privacidade.</label>${button(busy ? 'Criando…' : 'Criar conta', { type: 'submit', disabled: busy })}</form>`;
}

function forgotForm(authMessage = '') {
  return html`${backToLogin}<div class="auth-heading"><div class="recover-icon">${icon('lock')}</div><h1>Recuperação de senha</h1><p>O envio automático de links ainda não está configurado. Fale com o administrador da plataforma para redefinir sua senha.</p></div>${authMessage && html`<p class="form-feedback" role="status">${authMessage}</p>`}<button type="button" class="btn btn-secondary" data-action="auth-mode" data-mode="login">Voltar ao login</button>`;
}

export function authFormContent({ authMode, email, authMessage, authBusy }) {
  if (authMode === 'signup') return signupForm(authMessage, authBusy);
  if (authMode === 'forgot') return forgotForm(authMessage);
  return loginForm(email, authMessage, authBusy);
}

function visualPanel() {
  const grapes = Array.from({ length: GRAPE_COUNT }, () => html`<i></i>`);
  const points = AUTH_POINTS.map((point) => html`<span>${icon('check')}${point}</span>`);
  return html`<div class="auth-visual">${logo({ light: true })}<div class="auth-art"><div class="orbit orbit-a"><span>${icon('cloud')}</span></div><div class="orbit orbit-b"><span>${icon('thermo')}</span></div><div class="grape-cluster">${grapes}</div><div class="sensor-card">${icon('wifi')}<div><span>Integração climática</span><strong>ThingSpeak configurável</strong></div>${badge('API', 'info')}</div></div><div class="auth-message"><span>Inteligência para o Vale do São Francisco</span><h2>Dados confiáveis.<br>Decisões no tempo certo.</h2><p>Plantações, leituras e dashboards integrados aos serviços AgroClima.</p><div class="auth-points">${points}</div></div></div>`;
}

export function authView(state) {
  return html`<div class="auth-shell">${visualPanel()}<main class="auth-form-wrap"><div class="mobile-logo">${logo()}</div><div class="auth-form">${state.booting ? html`<p class="form-feedback" role="status">Restaurando sessão segura…</p>` : authFormContent(state)}</div><p class="auth-footer">© 2026 AgroClima Cloud · Projeto Integrador ADS</p></main></div>`;
}
