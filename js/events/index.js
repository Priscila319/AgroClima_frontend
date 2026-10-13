import { NAVIGATION, ROLES } from '../config/roles.js';
import { canAccessPage, normalizeRbacSnapshot, setRbacSnapshot } from '../modules/access-control.js';
import { signIn, signOut, signUp } from '../modules/auth.js';
import { recordAuditEvent, getAuditEvents } from '../modules/audit.js';
import { createPlantation as registerPlantation, getPlantations, recordHarvest } from '../modules/plantations.js';
import { saveSettings } from '../modules/settings.js';
import { apiGet, apiPatch, apiPost } from '../services/api.js';
import { loadWorkspaceData } from '../services/workspace.js';
import { buildAnalystCsv } from '../views/pages/analyst.js';
import { buildProducerCsv } from '../views/pages/plantations.js';
import { getState, resetState, setState } from '../state/store.js';

function roleKey(value) {
  const role = Object.values(ROLES).find((candidate) => candidate === value);
  return ({
    [ROLES.PRODUCER]: 'PRODUCER',
    [ROLES.ANALYST]: 'ANALYST',
    [ROLES.ADMIN]: 'ADMIN',
  })[role] || String(value || '').toUpperCase();
}

async function refreshAudit() {
  if (getState().roleKey !== 'ADMIN') return;
  try {
    setState({ auditLogs: await getAuditEvents() });
  } catch {
    // A falha ao atualizar a lista não deve desfazer uma operação já concluída.
  }
}

async function refreshAdminData(messageKey = 'rbacMessage') {
  const state = getState();
  const workspace = await loadWorkspaceData(state.user);
  if (!getState().authenticated) return;
  setState({
    ...workspace,
    users: workspace.users || [],
    auditLogs: workspace.auditLogs || [],
    rbacMessage: messageKey === 'rbacMessage' ? getState().rbacMessage : '',
  });
}

function announceLogin(user) {
  if (typeof CustomEvent === 'function') globalThis.dispatchEvent?.(new CustomEvent('agroclima:authenticated', { detail: user }));
}

function setAuthMode(mode) {
  setState({ authMode: mode, authMessage: '' });
}

async function login(form) {
  const values = new FormData(form);
  setState({ authBusy: true, authMessage: '' });
  try {
    const user = await signIn(values.get('email'), values.get('password'));
    announceLogin(user);
  } catch (error) {
    setState({ authBusy: false, authMessage: error.message || 'Não foi possível iniciar sessão.' });
  }
}

async function register(form) {
  const values = new FormData(form);
  const password = String(values.get('password') || '');
  if (password !== String(values.get('confirmPassword') || '')) {
    setState({ authMessage: 'As senhas informadas não coincidem.' });
    return;
  }
  setState({ authBusy: true, authMessage: '' });
  try {
    await signUp({
      name: values.get('name'),
      email: values.get('email'),
      password,
      phone: values.get('phone'),
      organization: values.get('organization'),
      jobTitle: values.get('jobTitle'),
    });
    setState({ authMode: 'login', authBusy: false, email: String(values.get('email') || ''),
      authMessage: 'Conta criada como Produtor. Entre com o e-mail e a senha cadastrados.' });
  } catch (error) {
    setState({ authBusy: false, authMessage: error.message || 'Não foi possível criar a conta.' });
  }
}

async function createPlantation(form) {
  const state = getState();
  if (state.roleKey !== 'PRODUCER' || !canAccessPage(state.role, 'Minhas Plantações')) return;
  try {
    const data = new FormData(form);
    const plantation = await registerPlantation({
      variety: data.get('variety'),
      quantity: data.get('quantity'),
      field: data.get('field'),
      notes: data.get('notes'),
    });
    setState({ plantations: await getPlantations(), producerMessage: `Plantação de ${plantation.variety} cadastrada. A data de início foi registrada pelo servidor.` });
  } catch (error) {
    setState({ producerMessage: error.message || 'Não foi possível cadastrar a plantação.' });
  }
}

async function harvestPlantation(element) {
  if (getState().roleKey !== 'PRODUCER') return;
  try {
    const plantation = await recordHarvest(element.dataset.id);
    setState({ plantations: await getPlantations(), producerMessage: `Colheita de ${plantation.variety} registrada pelo servidor.` });
  } catch (error) {
    setState({ producerMessage: error.message || 'Não foi possível registrar a colheita.' });
  }
}

function setDeep(target, path, value) {
  const keys = path.split('.');
  let current = target;
  keys.forEach((key, index) => {
    if (index === keys.length - 1) current[key] = value;
    else {
      current[key] ??= {};
      current = current[key];
    }
  });
}

