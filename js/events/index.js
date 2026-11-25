import { NAVIGATION, ROLES } from '../config/roles.js';
import { canAccessPage, canOpenPage, normalizeRbacSnapshot, setRbacSnapshot, snapshotForUser } from '../modules/access-control.js';
import { signIn, signOut } from '../modules/auth.js';
import { recordAuditEvent, getAuditEvents } from '../modules/audit.js';
import { createPlantation as registerPlantation, getPlantations, recordHarvest } from '../modules/plantations.js';
import { DEFAULT_DESIGN, applyDesignTokens, normalizeDesign } from '../modules/design-tokens.js';
import { saveSettings } from '../modules/settings.js';
import { apiDelete, apiPatch, apiPost } from '../services/api.js';
import { loadPageData, loadWorkspaceData, normalizeUser, roleLabel } from '../services/workspace.js';
import { maskBrPhone, validateBrPhone } from '../utils/phone.js';
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

const hasPermission = (key) => Boolean(getState().user?.permissionKeys?.includes?.(key));
const firstAccessiblePage = (role) => NAVIGATION[role]?.find((item) => canAccessPage(role, item.label))?.label || null;

async function refreshAudit() {
  if (!hasPermission('logs.read')) return;
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
  // Cadastro público removido: apenas login e orientação de recuperação existem.
  const next = mode === 'forgot' ? 'forgot' : 'login';
  setState({ authMode: next, authMessage: '' });
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

async function createPlantation(form) {
  const state = getState();
  if (!canAccessPage(state.role, 'Minhas Plantações')) return;
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
  if (!canAccessPage(getState().role, 'Minhas Plantações')) return;
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
  if (!hasPermission('settings.manage')) return;
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

/* ------------------------------ Design System ------------------------------ */

function activeDesign(state = getState()) {
  return state.designDraft || state.settings?.design || DEFAULT_DESIGN;
}

/**
 * Pré-visualização em tempo real: cada controle aplica os tokens imediatamente
 * (variáveis CSS inline) e guarda um rascunho. Nada é persistido até "Salvar".
 */
function updateDesignDraft(control) {
  const state = getState();
  if (!canAccessPage(state.role, 'Design System')) return;
  const path = control.dataset.design;
  if (!path) return;
  const value = control.type === 'range' ? Number(control.value) : control.value;
  const draft = structuredClone(activeDesign(state));
  setDeep(draft, path, value);
  const design = normalizeDesign(draft);
  applyDesignTokens(design, state.theme);
  setState({ designDraft: design });
  // Atualiza os rótulos de valor sem re-renderizar (mantém o foco no controle).
  document.querySelectorAll(`[data-design-value="${path}"]`).forEach((label) => {
    label.textContent = `${value}${label.dataset.suffix || ''}`;
  });
}

function switchDesignTheme(theme) {
  if (!canAccessPage(getState().role, 'Design System')) return;
  setState({ theme: theme === 'dark' ? 'dark' : 'light' });
}

async function persistDesign(design, message) {
  const state = getState();
  try {
    const settings = await saveSettings({ design, appearance: { theme: state.theme } });
    setState({ settings, designDraft: null, theme: settings.appearance.theme, designMessage: message, designError: false });
  } catch (error) {
    setState({ designMessage: error.message || 'Não foi possível salvar o design no servidor.', designError: true });
  }
}

async function saveDesignForm() {
  const state = getState();
  if (!canAccessPage(state.role, 'Design System')) return;
  if (!hasPermission('settings.manage')) {
    setState({ designMessage: 'Salvar o design exige a permissão "Alterar configurações do sistema" (settings.manage).', designError: true });
    return;
  }
  await persistDesign(normalizeDesign(activeDesign(state)), 'Design salvo no servidor. As alterações valem para todos os usuários e permanecem após novo login.');
}

async function resetDesign() {
  const state = getState();
  if (!canAccessPage(state.role, 'Design System') || !hasPermission('settings.manage')) return;
  const design = normalizeDesign(structuredClone(DEFAULT_DESIGN));
  applyDesignTokens(design, state.theme);
  setState({ designDraft: design });
  await persistDesign(design, 'Design restaurado para o padrão original e salvo no servidor.');
}

function discardDesignDraft() {
  const state = getState();
  applyDesignTokens(state.settings?.design, state.theme);
  setState({ designDraft: null, designMessage: 'Alterações não salvas foram descartadas; o design salvo voltou a valer.', designError: false });
}

/* ------------------------------ Usuários (admin) ------------------------------ */

async function assignRole(target) {
  if (!hasPermission('users.manage')) return;
  const state = getState();
  try {
    const updated = normalizeUser(await apiPatch('java', `/api/users/${encodeURIComponent(target.dataset.userId)}/role`, { roleKey: roleKey(target.value) }));
    const users = state.users.map((user) => user.id === updated.id ? updated : user);
    const rbac = { ...state.rbac, users };
    setRbacSnapshot(rbac);
    const patch = { users, rbac, rbacMessage: 'Papel atualizado no servidor.' };
    if (updated.id === state.user?.id) {
      // O próprio papel mudou: atualiza sessão, permissões e página imediatamente.
      const role = roleLabel(updated.roleKey);
      setRbacSnapshot(snapshotForUser(updated));
      patch.user = updated;
      patch.role = role;
      patch.roleKey = updated.roleKey;
      patch.page = canOpenPage(role, state.page) ? state.page : firstAccessiblePage(role);
    }
    setState(patch);
    await refreshAudit();
  } catch (error) {
    setState({ rbacMessage: error.message || 'Não foi possível alterar o papel.' });
  }
}

async function setUserStatus(target) {
  if (!hasPermission('users.manage')) return;
  try {
    const status = target.value === 'ACTIVE' ? 'ACTIVE' : 'BLOCKED';
    const updated = normalizeUser(await apiPatch('java', `/api/users/${encodeURIComponent(target.dataset.userId)}/status`, { status }));
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
  if (!hasPermission('rbac.manage')) return;
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
    setState({ rbac, rbacMessage: 'Matriz de permissões atualizada no servidor. Os menus dos usuários afetados mudam no próximo acesso.' });
    await refreshAudit();
  } catch (error) {
    setState({ rbacMessage: error.message || 'Não foi possível alterar a permissão.' });
  }
}

function phoneFromForm(values) {
  const check = validateBrPhone(values.get('phone'));
  if (!check.valid) {
    setState({ userFormError: check.message });
    return null;
  }
  return check.digits;
}

function describeApiError(error, fallback) {
  const fieldErrors = error?.fieldErrors ? Object.values(error.fieldErrors).join(' ') : '';
  return [error?.message || fallback, fieldErrors].filter(Boolean).join(' ');
}

async function addUser(form) {
  if (!hasPermission('users.manage')) return;
  const values = new FormData(form);
  const phone = phoneFromForm(values);
  if (phone === null) return;
  try {
    const created = await apiPost('java', '/api/users', {
      fullName: String(values.get('name') || '').trim(),
      email: String(values.get('email') || '').trim(),
      password: String(values.get('password') || ''),
      phone,
      organization: String(values.get('organization') || '').trim(),
      jobTitle: String(values.get('jobTitle') || '').trim(),
      roleKey: roleKey(values.get('role')),
    });
    await refreshAdminData();
    setState({ rbacMessage: `Conta de ${created.name} criada no servidor.`, userFormError: '' });
  } catch (error) {
    setState({ rbacMessage: describeApiError(error, 'Não foi possível adicionar o usuário.'), userFormError: error?.fieldErrors?.phone || '' });
  }
}

async function saveUserEdit(form) {
  const state = getState();
  if (!hasPermission('users.manage') || !state.editingUserId) return;
  const values = new FormData(form);
  const phone = phoneFromForm(values);
  if (phone === null) return;
  try {
    const updated = normalizeUser(await apiPatch('java', `/api/users/${encodeURIComponent(state.editingUserId)}`, {
      fullName: String(values.get('name') || '').trim(),
      phone,
      organization: String(values.get('organization') || '').trim(),
      jobTitle: String(values.get('jobTitle') || '').trim(),
    }));
    const users = state.users.map((user) => user.id === updated.id ? updated : user);
    const rbac = { ...state.rbac, users };
    setRbacSnapshot(rbac);
    const patch = { users, rbac, editingUserId: null, userFormError: '', rbacMessage: 'Dados do usuário atualizados no servidor.' };
    if (updated.id === state.user?.id) patch.user = updated;
    setState(patch);
    await refreshAudit();
  } catch (error) {
    setState({ rbacMessage: describeApiError(error, 'Não foi possível atualizar o usuário.'), userFormError: error?.fieldErrors?.phone || '' });
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

async function reloadModels() {
  const state = getState();
  const result = await loadPageData('Modelos Preditivos', state.roleKey, state.user?.permissionKeys || []);
  if (!getState().authenticated || getState().page !== 'Modelos Preditivos') return;
  const errors = result.pageErrors || [];
  delete result.pageErrors;
  setState({ ...result, pageError: errors.length ? errors.map((error) => error.message).join(' · ') : '' });
}

async function trainModel() {
  if (!hasPermission('models.manage')) return;
  const state = getState();
  setState({ modelBusy: true, modelError: '', modelMessage: '' });
  try {
    const result = await apiPost('python', '/api/v1/models/train', {
      algorithm: state.modelAlgorithm,
      horizonDays: Number(state.modelHorizon) || 3,
    });
    setState({ modelMessage: result?.message || 'Modelo treinado e ativado.', modelBusy: false });
    await reloadModels();
    await refreshAudit();
  } catch (error) {
    setState({ modelBusy: false, modelError: describeApiError(error, 'Não foi possível treinar o modelo.') });
  }
}

async function deleteModel() {
  if (!hasPermission('models.manage')) return;
  setState({ modelBusy: true, modelError: '', modelMessage: '' });
  try {
    await apiDelete('python', '/api/v1/models/active');
    setState({ modelMessage: 'Modelo removido. A projeção voltou ao modelo estatístico.', modelBusy: false });
    await reloadModels();
    await refreshAudit();
  } catch (error) {
    setState({ modelBusy: false, modelError: describeApiError(error, 'Não foi possível remover o modelo.') });
  }
}

async function refreshModels() {
  setState({ modelBusy: true, modelError: '', modelMessage: '' });
  try {
    await reloadModels();
    setState({ modelBusy: false });
  } catch (error) {
    setState({ modelBusy: false, modelError: describeApiError(error, 'Não foi possível atualizar os modelos.') });
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
    if (canOpenPage(getState().role, page)) {
      setState({ page, menuOpen: false, pageError: '' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
  if (action === 'design-theme') return switchDesignTheme(element.dataset.theme);
  if (action === 'design-reset') return void resetDesign();
  if (action === 'design-discard') return discardDesignDraft();
  if (action === 'edit-user') {
    if (!hasPermission('users.manage')) return;
    return setState({ editingUserId: element.dataset.userId, userFormError: '', rbacMessage: '' });
  }
  if (action === 'cancel-edit-user') return setState({ editingUserId: null, userFormError: '' });
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
  if (action === 'train-model') return void trainModel();
  if (action === 'delete-model') return void deleteModel();
  if (action === 'refresh-models') return void refreshModels();
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
  if (target.matches('select[data-action="model-algorithm"]')) return setState({ modelAlgorithm: target.value });
  if (target.matches('select[data-action="model-horizon"]')) return setState({ modelHorizon: Number(target.value) || 3 });
  if (target.matches('[data-design]')) return updateDesignDraft(target);
}

function handleInput({ target }) {
  if (target.matches('#login-email')) return setState({ email: target.value });
  // Máscara de telefone brasileiro: somente dígitos, aplicada a cada tecla.
  if (target.matches('input[data-phone]')) {
    target.value = maskBrPhone(target.value);
    return;
  }
  if (target.matches('input[data-design]')) return updateDesignDraft(target);
}

function handleSubmit(event) {
  const form = event.target.closest('form[data-form]');
  if (!form) return;
  event.preventDefault();
  const action = form.dataset.form;
  if (action === 'login') return void login(form);
  if (action === 'forgot') return setState({ authMode: 'login', authMessage: 'A recuperação automática não está disponível. Contate o administrador.' });
  if (action === 'create-plantation') return void createPlantation(form);
  if (action === 'settings') return void saveSettingsForm(form);
  if (action === 'rbac-user') return void addUser(form);
  if (action === 'edit-user') return void saveUserEdit(form);
  if (action === 'design-system') return void saveDesignForm();
  if (action === 'filter-logs') return void submitLogFilters(form);
}

export function bindEvents(root) {
  root.addEventListener('click', handleClick);
  root.addEventListener('change', handleChange);
  root.addEventListener('input', handleInput);
  root.addEventListener('submit', handleSubmit);
}
