import { html } from '../utils/html.js';
import { ACCOUNTS, NAVIGATION } from '../config/roles.js';
import { renderPage } from '../config/routes.js';
import { canAccessPage } from '../modules/access-control.js';
import { icon } from '../components/icons.js';
import { logo } from '../components/ui.js';

function navigationItems(role, activePage) {
  return (NAVIGATION[role] || []).filter((item) => canAccessPage(role, item.label)).map((item) => {
    const isActive = item.label === activePage;
    return html`<button type="button" class="${isActive ? 'active' : ''}"${isActive ? html` aria-current="page"` : ''} data-action="navigate" data-page="${item.label}">${icon(item.icon)}<span>${item.label}</span></button>`;
  });
}

function sidebar(state) {
  const account = ACCOUNTS[state.role] || ACCOUNTS['Produtor/Exportador'];
  const systemName = state.settings?.general?.systemName || 'AgroClima Cloud';
  const apiReady = !state.dataErrors?.length;
  return html`<div class="sidebar-overlay ${state.menuOpen ? 'show' : ''}" data-action="close-menu"></div><aside class="sidebar ${state.menuOpen ? 'open' : ''}" aria-label="Menu lateral"><div class="sidebar-top">${logo({ light: true, name: systemName })}<button type="button" class="mobile-close" data-action="close-menu" aria-label="Fechar menu">${icon('close')}</button></div><div class="role-pill"><span>${account.badge}</span><div><small>Perfil</small><strong>${state.role}</strong></div></div><nav aria-label="Navegação principal"><span class="nav-label">Navegação</span>${navigationItems(state.role, state.page)}</nav><div class="sidebar-bottom"><button type="button">${icon('help')}<span>Central de ajuda</span></button><div class="system-mini"><span><i class="${apiReady ? '' : 'offline'}"></i>${apiReady ? 'Serviços AgroClima' : 'Serviço indisponível'}</span><small>Dados persistidos nas APIs</small></div></div></aside>`;
}

function topbar(state) {
  const account = ACCOUNTS[state.role] || ACCOUNTS['Produtor/Exportador'];
  const displayName = state.user?.name || state.user?.email || 'Usuário';
  const initials = displayName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  const region = state.settings?.general?.region || 'Petrolina / Juazeiro';
  const showNotifications = state.settings?.notifications?.climateAlerts || state.settings?.notifications?.systemAlerts;
  const apiOk = !state.pageError && !state.dataErrors?.length;
  const time = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date());
  return html`<header class="topbar"><button type="button" class="menu-btn" data-action="open-menu" aria-label="Abrir menu">${icon('menu')}</button><div class="topbar-status"><span><i class="${apiOk ? '' : 'offline'}"></i>${apiOk ? 'APIs AgroClima' : 'API indisponível'}</span><small>${region} · ${time}</small></div><div class="topbar-actions"><button type="button" class="icon-btn" aria-label="Buscar">${icon('search')}</button><button type="button" class="icon-btn theme-toggle" data-action="toggle-theme" aria-label="Ativar tema ${state.theme === 'dark' ? 'claro' : 'escuro'}" aria-pressed="${state.theme === 'dark'}" title="Ativar tema ${state.theme === 'dark' ? 'claro' : 'escuro'}">${icon(state.theme === 'dark' ? 'sun' : 'moon')}</button><button type="button" class="icon-btn notification" aria-label="Notificações">${icon('bell')}${showNotifications && html`<i></i>`}</button><div class="access-scope">${icon('lock', 15)}<span>${state.user?.role || account.scope}</span></div><div class="profile"><span>${initials}</span><div><strong>${displayName}</strong><small>${state.role}</small></div></div><button type="button" class="icon-btn" data-action="logout" title="Sair" aria-label="Sair">${icon('logout')}</button></div></header>`;
}

function footer(state) {
  const systemName = state.settings?.general?.systemName || 'AgroClima Cloud';
  const institutionalInfo = state.settings?.general?.institutionalInfo || 'Projeto Integrador ADS';
  return html`<footer class="app-footer"><span>${systemName} · ${institutionalInfo}</span><span>Dados fornecidos pelas APIs AgroClima</span></footer>`;
}

export function pageContent(state) {
  return html`<div class="page-content">${state.pageLoading && html`<div class="api-notice loading" role="status">Atualizando dados do serviço…</div>`}${state.pageError && html`<div class="api-notice error" role="alert">${state.pageError}</div>`}${renderPage(state)}</div>`;
}

export function shellView(state) {
  return html`<div class="app-shell">${sidebar(state)}<main>${topbar(state)}${pageContent(state)}${footer(state)}</main></div>`;
}