async function saveSettingsForm(form) {
  if (getState().roleKey !== 'ADMIN') return;
  const patch = {};
  form.querySelectorAll('[data-setting]').forEach((control) => {
    if (control.disabled) return;
    const value = control.type === 'checkbox' ? control.checked : control.value;
    setDeep(patch, control.dataset.setting, value);
  });
  try {
    const settings = await saveSettings(patch);
    setState({ settings, theme: settings.appearance.theme, settingsMessage: 'Configurações salvas no servidor.' });
  } catch (error) {
    setState({ settingsMessage: error.message || 'Não foi possível salvar as configurações.' });
  }
}

function saveTheme(target) {
  const theme = target.value === 'dark' ? 'dark' : 'light';
  const settings = getState().settings;
  setState({ theme, settings: { ...settings, appearance: { ...settings.appearance, theme } } });
}

async function assignRole(target) {
  if (getState().roleKey !== 'ADMIN') return;
  try {
    const updated = await apiPatch('java', `/api/users/${encodeURIComponent(target.dataset.userId)}/role`, { roleKey: roleKey(target.value) });
    const users = getState().users.map((user) => user.id === updated.id ? { ...updated, role: target.value } : user);
    setState({ users, rbac: { ...getState().rbac, users }, rbacMessage: 'Papel atualizado no servidor.' });
    await refreshAudit();
  } catch (error) {
    setState({ rbacMessage: error.message || 'Não foi possível alterar o papel.' });
  }
}

async function setUserStatus(target) {
  if (getState().roleKey !== 'ADMIN') return;
  try {
    const status = target.value === 'ACTIVE' ? 'ACTIVE' : 'BLOCKED';
    const updated = await apiPatch('java', `/api/users/${encodeURIComponent(target.dataset.userId)}/status`, { status });
    const users = getState().users.map((user) => user.id === updated.id ? updated : user);
    const rbac = { ...getState().rbac, users };
    setRbacSnapshot(rbac);
    setState({ users, rbac, rbacMessage: 'Situação da conta atualizada no servidor.' });
    await refreshAudit();
  } catch (error) {
    setState({ rbacMessage: error.message || 'Não foi possível alterar a situação da conta.' });
  }
}

async function updateRolePermission(target) {
  if (getState().roleKey !== 'ADMIN') return;
  const state = getState();
  const selectedRole = state.rbac.roles.find((role) => role.key === target.dataset.role);
  if (!selectedRole || selectedRole.key === 'ADMIN') return;
  try {
    const current = new Set(state.rbac.rolePermissions[selectedRole.label] || []);
    if (target.checked) current.add(target.dataset.permission);
    else current.delete(target.dataset.permission);
    const updated = await apiPatch('java', `/api/roles/${encodeURIComponent(selectedRole.key)}/permissions`, {
      permissionKeys: [...current],
    });
    const roles = state.rbac.roles.map((role) => role.key === updated.key ? updated : role);
    const rbac = normalizeRbacSnapshot({ users: state.users, roles, permissions: state.rbac.permissions });
    setRbacSnapshot(rbac);
    setState({ rbac, rbacMessage: 'Matriz de permissões atualizada no servidor.' });
    await refreshAudit();
  } catch (error) {
    setState({ rbacMessage: error.message || 'Não foi possível alterar a permissão.' });
  }
}

async function addUser(form) {
  if (getState().roleKey !== 'ADMIN') return;
  try {
    const values = new FormData(form);
    const created = await apiPost('java', '/api/users', {
      fullName: String(values.get('name') || '').trim(),
      email: String(values.get('email') || '').trim(),
      password: String(values.get('password') || ''),
      phone: String(values.get('phone') || '').trim(),
      organization: String(values.get('organization') || '').trim(),
      jobTitle: String(values.get('jobTitle') || '').trim(),
      roleKey: roleKey(values.get('role')),
    });
    await refreshAdminData();
    setState({ rbacMessage: `Conta de ${created.name} criada no servidor.` });
  } catch (error) {
    setState({ rbacMessage: error.message || 'Não foi possível adicionar o usuário.' });
  }
}

async function submitLogFilters(form) {
  const data = new FormData(form);
  setState({ logSearch: String(data.get('search') || '').trim(), logStatus: data.get('status') || 'Todos', logResource: data.get('resource') || 'Todos', expandedLogId: null });
}

async function logUserAction(action, resource, details) {
  try {
    await recordAuditEvent({ action, resource, details });
    await refreshAudit();
  } catch {
    // A exportação local continua disponível mesmo se o registro de auditoria falhar.
  }
}

