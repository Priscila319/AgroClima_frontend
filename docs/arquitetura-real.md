# Arquitetura local implementada — AgroClima Cloud

## Componentes e portas

| Componente | Tecnologia | Porta local | Responsabilidade |
| --- | --- | ---: | --- |
| Frontend | HTML/CSS/JavaScript + Vite | 5173 | SPA; proxy de desenvolvimento para as APIs. |
| API de domínio | Spring Boot, Spring Security, JWT, JPA/Hibernate e Flyway | 8080 | Usuários, RBAC, plantações, variedades, configurações, auditoria e persistência. |
| Banco local | MySQL Server 8.4 (InnoDB) | 3306 | Persistência relacional gerenciada pela API Java; MySQL Workbench pode administrar o servidor. |
| API analítica | FastAPI, Pydantic e Pandas | 8000 | Leitura, normalização, qualidade, métricas climáticas e dashboards. |
| Fonte climática opcional | ThingSpeak | Externa, configurável | Origem de leituras; não é necessária para iniciar os serviços locais. |

## Fluxo de comunicação local

```text
Browser — http://localhost:5173
   │  /api/java/* e /api/python/* (same-origin)
   ▼
Vite dev proxy
   ├── /api/java/*   ──► http://localhost:8080/* ──► MySQL Server localhost:3306
   └── /api/python/* ──► http://localhost:8000/*
                              │
                              ├── Bearer JWT encaminhado à API Java
                              ├── X-Internal-Api-Key para ingestão serviço-a-serviço
                              ├── leituras via API Java; sem acesso direto ao MySQL
                              └── ThingSpeak pela Internet, somente se configurado
```

No frontend, `js/config/api.js` centraliza os caminhos base. Por padrão usa `/api/java` e `/api/python`; `vite.config.js` encaminha os caminhos a destinos configuráveis por `DEV_JAVA_API_URL` e `DEV_PYTHON_API_URL`, com fallback para `localhost:8080` e `localhost:8000`. Para acesso direto às APIs, `VITE_API_JAVA_BASE` e `VITE_API_PYTHON_BASE` permitem configurar as bases HTTP no frontend.

O navegador não chama URLs de produção. O Vite é apenas proxy local; não é necessário domínio, hospedagem ou servidor externo. Google Fonts foi substituído por pacotes tipográficos locais do npm e o Swagger UI da API Python é servido pelos assets do pacote local `swagger-ui-bundle`, sem CDN. npm, PyPI e Maven são usados somente para instalar dependências durante o setup.

## APIs usadas pelo frontend

### Java — `localhost:8080`

- `POST /api/auth/login`, `POST /api/auth/register`, `GET /api/auth/me`;
- `GET /api/plantations`, `GET /api/plantations/history`, `POST/PATCH/DELETE /api/plantations/**`, `POST /api/plantations/{id}/harvest`;
- `GET /api/varieties`;
- `GET/POST/PATCH /api/users/**`, `GET /api/roles`, `GET /api/permissions`, `PATCH /api/roles/{key}/permissions`;
- `GET/POST /api/audit-events`, `GET/PATCH /api/settings`;
- `GET /api/climate/readings` e rotas internas de ingestão protegidas por chave de serviço.

JWT, permissões RBAC e escopo por produtor são aplicados na API Java, não apenas na interface.

### Python — `localhost:8000`

- `GET /health`;
- `GET /api/v1/climate/current` e `/api/v1/climate/history`;
- dashboards `/api/v1/dashboard/summary`, `/producer`, `/analyst`, `/quality`, `/comparison`, `/market` e `/forecast`;
- estado/sincronização ThingSpeak em `/api/v1/integrations/thingspeak/**`.

Para endpoints protegidos, Python valida o Bearer Token consultando `/api/auth/me` na API Java e encaminha o token para as leituras autorizadas. Python não abre conexão ao banco Java.

## Configuração local e segurança

- `backend/java/.env.example` documenta a conexão ao MySQL Server, porta/endereço da API, segredo JWT, administrador inicial, chave interna e CORS. A API usa JPA/Hibernate e Flyway; o driver JDBC é o MySQL Connector/J.
- `backend/python/.env.example` documenta `JAVA_API_URL=http://localhost:8080`, a mesma chave interna, CORS e ThingSpeak opcional. Python não recebe URL, usuário nem senha do banco.
- `.env.example` da raiz documenta a porta e o proxy Vite; também contém variáveis usadas apenas se alguém escolher o Compose opcional.
- `.env` reais são ignorados pelo Git. JWT e chave interna precisam ser independentes, aleatórios e ter pelo menos 32 bytes.
- CORS aceita origens locais explícitas (`localhost` e `127.0.0.1` nas portas documentadas), sem `*`. Pelo proxy Vite, navegador e endpoint são same-origin e não dependem de CORS.
- A API Java, em execução direta, usa `SERVER_ADDRESS=127.0.0.1`. O MySQL Server local deve aceitar conexões na porta padrão 3306.
- O MySQL Workbench é cliente gráfico, não substitui a instalação e inicialização do MySQL Server. Use-o para criar o schema/usuário local e inspecionar as tabelas após a migration Flyway.
- O serviço Python só inicia a sincronização em background se `THINGSPEAK_CHANNEL_ID` estiver definido. Canal e chave de leitura são opcionais para o boot local.

## Início e verificação

O desenvolvimento local não usa Docker:

1. Inicie MySQL Server local, crie o schema/usuário pelo Workbench ou cliente SQL e configure `backend/java/.env`;
2. execute `bash backend/java/run-local.sh` (ou `backend/java/run-local.ps1` no PowerShell); Flyway cria as tabelas e Hibernate valida o schema;
3. em outro terminal, crie o ambiente virtual Python, instale `backend/python/requirements.txt` e execute `uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload` a partir de `backend/python`;
4. na raiz, execute `npm ci` e `npm run dev`;
5. acesse `http://localhost:5173`.

Health Java: `/actuator/health`; Swagger Java: `/swagger-ui.html`; health Python: `/health`; Swagger Python: `/docs`. Atualize os schemas no Workbench após o primeiro boot Java para consultar as tabelas. PostgreSQL pré-existente não é convertido automaticamente para MySQL.

O `docker-compose.yml`, `frontend.Dockerfile` e `nginx.conf` são alternativas opcionais para outros fluxos; não fazem parte dos comandos nem dos requisitos de execução local acima.

> **Nota sobre diagramas:** `diagrama-seguranca-armazenamento.*` e `diagrama-analise-dados-dashboard.*` foram gerados antes da inclusão das APIs. São registros históricos da auditoria inicial e não representam a arquitetura atual; este documento e o README da raiz são as referências vigentes.
