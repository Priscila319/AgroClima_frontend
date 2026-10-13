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
import { renderPage } from './config/routes.js';
import { NAVIGATION } from './config/roles.js';
import { canAccessPage, DEFAULT_RBAC, setRbacSnapshot } from './modules/access-control.js';
import { getCurrentUser, hasSession, signOut } from './modules/auth.js';
import { getSettings } from './modules/settings.js';
import { getState, resetState, setState, subscribe } from './state/store.js';
import { authFormContent, authView } from './views/auth-view.js';
import { pageContent, shellView } from './views/shell-view.js';
import { loadPageData, loadWorkspaceData, normalizeUser, roleLabel } from './services/workspace.js';
import { mount, queryRequired, replaceElement } from './utils/dom.js';

const root = queryRequired('#root');

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.style.colorScheme = theme === 'dark' ? 'dark' : 'light';
}

function renderApp() {
  const state = getState();
  applyTheme(state.theme);
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

function roleKeyFromUser(user) {
  return String(user?.roleKey || 'PRODUCER').toUpperCase();
}

function firstPageFor(role) {
  return NAVIGATION[role]?.find((item) => canAccessPage(role, item.label))?.label || NAVIGATION[role]?.[0]?.label || null;
}

async function refreshPageData(page = getState().page) {
  const state = getState();
  if (!state.authenticated || !page) return;
  setState({ pageLoading: true, pageError: '' });
  try {
    const result = await loadPageData(page, state.roleKey);
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
  setRbacSnapshot(DEFAULT_RBAC);
  const page = firstPageFor(role);
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

  const workspace = await loadWorkspaceData(user);
  if (!getState().authenticated) return;
  const allowedPage = canAccessPage(role, page) ? page : firstPageFor(role);
  const settings = getSettings(workspace.settings || {});
  setState({
    ...workspace,
    page: allowedPage,
    settings,
    theme: settings.appearance.theme,
    variety: settings.general.defaultVariety || getState().variety,
    users: workspace.users || [],
    auditLogs: workspace.auditLogs || [],
    plantations: workspace.plantations || [],
    varieties: workspace.varieties || [],
    dataErrors: workspace.dataErrors || [],
  });
  await refreshPageData(allowedPage);
}

async function restoreSession() {
  if (!hasSession()) return;
  setState({ booting: true });
  renderApp();
  try {
    const user = await getCurrentUser();
    if (user) await openWorkspace(user);
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
  if (has('theme')) applyTheme(state.theme);
  if (has('authenticated')) return renderApp();
  if (!state.authenticated) return has('authMode') || has('authMessage') || has('authBusy') || has('booting') ? renderAuthForm() : undefined;

  if (has('settings') || has('user') || has('role') || has('roleKey')) return renderApp();

  if (has('page')) {
    updateNavigation(state);
    renderPageContent();
    void refreshPageData(state.page);
  } else if (has('variety')) {
    updateVariety();
  }
  if (has('menuOpen')) updateMenu(state);

  const page = state.page;
  const refreshKeys = [
    'pageLoading', 'pageError', 'pageErrors', 'dashboard', 'analystDashboard', 'climate', 'market', 'forecast',
    'comparison', 'quality', 'integrationStatus', 'pythonHealth', 'plantations', 'plantationHistory', 'users', 'rbac', 'auditLogs',
    'settingsSection', 'settingsMessage', 'producerMessage', 'rbacMessage', 'modelMessage', 'designMessage',
    'logSearch', 'logStatus', 'logResource', 'logSort', 'expandedLogId', 'varieties',
  ];
  if (refreshKeys.some(has)) renderPageContent();
});

bindEvents(root);
renderApp();
void restoreSession();
