# AgroClima Cloud — desenvolvimento local

Aplicação web com frontend JavaScript, API de domínio Spring Boot, serviço analítico FastAPI e MySQL Server local (administrável pelo MySQL Workbench). O ambiente de desenvolvimento usa **somente serviços locais**: não precisa de domínio, hospedagem, Railway, Render, AWS, Azure, Vercel ou Docker. ThingSpeak é a única integração externa opcional em tempo de execução.

O navegador chama caminhos same-origin (`/api/java` e `/api/python`); o proxy do Vite encaminha as chamadas para as APIs locais. As fontes DM Sans e Manrope são empacotadas no frontend, e os arquivos Swagger UI do Python são servidos pela própria API; a documentação não depende de CDN.

## 1. Pré-requisitos

Instale no computador:

- **JDK 21** e **Maven 3.9+** para a API Java;
- **MySQL Server 8.4+** instalado e em execução local; o MySQL Workbench é opcional para administrar o servidor;
- **Python 3.11+** para a API analítica;
- **Node.js 22+** e npm para o frontend.

Não é necessário instalar ou iniciar Docker. As portas padrão devem estar livres:

| Serviço | Porta padrão | URL local |
|---|---:|---|
| Frontend Vite | 5173 | <http://localhost:5173> |
| API Java / Spring Boot | 8080 | <http://localhost:8080> |
| API Python / FastAPI | 8000 | <http://localhost:8000> |
| MySQL Server | 3306 | `localhost:3306` |

## 2. Criar e configurar o MySQL Server local

Instale e inicie o **MySQL Server 8.4** no computador. O MySQL Workbench é um cliente gráfico para administrar o servidor; instalá-lo sozinho não instala nem inicia o banco. Conecte pelo Workbench a `127.0.0.1:3306` com uma conta administrativa e execute uma vez no SQL Editor:

```sql
CREATE DATABASE agroclima
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;
CREATE USER 'agroclima'@'localhost' IDENTIFIED BY 'SUBSTITUA_POR_UMA_SENHA_LOCAL';
GRANT ALL PRIVILEGES ON agroclima.* TO 'agroclima'@'localhost';
```

Use a mesma senha em `DATABASE_PASSWORD` no `.env` Java. Caso já tenha criado outro schema ou usuário, atualize `DATABASE_URL`, `DATABASE_USER` e `DATABASE_PASSWORD` para corresponderem a eles. Para conexão direta local, o endereço padrão é `jdbc:mysql://localhost:3306/agroclima`.

Ao iniciar a API Java, Flyway aplica as migrations MySQL em `backend/java/src/main/resources/db/migration/`; o Hibernate valida o schema (não o cria automaticamente). Depois do boot, atualize a lista de schemas no Workbench para conferir as tabelas `app_user`, `plantation`, `climate_reading` e demais objetos da aplicação. Os dados existentes em PostgreSQL não são migrados automaticamente: use um schema MySQL novo e planeje qualquer exportação/importação separadamente.

O `docker-compose.yml` oferece, opcionalmente, um MySQL em container e publica sua porta local para conexão pelo Workbench; Docker não é necessário no fluxo direto acima.

## 3. Arquivos `.env`

Os exemplos não contêm credenciais de produção. Copie-os para arquivos locais — esses arquivos são ignorados pelo Git:

```bash
cp .env.example .env
cp backend/java/.env.example backend/java/.env
cp backend/python/.env.example backend/python/.env
```

No Windows, copie os mesmos arquivos pelo Explorer ou PowerShell:

```powershell
Copy-Item .env.example .env
Copy-Item backend/java/.env.example backend/java/.env
Copy-Item backend/python/.env.example backend/python/.env
```

### Java — `backend/java/.env`

Preencha pelo menos:

- `DATABASE_URL`, `DATABASE_USER` e `DATABASE_PASSWORD`: acesso ao MySQL Server local;
- `JWT_SECRET`: segredo aleatório de pelo menos 32 bytes;
- `INITIAL_ADMIN_EMAIL` e `INITIAL_ADMIN_PASSWORD`: conta administrativa inicial;
- `INTERNAL_API_KEY`: chave aleatória com pelo menos 32 caracteres, compartilhada com o Python;
- `PORT` e `SERVER_ADDRESS`: por padrão `8080` e `127.0.0.1`;
- `CORS_ALLOWED_ORIGINS`: lista explícita de origens locais, sem `*`.

Gere valores independentes para `JWT_SECRET` e `INTERNAL_API_KEY` e copie-os para os dois `.env` correspondentes. Para evitar problemas de escaping nos scripts de inicialização, também é prático usar uma senha hexadecimal para o banco e para o Administrador:

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

Execute o comando separadamente para cada segredo; use o valor de `DATABASE_PASSWORD` também ao criar o usuário MySQL no Workbench. A senha administrativa deve ter ao menos 8 caracteres, conter letras e números e respeitar o limite documentado pelo backend.

