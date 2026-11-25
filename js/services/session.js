const SESSION_KEY = 'agroclima.session.v1';

function sessionStorageSafe() {
  try {
    return globalThis.sessionStorage;
  } catch {
    return undefined;
  }
}

export function getAccessToken() {
  try {
    const saved = sessionStorageSafe()?.getItem(SESSION_KEY);
    if (!saved) return null;
    const session = JSON.parse(saved);
    if (!session?.accessToken || (session.expiresAt && Date.parse(session.expiresAt) <= Date.now())) {
      clearSession();
      return null;
    }
    return session.accessToken;
  } catch {
    return null;
  }
}

export function saveSession({ accessToken, expiresAt }) {
  if (!accessToken) throw new Error('A API não retornou um token de acesso.');
  const storage = sessionStorageSafe();
  if (!storage) throw new Error('O armazenamento temporário desta aba está indisponível.');
  storage.setItem(SESSION_KEY, JSON.stringify({ accessToken, expiresAt: expiresAt || null }));
}

export function clearSession() {
  try {
    sessionStorageSafe()?.removeItem(SESSION_KEY);
  } catch {
    // A sessão em memória da aplicação será encerrada mesmo se o storage falhar.
  }
}
