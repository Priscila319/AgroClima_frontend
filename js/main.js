import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-ext-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-ext-500.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/dm-sans/latin-ext-600.css';
import '@fontsource/dm-sans/latin-700.css';
import '@fontsource/dm-sans/latin-ext-700.css';
import '@fontsource/manrope/latin-600.css';
import '@fontsource/manrope/latin-ext-600.css';
import '@fontsource/manrope/latin-700.css';
import '@fontsource/manrope/latin-ext-700.css';
import '@fontsource/manrope/latin-800.css';
import '@fontsource/manrope/latin-ext-800.css';

import { bindEvents } from './events/index.js';
import { NAVIGATION } from './config/roles.js';
import { canAccessPage, canOpenPage, setRbacSnapshot, snapshotForUser } from './modules/access-control.js';
import { getCurrentUser, hasSession, signOut } from './modules/auth.js';
import { applyDesignTokens } from './modules/design-tokens.js';
import { getSettings } from './modules/settings.js';
import { getState, resetState, setState, subscribe } from './state/store.js';
import { authFormContent, authView } from './views/auth-view.js';
import { pageContent, shellView } from './views/shell-view.js';
import { loadPageData, loadWorkspaceData, normalizeUser, roleLabel } from './services/workspace.js';
import { mount, queryRequired, replaceElement } from './utils/dom.js';

const root = queryRequired('#root');

function applyAppearance(state) {
  const theme = state.theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  // Tokens do Design System valem para todas as páginas e ambos os temas.
  // O rascunho (designDraft) permite pré-visualização em tempo real antes de salvar.
  applyDesignTokens(state.designDraft || state.settings?.design, theme);
}

function renderApp() {
  const state = getState();
  applyAppearance(state);
  mount(root, state.authenticated ? shellView(state) : authView(state));
}

function renderAuthForm() {
  mount(queryRequired('.auth-form', root), authFormContent(getState()));
}

function renderPageContent() {
  replaceElement(queryRequired('main > .page-content', root), pageContent(getState()));
}

