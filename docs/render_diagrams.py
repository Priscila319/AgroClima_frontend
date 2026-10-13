#!/usr/bin/env python3
"""Gera os PNGs de arquitetura a partir do código realmente presente no projeto."""
from pathlib import Path
from xml.sax.saxutils import escape
# PNGs are rasterized in a separate one-off step with resvg; this file only creates editable SVG sources.

ROOT = Path(__file__).resolve().parent
W, H = 2480, 1740
GREEN = '#167c55'
FOREST = '#123c2d'
DARK = '#0b3024'
INK = '#192923'
MUTED = '#65766e'
LINE = '#dce7e0'
PALE = '#f1f7f3'
BLUE = '#2879c9'
BLUE_PALE = '#edf4fb'
PURPLE = '#7654b5'
PURPLE_PALE = '#f3effa'
GOLD = '#bd7d13'
GOLD_PALE = '#fff7e6'
RED = '#bd4949'
RED_PALE = '#fff4f3'
WHITE = '#ffffff'


def text(x, y, value, cls='body', fill=None, anchor=None):
    attrs = f'x="{x}" y="{y}" class="{cls}"'
    if fill:
        attrs += f' fill="{fill}"'
    if anchor:
        attrs += f' text-anchor="{anchor}"'
    return f'<text {attrs}>{escape(value)}</text>'


