import { html, trusted } from '../utils/html.js';

/** Conteúdo SVG de cada ícone (conjunto fixo, estático e confiável). */
const ICON_PATHS = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  cloud: '<path d="M17.5 19H6.2a4.2 4.2 0 0 1-.7-8.3A6.5 6.5 0 0 1 18 9.5a4.8 4.8 0 0 1-.5 9.5Z"/>',
  trend: '<path d="m3 17 6-6 4 4 8-9"/><path d="M15 6h6v6"/>',
  market: '<path d="M4 10h16v10H4z"/><path d="M2 10 5 4h14l3 6M8 20v-6h4v6"/>',
  compare: '<path d="M8 3 4 7l4 4M4 7h13a3 3 0 0 1 3 3v1M16 21l4-4-4-4m4 4H7a3 3 0 0 1-3-3v-1"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  report: '<path d="M5 3h11l3 3v15H5z"/><path d="M15 3v4h4M8 12h8M8 16h6M8 8h3"/>',
  database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7"/>',
  quality: '<path d="m12 3 2.2 4.5 5 .7-3.6 3.5.9 5-4.5-2.3-4.5 2.3.9-5-3.6-3.5 5-.7z"/><path d="m9.5 11.5 1.5 1.5 3.5-4"/>',
  model: '<circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><path d="m8 7 3 9m5-9-3 9M8 6h8"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6m3-3h-6"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
  logs: '<path d="M5 4h14v16H5zM9 4V2h6v2M8 9h8M8 13h8M8 17h5"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1-1"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a2 2 0 0 0 .4 2.2l.1.1-2.6 2.6-.1-.1a2 2 0 0 0-2.2-.4 2 2 0 0 0-1.2 1.8V21h-3.6v-.2A2 2 0 0 0 9 19a2 2 0 0 0-2.2.4l-.1.1-2.6-2.6.1-.1A2 2 0 0 0 4.6 15a2 2 0 0 0-1.8-1.2H3v-3.6h.2A2 2 0 0 0 5 9a2 2 0 0 0-.4-2.2l-.1-.1 2.6-2.6.1.1A2 2 0 0 0 9 4.6a2 2 0 0 0 1.2-1.8V3h3.6v.2A2 2 0 0 0 15 5a2 2 0 0 0 2.2-.4l.1-.1 2.6 2.6-.1.1a2 2 0 0 0-.4 1.8 2 2 0 0 0 1.8 1.2h.2v3.6h-.2A2 2 0 0 0 19.4 15Z"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9a2.5 2.5 0 1 1 3.6 2.3c-.8.4-1.2.8-1.2 1.7M12 17h.01"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  thermo: '<path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0Z"/><path d="M12 9v7"/>',
  drop: '<path d="M12 2S5 10 5 15a7 7 0 0 0 14 0c0-5-7-13-7-13Z"/>',
  leaf: '<path d="M20 4S9 3 5 9c-3 5 1 10 5 10 7 0 10-15 10-15Z"/><path d="M4 21c3-7 8-10 14-14"/>',
  truck: '<path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z"/><circle cx="7" cy="19" r="2"/><circle cx="18" cy="19" r="2"/>',
  warning: '<path d="m12 3 10 18H2z"/><path d="M12 9v5M12 18h.01"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  logout: '<path d="M10 5H4v14h6M14 8l4 4-4 4M18 12H9"/>',
  download: '<path d="M12 3v12m-4-4 4 4 4-4M4 19h16"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/>',
  moon: '<path d="M20.9 13A8.5 8.5 0 0 1 11 3.1 8.7 8.7 0 1 0 20.9 13Z"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  server: '<rect x="3" y="4" width="18" height="6" rx="2"/><rect x="3" y="14" width="18" height="6" rx="2"/><path d="M7 7h.01M7 17h.01M11 7h6M11 17h6"/>',
  wifi: '<path d="M3 8a14 14 0 0 1 18 0M6 12a9 9 0 0 1 12 0M9.5 16a4 4 0 0 1 5 0"/><circle cx="12" cy="20" r=".5"/>',
  activity: '<path d="M3 12h4l2-7 4 14 2-7h6"/>',
};

export function icon(name, size = 20) {
  const content = ICON_PATHS[name];
  if (!content) throw new Error(`Ícone desconhecido: ${name}`);
  return html`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${trusted(content)}</svg>`;
}
