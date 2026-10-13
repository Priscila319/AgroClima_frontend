/** Perfis de acesso, navegação por perfil e dados de conta de demonstração. */

export const ROLES = Object.freeze({
  PRODUCER: 'Produtor/Exportador',
  ANALYST: 'Analista de Dados',
  ADMIN: 'Administrador',
});

export const NAVIGATION = {
  [ROLES.PRODUCER]: [
    { label: 'Visão Geral', icon: 'grid' },
    { label: 'Minhas Plantações', icon: 'leaf' },
    { label: 'Monitoramento', icon: 'cloud' },
    { label: 'Previsões', icon: 'trend' },
    { label: 'Mercado e Exportação', icon: 'market' },
    { label: 'Comparação', icon: 'compare' },
    { label: 'Alertas', icon: 'bell' },
    { label: 'Histórico', icon: 'clock' },
    { label: 'Relatórios', icon: 'report' },
  ],
  [ROLES.ANALYST]: [
    { label: 'Dashboard Analítico', icon: 'grid' },
    { label: 'Dados Climáticos', icon: 'cloud' },
    { label: 'Dados de Mercado', icon: 'market' },
    { label: 'Análise Comparativa', icon: 'compare' },
    { label: 'Qualidade dos Dados', icon: 'quality' },
    { label: 'Modelos Preditivos', icon: 'model' },
    { label: 'Previsões', icon: 'trend' },
    { label: 'Histórico', icon: 'clock' },
    { label: 'Relatórios', icon: 'report' },
  ],
  [ROLES.ADMIN]: [
    { label: 'Dashboard Admin', icon: 'grid' },
    { label: 'Usuários', icon: 'users' },
    { label: 'Permissões e RBAC', icon: 'lock' },
    { label: 'Segurança', icon: 'shield' },
    { label: 'Logs do Sistema', icon: 'logs' },
    { label: 'Integrações', icon: 'link' },
    { label: 'Configurações', icon: 'settings' },
    { label: 'Design System', icon: 'quality' },
  ],
};

export const ACCOUNTS = {
  [ROLES.ADMIN]: { name: 'Carlos Almeida', initials: 'CA', badge: 'AD', scope: 'administrativo' },
  [ROLES.ANALYST]: { name: 'Rafael Nunes', initials: 'RN', badge: 'AN', scope: 'analítico' },
  [ROLES.PRODUCER]: { name: 'Mariana Costa', initials: 'MC', badge: 'PE', scope: 'produtor' },
};

export const DEMO_ACCESSES = [
  { label: 'Produtor', email: 'produtor@agroclima.com' },
  { label: 'Analista', email: 'analista@agroclima.com' },
  { label: 'Administrador', email: 'admin@agroclima.com' },
];