def card(x, y, w, h, title, lines, accent=GREEN, kicker='', fill=WHITE, dashed=False, title_size=None):
    stroke = RED if dashed else LINE
    dash = ' stroke-dasharray="11 9"' if dashed else ''
    result = [f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="20" fill="{fill}" stroke="{stroke}" stroke-width="2"{dash}/>']
    if not dashed:
        result.append(f'<rect x="{x}" y="{y}" width="8" height="{h}" rx="4" fill="{accent}"/>')
    content_x = x + 25
    cursor = y + 37
    if kicker:
        result.append(text(content_x, cursor, kicker.upper(), 'kicker', accent))
        cursor += 34
    if title_size:
        result.append(text(content_x, cursor, title, 'card-title-small', INK))
    else:
        result.append(text(content_x, cursor, title, 'card-title', INK))
    cursor += 35 if title_size else 42
    for line in lines:
        # Newlines are intentional line breaks for legibility at the exported size.
        if isinstance(line, tuple):
            value, cls = line
        else:
            value, cls = line, 'body'
        result.append(text(content_x, cursor, value, cls, MUTED))
        cursor += 25 if cls in ('small', 'tiny') else 29
    return ''.join(result)


def arrow(x1, y1, x2, y2, color=GREEN, dashed=False):
    style = ' stroke-dasharray="8 7"' if dashed else ''
    return f'<path d="M{x1},{y1} L{x2},{y2}" fill="none" stroke="{color}" stroke-width="4" marker-end="url(#arrow)"{style}/>'


def section(x, y, label, subtitle=''):
    out = [text(x, y, label.upper(), 'section')]
    if subtitle:
        out.append(text(x, y + 28, subtitle, 'subtitle-small'))
    return ''.join(out)


def svg_base(title, subtitle):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
<defs>
  <marker id="arrow" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="11" markerHeight="11" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="{GREEN}"/></marker>
  <marker id="arrow-red" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="11" markerHeight="11" orient="auto"><path d="M0 0L10 5L0 10z" fill="{RED}"/></marker>
  <style>
    text {{ font-family: 'DejaVu Sans', Arial, sans-serif; }}
    .title {{ font-size: 43px; font-weight: 700; fill: {DARK}; letter-spacing: -1px; }}
    .subtitle {{ font-size: 22px; fill: {MUTED}; }}
    .subtitle-small {{ font-size: 16px; fill: {MUTED}; }}
    .section {{ font-size: 15px; font-weight: 800; fill: {GREEN}; letter-spacing: 2px; }}
    .kicker {{ font-size: 13px; font-weight: 800; letter-spacing: 1.4px; }}
    .card-title {{ font-size: 21px; font-weight: 700; fill: {INK}; }}
    .card-title-small {{ font-size: 18px; font-weight: 700; fill: {INK}; }}
    .body {{ font-size: 16px; fill: {MUTED}; }}
    .small {{ font-size: 14px; fill: {MUTED}; }}
    .tiny {{ font-size: 12px; fill: {MUTED}; }}
    .flow-label {{ font-size: 15px; font-weight: 700; fill: {GREEN}; }}
    .warning-title {{ font-size: 20px; font-weight: 800; fill: {RED}; }}
    .warning-text {{ font-size: 15px; fill: {INK}; }}
    .foot {{ font-size: 14px; fill: {MUTED}; }}
  </style>
</defs>
<rect width="100%" height="100%" fill="#f5f8f6"/>
<rect x="36" y="35" width="2408" height="1670" rx="30" fill="none" stroke="#e0eae4" stroke-width="2"/>
<text x="78" y="105" class="title">{escape(title)}</text>
<text x="80" y="151" class="subtitle">{escape(subtitle)}</text>
'''


def diagram_security():
    out = [svg_base('Segurança e armazenamento', 'Implementação real: front-end JavaScript, regras no cliente e persistência local — sem backend neste checkout.')]
    out.append('<rect x="58" y="188" width="2364" height="990" rx="25" fill="#ffffff" stroke="#cfe1d6" stroke-width="2"/>')
    out.append(section(82, 230, 'Fluxo real no navegador', 'Os módulos abaixo existem no repositório e são usados pela aplicação.'))

    y, h = 290, 240
    cards = [
        (75, 330, 'Pessoa e sessão', ['Login demonstrativo', 'auth-view.js', 'E-mail define o papel;', 'senha não é validada no servidor.'], BLUE, '01 · entrada', BLUE_PALE),
        (425, 350, 'Views de administração', ['shell-view.js', 'pages/admin-extra.js', 'Telas separadas: RBAC,', 'Segurança e Logs.'], GREEN, '02 · interface', PALE),
        (795, 385, 'Eventos da interface', ['events/index.js', 'data-action / data-form', 'Delegação de cliques e formulários;', 'não é controller HTTP.'], PURPLE, '03 · eventos', PURPLE_PALE),
        (1198, 470, 'Regras locais', ['modules/auth.js → resolveRole()', 'Authentication → Authorization →', 'RBAC → Permission → menu/rota', 'settings.js / audit.js → dados locais'], GOLD, '04 · módulos', GOLD_PALE),
        (1686, 320, 'Repositório local', ['data/local-repository.js', 'Lê e grava objetos JSON', 'com prefixo agroclima:.'], BLUE, '05 · persistência', BLUE_PALE),
        (2024, 370, 'Armazenamento', ['localStorage do navegador', 'por origem e dispositivo;', 'sem banco remoto ou sincronização.'], GREEN, '06 · browser', PALE),
    ]
    for x, w, title, lines, color, kicker, fill in cards:
        out.append(card(x, y, w, h, title, lines, color, kicker, fill))
    for a, b in [(405, 425), (775, 795), (1180, 1198), (1668, 1686), (2006, 2024)]:
        out.append(arrow(a, y + h // 2, b, y + h // 2))

    # State/render cycle under the primary request path.
    out.append(card(445, 590, 510, 155, 'state/store.js', ['Estado em memória: página, tema,', 'formulários e dados já carregados.'], GREEN, 'estado da interface', PALE))
    out.append(card(1010, 590, 510, 155, 'main.js', ['Assina mudanças no estado,', 'atualiza o tema e renderiza views.'], BLUE, 'renderização', BLUE_PALE))
    out.append(card(1575, 590, 500, 155, 'Retorno para as páginas', ['A view atual mostra os dados', 'e as permissões do papel.'], PURPLE, 'interface atualizada', PURPLE_PALE))
    out.append(arrow(990, 530, 700, 590, PURPLE))
    out.append(arrow(955, 657, 1010, 657))
    out.append(arrow(1520, 657, 1575, 657))

    out.append('<rect x="76" y="770" width="2328" height="360" rx="18" fill="#f8fbf9" stroke="#e2ebe5" stroke-width="2"/>')
    out.append(text(102, 810, 'ESTRUTURAS JSON PERSISTIDAS (NÃO SÃO ENTIDADES ORM)', 'section'))
    out.append(card(96, 838, 700, 250, 'Usuários, papéis e permissões', [
        'agroclima:rbac',
        'users[{id, name, email, role, status}]',
        'rolePermissions[role] → permission[]',
        'Roles existentes: Produtor, Analista, Admin.',
    ], GREEN, 'RBAC', WHITE))
    out.append(card(835, 838, 700, 250, 'Preferências da aplicação', [
        'agroclima:settings',
        'general · notifications · appearance',
        'security · tema · região · nome do sistema',
        'Políticas de segurança não são aplicadas',
        'por um provedor externo.',
    ], BLUE, 'configurações', WHITE))
    out.append(card(1574, 838, 800, 250, 'Evento de auditoria', [
        'agroclima:audit-events · máximo 500',
        '{ user, action, resource, occurredAt,',
        '  source, status, details }',
        'Registro local de quem fez o quê, quando',
        'e em qual recurso.',
    ], PURPLE, 'logs', WHITE))
    out.append(text(88, 1155, 'Persistência apenas neste navegador: limpar os dados do site remove esses registros; nenhum usuário/servidor remoto os compartilha.', 'foot'))

    # Requested backend stack is shown as explicitly absent, never connected to the real flow.
    out.append('<rect x="58" y="1205" width="2364" height="455" rx="25" fill="#fff9f8" stroke="#e4b7b3" stroke-width="2"/>')
    out.append(text(82, 1250, 'CAMADAS DE BACKEND SOLICITADAS, MAS NÃO ENCONTRADAS NO REPOSITÓRIO', 'warning-title'))
    out.append(text(82, 1283, 'As caixas tracejadas abaixo são uma lista de ausências — não fazem parte do fluxo implementado e não têm conexão com localStorage.', 'warning-text'))
    absent = [
        (80, 305, 'Autenticação server-side', ['Não existe provedor', 'ou validação de senha.']),
        (400, 305, 'Controller / API', ['Nenhum endpoint HTTP', 'ou controller no projeto.']),
        (720, 305, 'DTOs', ['Sem contratos de', 'request/response.']),
        (1040, 305, 'Service backend', ['As regras atuais rodam', 'no navegador.']),
        (1360, 305, 'Repository', ['Não há camada de', 'persistência server-side.']),
        (1680, 305, 'ORM', ['Não há mapeamento', 'de entidades.']),
        (2000, 305, 'Database', ['Nenhum banco de', 'dados remoto/local.']),
    ]
    for x, w, title, lines in absent:
        out.append(card(x, 1330, w, 230, title, lines, RED, 'não implementado', RED_PALE, dashed=True, title_size=True))
    for a, b in [(385, 400), (705, 720), (1025, 1040), (1345, 1360), (1665, 1680), (1985, 2000)]:
        out.append(f'<path d="M{a},1445 L{b},1445" fill="none" stroke="{RED}" stroke-width="3" stroke-dasharray="7 7" marker-end="url(#arrow-red)"/>')
    out.append(text(80, 1630, 'Conclusão: o RBAC e as políticas nesta entrega são controles de interface para demonstração, não uma fronteira de segurança de produção.', 'foot'))
    out.append('</svg>')
    return ''.join(out)


def diagram_data():
    out = [svg_base('Análise de dados e Dashboard', 'Fluxo real de cadastro, colheita, consulta e visualização no projeto atual — dados climáticos ainda são fixtures.')]
    out.append('<rect x="58" y="188" width="2364" height="990" rx="25" fill="#ffffff" stroke="#cfe1d6" stroke-width="2"/>')
    out.append(section(82, 230, '1 · Cadastro e colheita (gravação)', 'Data de plantio automática no cadastro; a colheita só recebe data quando o produtor confirma.'))
    y, h = 290, 250
    cards = [
        (75, 395, 'Produtor', ['Minhas Plantações', 'views/pages/plantations.js', 'Tipo de uva · quantidade', 'talhão e observações.'], GREEN, 'entrada', PALE),
        (490, 360, 'Eventos da interface', ['events/index.js', 'create-plantation /', 'harvest-plantation', 'Validação do formulário.'], PURPLE, 'data-form / data-action', PURPLE_PALE),
        (870, 440, 'Regras de plantio', ['modules/plantations.js', 'Cadastro: plantedAt = agora;', 'harvestedAt = null; status Em cultivo.', 'Colheita: data agora + status Colhida.'], GOLD, 'serviço local', GOLD_PALE),
        (1330, 390, 'Repositório JSON', ['data/local-repository.js', 'savePlantations()', 'Chave: agroclima:plantations'], BLUE, 'persistência', BLUE_PALE),
        (1740, 650, 'localStorage deste navegador', ['Histórico de plantios mantido localmente.', 'Não há API, ORM ou banco remoto.', 'Ação de cadastro/colheita também', 'gera um evento de auditoria.'], GREEN, 'armazenamento local', PALE),
    ]
    for x, w, title, lines, color, kicker, fill in cards:
        out.append(card(x, y, w, h, title, lines, color, kicker, fill))
    for a, b in [(470, 490), (850, 870), (1310, 1330), (1720, 1740)]:
        out.append(arrow(a, y + h // 2, b, y + h // 2))

    out.append(section(82, 600, '2 · Consulta e apresentação (leitura)', 'Os dados são lidos do mesmo localStorage e encaminhados pelo store às páginas; séries climáticas/mercado são estáticas.'))
    read_y, read_h = 665, 205
    read_cards = [
        (75, 350, 'localStorage', ['agroclima:plantations', 'agroclima:audit-events'], GREEN, 'fonte local', PALE),
        (445, 350, 'Repository + módulos', ['loadPlantations()', 'getPlantations() / getAuditEvents()'], BLUE, 'leitura JSON', BLUE_PALE),
        (815, 350, 'Estado e rotas', ['state/store.js', 'config/routes.js', 'renderPage(state)'], PURPLE, 'store da SPA', PURPLE_PALE),
        (1185, 360, 'Páginas do Produtor', ['Visão geral · plantações', 'histórico · relatório da produção'], GREEN, 'views', PALE),
        (1565, 380, 'Páginas do Analista', ['Dashboard · Histórico', 'Relatórios com séries e consolidação'], GOLD, 'views', GOLD_PALE),
        (1965, 420, 'Componentes visuais', ['charts.js · tables.js', 'SVG / HTML · gráficos, tabelas', 'e indicadores'], BLUE, 'apresentação', BLUE_PALE),
    ]
    for x, w, title, lines, color, kicker, fill in read_cards:
        out.append(card(x, read_y, w, read_h, title, lines, color, kicker, fill))
    for a, b in [(425, 445), (795, 815), (1165, 1185), (1545, 1565), (1945, 1965)]:
        out.append(arrow(a, read_y + read_h // 2, b, read_y + read_h // 2))

    out.append('<rect x="76" y="895" width="2328" height="250" rx="18" fill="#f8fbf9" stroke="#e2ebe5" stroke-width="2"/>')
    out.append(text(102, 930, 'DADOS E EVENTOS UTILIZADOS PELAS TELAS', 'section'))
    out.append(card(96, 950, 700, 185, 'Registro Plantação', [
        '{ id, variety, quantity, field, notes,',
        '  plantedAt, harvestedAt, status, createdBy }',
    ], GREEN, 'estrutura JSON', WHITE, title_size=True))
    out.append(card(835, 950, 700, 185, 'Séries de referência', [
        'js/data/series.js + varieties.js',
        'Temperatura, umidade, preços e scores são',
        'dados demonstrativos já escritos no código.',
    ], BLUE, 'não é ingestão de sensores', WHITE, title_size=True))
    out.append(card(1574, 950, 800, 185, 'Histórico e relatórios', [
        'audit.js registra ações locais de plantio,',
        'colheita, análise e geração CSV; as páginas',
        'montam cronologia, resumo e exportação.',
    ], PURPLE, 'auditoria + análise', WHITE, title_size=True))

    out.append('<rect x="58" y="1205" width="2364" height="455" rx="25" fill="#fff9f8" stroke="#e4b7b3" stroke-width="2"/>')
    out.append(text(82, 1250, 'FLUXO DE BACKEND PEDIDO — NÃO EXISTE NESTE CHECKOUT', 'warning-title'))
    out.append(text(82, 1283, 'O caminho real termina no armazenamento local do browser. Não há camada de integração entre localStorage e um servidor.', 'warning-text'))
    absent = [
        (80, 380, 'Database', ['Não há banco de', 'dados remoto/local.']),
        (480, 360, 'ORM / Repository', ['Não há mapeamento;', 'o repo atual é localStorage.']),
        (860, 345, 'Service backend', ['Regras de plantio', 'rodam no browser.']),
        (1225, 365, 'DTOs', ['Sem payloads ou', 'contratos de API.']),
        (1610, 340, 'API / Controller', ['Não há endpoints', 'para dashboards.']),
        (1970, 380, 'Dashboard / Reports API', ['Clima/mercado não', 'são coletados ao vivo.']),
    ]
    for x, w, title, lines in absent:
        out.append(card(x, 1330, w, 230, title, lines, RED, 'não implementado', RED_PALE, dashed=True, title_size=True))
    for a, b in [(460, 480), (840, 860), (1205, 1225), (1590, 1610), (1950, 1970)]:
        out.append(f'<path d="M{a},1445 L{b},1445" fill="none" stroke="{RED}" stroke-width="3" stroke-dasharray="7 7" marker-end="url(#arrow-red)"/>')
    out.append(text(80, 1630, 'Fluxo implementado: Produtor → Plantação → JSON local → Histórico/Relatório → componentes de dashboard. Nada é sincronizado entre navegadores.', 'foot'))
    out.append('</svg>')
    return ''.join(out)


def render(name, content):
    svg_path = ROOT / f'{name}.svg'
    svg_path.write_text(content, encoding='utf-8')
    print(f'{svg_path}: {svg_path.stat().st_size:,} bytes')


render('diagrama-seguranca-armazenamento', diagram_security())
render('diagrama-analise-dados-dashboard', diagram_data())
