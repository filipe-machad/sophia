# Sophia

Aplicação para organização administrativa de consultórios de psicologia: clientes, sessões, faltas e pagamentos por sessão.

## Estrutura

- Frontend: React/Vinext em `app/`, executado em `http://localhost:3000`.
- API: Node.js + Fastify em `apps/api/`, executada em `http://localhost:3333`.
- Banco: PostgreSQL 17 em Docker, exposto localmente na porta `5433`.
- Persistência: Drizzle ORM com migrações versionadas em `apps/api/drizzle/`.

## Desenvolvimento local

```bash
docker compose up -d postgres

cd apps/api
cp .env.example .env
npm install
npm run db:migrate
npm run dev

# em outro terminal, na raiz
npm install
npm run dev
```

## Validação

```bash
cd apps/api && npm test && npm run build
cd apps/api && npm run test:isolation # requer API e banco locais ativos
cd ../.. && npm run build
```

O primeiro acesso cria uma conta real. O modo de demonstração usa apenas dados fictícios. Informações clínicas não fazem parte do esquema atual.