async function logout() {
  try {
    await recordAuditEvent({ action: 'Encerrou sessão', resource: 'Sessão', details: 'Logout solicitado pelo usuário.' });
  } catch {
    // A saída da sessão não depende da disponibilidade do serviço de auditoria.
  }
  signOut();
  resetState();
}

function downloadCsv(filename, csv) {
  if (typeof document === 'undefined' || typeof URL?.createObjectURL !== 'function') return false;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

function handleClick(event) {
  const element = event.target.closest('[data-action]');
  if (!element) return;
  const action = element.dataset.action;
  if (action === 'navigate') {
    const page = element.dataset.page;
    if (NAVIGATION[getState().role]?.some((item) => item.label === page) && canAccessPage(getState().role, page)) {
      setState({ page, menuOpen: false, pageError: '' });
    }
    return;
  }
  if (action === 'open-menu') return setState({ menuOpen: true });
  if (action === 'close-menu') return setState({ menuOpen: false });
  if (action === 'logout') return void logout();
  if (action === 'toggle-theme') return saveTheme({ value: getState().theme === 'dark' ? 'light' : 'dark' });
  if (action === 'auth-mode') return setAuthMode(element.dataset.mode);
  if (action === 'harvest-plantation') return void harvestPlantation(element);
  if (action === 'settings-section') return setState({ settingsSection: element.dataset.section, settingsMessage: '' });
  if (action === 'cancel-settings') return setState({ settingsMessage: 'Alterações não salvas foram descartadas.' });
  if (action === 'design-interaction') return setState({ designMessage: element.dataset.message || 'Interação concluída.' });
  if (action === 'toggle-log-details') return setState({ expandedLogId: getState().expandedLogId === element.dataset.id ? null : element.dataset.id });
  if (action === 'sort-logs') return setState({ logSort: getState().logSort === 'newest' ? 'oldest' : 'newest' });
  if (action === 'clear-log-filters') return setState({ logSearch: '', logStatus: 'Todos', logResource: 'Todos', expandedLogId: null });
  if (action === 'download-analyst-report') {
    const state = getState();
    if (state.roleKey !== 'ANALYST') return;
    const downloaded = downloadCsv('relatorio-analitico-agroclima.csv', buildAnalystCsv(state));
    if (downloaded) void logUserAction('Gerou relatório CSV', 'Relatórios', 'Exportação de indicadores disponíveis nas APIs.');
    return;
  }
  if (action === 'download-producer-report') {
    const state = getState();
    if (state.roleKey !== 'PRODUCER') return;
    const downloaded = downloadCsv('relatorio-de-plantacoes.csv', buildProducerCsv(state.plantations));
    if (downloaded) void logUserAction('Baixou relatório de plantações', 'Relatórios', 'Resumo dos registros de plantio do produtor.');
    return;
  }
  if (action === 'run-demo-analysis' || action === 'save-demo-model') {
    return setState({ modelMessage: 'Nenhum modelo preditivo está configurado. A API não executou uma análise fictícia.' });
  }
}

function handleChange({ target }) {
  if (target.matches('select[data-action="change-variety"]')) {
    setState({ variety: target.value });
    return;
  }
  if (target.matches('select[data-locked-value]')) {
    target.value = target.dataset.lockedValue;
    return;
  }
  if (target.matches('input[data-action="change-theme"]')) return saveTheme(target);
  if (target.matches('select[data-action="rbac-user-role"]')) return void assignRole(target);
  if (target.matches('select[data-action="user-status"]')) return void setUserStatus(target);
  if (target.matches('input[data-action="rbac-permission"]')) return void updateRolePermission(target);
}

function handleInput({ target }) {
  if (target.matches('#login-email')) setState({ email: target.value });
}

function handleSubmit(event) {
  const form = event.target.closest('form[data-form]');
  if (!form) return;
  event.preventDefault();
  const action = form.dataset.form;
  if (action === 'login') return void login(form);
  if (action === 'signup') return void register(form);
  if (action === 'forgot') return setState({ authMode: 'login', authMessage: 'A recuperação automática não está disponível. Contate o administrador.' });
  if (action === 'create-plantation') return void createPlantation(form);
  if (action === 'settings') return void saveSettingsForm(form);
  if (action === 'rbac-user') return void addUser(form);
  if (action === 'filter-logs') return void submitLogFilters(form);
}

export function bindEvents(root) {
  root.addEventListener('click', handleClick);
  root.addEventListener('change', handleChange);
  root.addEventListener('input', handleInput);
  root.addEventListener('submit', handleSubmit);
}