### Python — `backend/python/.env`

`JAVA_API_URL` deve permanecer como `http://localhost:8080`. Copie para `INTERNAL_API_KEY` **o mesmo valor** usado pela API Java. `CORS_ALLOWED_ORIGINS` permite as origens locais configuradas sem usar wildcard.

ThingSpeak é opcional para iniciar o serviço: deixe `THINGSPEAK_CHANNEL_ID` vazio até ter um canal. Se quiser integrar um canal, veja [ThingSpeak](#8-thingspeak-opcional).

### Frontend — `.env` na raiz

O exemplo da raiz configura a porta Vite e os destinos do proxy local:

```dotenv
VITE_PORT=5173
DEV_JAVA_API_URL=http://localhost:8080
DEV_PYTHON_API_URL=http://localhost:8000
VITE_API_JAVA_BASE=/api/java
VITE_API_PYTHON_BASE=/api/python
```

Esses caminhos relativos preservam same-origin no navegador; o Vite faz o proxy para as APIs locais. Se optar por chamar as APIs diretamente do navegador, altere apenas `VITE_API_JAVA_BASE` para `http://localhost:8080` e `VITE_API_PYTHON_BASE` para `http://localhost:8000`; os serviços já têm CORS local configurável.

## 4. Iniciar a API Java

Com MySQL Server ligado, schema/usuário criados e `backend/java/.env` preenchido, abra um terminal na raiz do projeto:

**Linux/macOS (Bash):**

```bash
bash backend/java/run-local.sh
```

**Windows (PowerShell):**

```powershell
.\backend\java\run-local.ps1
```

Os scripts carregam as variáveis de `backend/java/.env` e executam `mvn spring-boot:run`. Alternativamente, no Bash:

```bash
cd backend/java
set -a
source .env
set +a
mvn spring-boot:run
```

A primeira execução do Maven baixa dependências de build; depois, a API roda localmente. O primeiro boot aplica as migrations e cria a conta administrativa inicial se ela ainda não existir.

- Health: <http://localhost:8080/actuator/health>
- Swagger UI: <http://localhost:8080/swagger-ui.html>
- OpenAPI JSON: <http://localhost:8080/v3/api-docs>

## 5. Iniciar a API Python

Em outro terminal:

**Linux/macOS (Bash):**

```bash
cd backend/python
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

**Windows (PowerShell):**

```powershell
Set-Location backend/python
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

FastAPI lê `backend/python/.env` ao iniciar a partir dessa pasta. Sem `THINGSPEAK_CHANNEL_ID`, a API sobe normalmente, a sincronização em background fica inativa e o health informa que a integração não está configurada.

- Health: <http://localhost:8000/health>
- Swagger UI: <http://localhost:8000/docs>
- OpenAPI JSON: <http://localhost:8000/openapi.json>

## 6. Iniciar o frontend

Em um terceiro terminal na raiz do projeto:

```bash
npm ci
npm run dev
```

Acesse <http://localhost:5173>. As chamadas usam os caminhos `/api/java/...` e `/api/python/...`; o proxy configurado em `vite.config.js` encaminha-os a `localhost:8080` e `localhost:8000`. Nenhum domínio de produção é consultado.

O projeto também pode ser compilado para arquivos estáticos com `npm run build`. A configuração de Nginx e Docker Compose permanece opcional e não é usada pelos comandos locais acima.

## 7. Verificar APIs, comunicação e autenticação

### Health e documentação

```bash
curl -i http://localhost:8080/actuator/health
curl -i http://localhost:8000/health
curl -i http://localhost:5173/
```

Abra também as documentações Swagger indicadas acima. O frontend deve responder em `localhost:5173` mesmo que uma API esteja parada; as operações que dependem dela mostrarão erro de conexão.

### Testar autenticação

Use o e-mail e a senha definidos em `backend/java/.env` para a conta administrativa inicial:

```bash
curl -sS -X POST http://localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@agroclima.com","password":"SENHA_CONFIGURADA_NO_ENV"}'
```

A resposta inclui `accessToken`. Use-o em operações protegidas:

```bash
curl -i http://localhost:8080/api/auth/me \
  -H 'Authorization: Bearer COLE_O_ACCESS_TOKEN_AQUI'
```

Sem token, `/api/auth/me` e os recursos protegidos devem responder `401`. As permissões e o escopo de produtor são verificados pelo backend; a interface não substitui essas verificações. Também é possível criar uma conta Produtor pela tela de cadastro do frontend ou por `POST /api/auth/register`.

### Testar o proxy frontend → APIs

Com os três serviços em execução, abra <http://localhost:5173>, entre com a conta criada e navegue pelas páginas de dados. No painel Network do navegador, as requisições devem começar por `/api/java/` ou `/api/python/`, no mesmo host do frontend. Também se pode confirmar o health Python pelo proxy:

```bash
curl -i http://localhost:5173/api/python/health
```

### Testar CORS

O CORS é restrito a origens locais explícitas (`localhost` e `127.0.0.1` nas portas usadas com Vite, Live Server e alternativas documentadas); não há `allow all`. O frontend Vite usa proxy same-origin e normalmente não precisa de CORS. Para conferir o preflight quando usar as bases diretas:

```bash
curl -i -X OPTIONS http://localhost:8080/api/auth/login \
  -H 'Origin: http://localhost:5173' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: content-type'
```

A resposta deve incluir `Access-Control-Allow-Origin: http://localhost:5173`. O mesmo teste pode ser feito para a API Python em `http://localhost:8000/api/v1/dashboard/summary`.

## 8. ThingSpeak (opcional)

ThingSpeak é a única dependência externa de runtime e só é utilizada se um canal estiver configurado. No arquivo `backend/python/.env`, defina:

```dotenv
THINGSPEAK_CHANNEL_ID=ID_NUMERICO_DO_CANAL
THINGSPEAK_READ_API_KEY=CHAVE_DE_LEITURA_SE_O_CANAL_FOR_PRIVADO
THINGSPEAK_URL=https://api.thingspeak.com
THINGSPEAK_FIELD_MAP={"temperature":"field1","humidity":"field2","rainfall":"field3","luminosity":"field4","soilHumidity":"field5"}
```

Ajuste o mapa conforme os campos reais do canal e reinicie o serviço Python. A sincronização automática roda no intervalo `THINGSPEAK_POLL_INTERVAL_SECONDS`; também é possível solicitar sincronização manual autenticado como Administrador em `POST http://localhost:8000/api/v1/integrations/thingspeak/sync`. A API Python normaliza as leituras e envia os dados à API Java pela rota interna protegida por `INTERNAL_API_KEY`; não acessa o MySQL diretamente.

Verifique `/health` para `thingspeakConfigured` e, autenticado como Administrador, consulte `/api/v1/integrations/thingspeak/status`. Sem canal/chave, o backend local continua iniciando; as rotas que precisam de leituras retornam o estado de indisponibilidade correspondente.

## 9. Testes

```bash
# Frontend
npm ci
npm run build

# API Python
cd backend/python
python -m pip install -r requirements.txt
python -m pytest -q tests

# API Java: requer JDK 21 e Maven 3.9+
cd ../java
mvn test
```

A suíte de persistência Java usa Testcontainers com MySQL e é marcada para ser ignorada quando Docker não está disponível; os testes unitários podem ser executados sem Docker. Para validar as migrations e a persistência no fluxo sem Docker, mantenha o MySQL Server local ativo e faça o boot da API Java; o Hibernate valida o schema ao iniciar.

## 10. Variáveis e dependências externas

- Portas padrão: frontend `5173`, Java `8080`, Python `8000`, MySQL Server `3306`.
- Segredos necessários: `JWT_SECRET`, `INITIAL_ADMIN_PASSWORD` e `INTERNAL_API_KEY`; além da senha do usuário local do MySQL. Mantenha os `.env` reais fora do Git.
- Python e Java comunicam-se por `localhost`; o navegador usa same-origin pelo proxy Vite, com bases diretas configuráveis por `VITE_API_JAVA_BASE` e `VITE_API_PYTHON_BASE`.
- ThingSpeak (`https://api.thingspeak.com`) é opcional e externo. Não há dependência de backend hospedado ou domínio.
- npm, PyPI e Maven podem ser acessados para baixar dependências durante a instalação inicial; não são chamadas de runtime da aplicação.
- Fontes tipográficas são instaladas por npm e servidas localmente pelo frontend.

## 11. Problemas comuns

- **`Connection refused` na porta 3306:** inicie o MySQL Server local e confirme `DATABASE_URL`, usuário e senha.
- **Falha de conexão Python → Java:** confirme que a API Java responde em `http://localhost:8080`, que `JAVA_API_URL` está assim no `.env` Python e que a chave interna é idêntica nos dois serviços.
- **JWT ou administrador não configurado:** preencha `JWT_SECRET` e `INITIAL_ADMIN_PASSWORD` no `.env` Java antes do primeiro boot; a senha deve cumprir a política do sistema.
- **`Address already in use`:** libere a porta ou ajuste `PORT`, `VITE_PORT` e os destinos `DEV_*_API_URL`/bases da API correspondentes.
- **Erro de CORS usando chamada direta:** acrescente a origem exata (incluindo porta) a `CORS_ALLOWED_ORIGINS` nos dois serviços e reinicie-os. Não use `*` em substituição à lista.
- **ThingSpeak indisponível:** confirme canal, chave de leitura, `THINGSPEAK_FIELD_MAP` e acesso à Internet; isso não impede o boot das APIs.
- **Tela carrega, mas login falha:** confirme que o MySQL Server, Java e Python foram iniciados; consulte os logs do backend e teste `/actuator/health` e `/health`.