function updateNavigation({ page }) {
  root.querySelectorAll('.sidebar nav button').forEach((button) => {
    const isActive = button.dataset.page === page;
    button.classList.toggle('active', isActive);
    if (isActive) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
}

function updateMenu({ menuOpen }) {
  queryRequired('.sidebar', root).classList.toggle('open', menuOpen);
  queryRequired('.sidebar-overlay', root).classList.toggle('show', menuOpen);
}

function updateVariety() {
  const hadFocus = document.activeElement?.matches('select[data-action="change-variety"]');
  renderPageContent();
  if (hadFocus) root.querySelector('select[data-action="change-variety"]')?.focus({ preventScroll: true });
}

function firstPageFor(role) {
  return NAVIGATION[role]?.find((item) => canAccessPage(role, item.label))?.label || null;
}

/* ------------------------- Navegação por URL (#/pagina) ------------------------- */

const slugify = (label) => String(label).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const PAGE_BY_SLUG = new Map();
Object.values(NAVIGATION).flat().forEach((item) => PAGE_BY_SLUG.set(slugify(item.label), item.label));

function pageFromHash() {
  const match = globalThis.location?.hash.match(/^#\/([a-z0-9-]+)$/);
  return match ? PAGE_BY_SLUG.get(match[1]) ?? null : null;
}

function syncHash(page) {
  if (typeof globalThis.history?.replaceState !== 'function') return;
  const target = page ? `#/${slugify(page)}` : '#/';
  if (globalThis.location.hash !== target) globalThis.history.replaceState(null, '', target);
}

function clearHash() {
  if (typeof globalThis.history?.replaceState !== 'function') return;
  globalThis.history.replaceState(null, '', globalThis.location.pathname + globalThis.location.search);
}

function resolveInitialPage(role) {
  const fromHash = pageFromHash();
  if (fromHash && canOpenPage(role, fromHash)) return fromHash;
  return firstPageFor(role);
}

// URL direta editada manualmente: só abre página do perfil e com permissão.
globalThis.addEventListener?.('hashchange', () => {
  const state = getState();
  if (!state.authenticated) return;
  const target = pageFromHash();
  if (target && canOpenPage(state.role, target)) {
    if (state.page !== target) setState({ page: target, menuOpen: false, pageError: '' });
  } else {
    syncHash(state.page);
  }
});

async function refreshPageData(page = getState().page) {
  const state = getState();
  if (!state.authenticated || !page) return;
  setState({ pageLoading: true, pageError: '' });
  try {
    const result = await loadPageData(page, state.roleKey, state.user?.permissionKeys || [], state.period);
    if (!getState().authenticated || getState().page !== page) return;
    const errors = result.pageErrors || [];
    const pageError = errors.length ? errors.map((error) => error.message).join(' · ') : '';
    delete result.pageErrors;
    setState({ ...result, pageLoading: false, pageError });
  } catch (error) {
    if (getState().authenticated && getState().page === page) {
      setState({ pageLoading: false, pageError: error.message || 'Não foi possível atualizar os dados.' });
    }
  }
}

async function openWorkspace(rawUser) {
  const user = normalizeUser(rawUser);
  const role = roleLabel(user.roleKey);
  // As permissões efetivas vêm da API (login/me). Nada é liberado por suposição.
  setRbacSnapshot(snapshotForUser(user));
  const page = resolveInitialPage(role);
  setState({
    authenticated: true,
    booting: false,
    authBusy: false,
    authMessage: '',
    email: user.email,
    user,
    role,
    roleKey: user.roleKey,
    page,
    menuOpen: false,
    pageError: '',
    dataErrors: [],
  });
  syncHash(page);

  const workspace = await loadWorkspaceData(user);
  if (!getState().authenticated) return;
  const allowedPage = page && canOpenPage(role, page) ? page : firstPageFor(role);
  const settings = getSettings(workspace.settings || {});
  setState({
    ...workspace,
    page: allowedPage,
    settings,
    theme: settings.appearance.theme,
    designDraft: null,
    variety: settings.general.defaultVariety || getState().variety,
    users: workspace.users || [],
    auditLogs: workspace.auditLogs || [],
    plantations: workspace.plantations || [],
    varieties: workspace.varieties || [],
    dataErrors: workspace.dataErrors || [],
  });
  syncHash(allowedPage);
  await refreshPageData(allowedPage);
}

async function restoreSession() {
  if (!hasSession()) return;
  setState({ booting: true });
  renderApp();
  try {
    const user = await getCurrentUser();
    if (user) {
      await openWorkspace(user);
    } else {
      // Token expirado entre a checagem inicial e a consulta à API.
      signOut();
      setState({ authenticated: false, booting: false, authMessage: 'Sua sessão expirou. Entre novamente.' });
      renderApp();
    }
  } catch {
    signOut();
    setState({ authenticated: false, booting: false, authMessage: 'Sua sessão expirou. Entre novamente.' });
    renderApp();
  }
}

globalThis.addEventListener?.('agroclima:authenticated', (event) => {
  void openWorkspace(event.detail);
});

globalThis.addEventListener?.('agroclima:unauthorized', () => {
  if (!getState().authenticated) return;
  signOut();
  resetState();
  setState({ authMessage: 'Sua sessão expirou ou foi encerrada. Entre novamente.' });
});

subscribe((state, changedKeys) => {
  const has = (key) => changedKeys.includes(key);
  if (has('theme')) applyAppearance(state);
  if (has('authenticated')) {
    if (!state.authenticated) clearHash();
    return renderApp();
  }
  if (!state.authenticated) return has('authMode') || has('authMessage') || has('authBusy') || has('booting') ? renderAuthForm() : undefined;

  if (has('settings') || has('user') || has('role') || has('roleKey') || has('theme')) {
    syncHash(state.page);
    return renderApp();
  }

  if (has('page')) {
    syncHash(state.page);
    updateNavigation(state);
    renderPageContent();
    void refreshPageData(state.page);
  } else if (has('variety')) {
    updateVariety();
  } else if (has('period')) {
    renderPageContent();
    void refreshPageData(state.page);
  }
  if (has('menuOpen')) updateMenu(state);

  const refreshKeys = [
    'pageLoading', 'pageError', 'pageErrors', 'dashboard', 'analystDashboard', 'climate', 'market', 'grapePrices', 'grapeProduction', 'exportValue', 'forecast',
    'comparison', 'quality', 'integrationStatus', 'pythonHealth', 'plantations', 'plantationHistory', 'users', 'rbac', 'auditLogs',
    'settingsSection', 'settingsMessage', 'producerMessage', 'rbacMessage', 'modelMessage', 'designMessage', 'designError',
    'modelStatus', 'agronomy', 'modelBusy', 'modelError', 'modelAlgorithm', 'modelHorizon',
    'logSearch', 'logStatus', 'logResource', 'logSort', 'expandedLogId', 'varieties', 'editingUserId', 'userFormError',
  ];
  if (refreshKeys.some(has)) renderPageContent();
});

bindEvents(root);
renderApp();
void restoreSession();
