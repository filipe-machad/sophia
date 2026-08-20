# Sophia

Aplicação para organização administrativa de consultórios de psicologia: clientes, agenda mensal, faltas, reagendamentos e controle financeiro por sessão.

## Instalação e execução local

### Pré-requisitos

- Git
- Node.js 22 ou superior
- Docker Desktop ou Docker Engine

O projeto pode ser executado no macOS, Linux ou Windows. WSL não é obrigatório.

### 1. Clonar o projeto e iniciar o banco

```bash
git clone https://github.com/filipe-machad/sophia.git
cd sophia
docker compose up -d postgres
```

### 2. Iniciar a API

Em um terminal, a partir da raiz do projeto:

```bash
cd apps/api
cp .env.example .env
npm ci
npm run db:migrate
npm run dev
```

No Windows PowerShell, substitua o comando `cp` por:

```powershell
Copy-Item .env.example .env
```

A API estará disponível em `http://localhost:3333`. Para verificar:

```bash
curl http://localhost:3333/health
```

### 3. Iniciar o frontend

Em outro terminal, a partir da raiz do projeto:

```bash
npm ci
npm run dev
```

Abra `http://localhost:3000` no navegador. No primeiro acesso, crie a conta do psicólogo.

### Encerrar

Interrompa a API e o frontend com `Ctrl+C`. Para parar o banco preservando os dados:

```bash
docker compose stop
```

## Estrutura

- Frontend: React/Vinext em `app/`, executado em `http://localhost:3000`.
- API: Node.js + Fastify em `apps/api/`, executada em `http://localhost:3333`.
- Banco: PostgreSQL 17 em Docker, exposto localmente na porta `5433`.
- Persistência: Drizzle ORM com migrações versionadas em `apps/api/drizzle/`.
- Áreas atuais: dashboard, clientes, agenda editável e financeiro mensal.

## Validação

```bash
cd apps/api && npm test && npm run build
cd apps/api && npm run test:isolation # requer API e banco locais ativos
cd ../.. && npm run build
```

O primeiro acesso cria uma conta real. O modo de demonstração usa apenas dados fictícios. Informações clínicas não fazem parte do esquema atual.

## Estudo

- [Guia completo do backend](docs/backend-study-guide.md): do entry point Node.js às transações e consultas no PostgreSQL.
