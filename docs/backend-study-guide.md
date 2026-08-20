# Guia de estudo do backend da Sophia

Este guia percorre o backend atual desde o processo Node.js até a leitura e a escrita no PostgreSQL. Ele separa boas decisões, dívidas aceitáveis de MVP e melhorias para produção.

## Como estudar amanhã

Reserve cerca de duas horas:

1. Leia o mapa e acompanhe uma requisição completa.
2. Abra cada arquivo citado e encontre o trecho descrito.
3. Responda às perguntas de revisão sem consultar o texto.
4. Faça os exercícios em uma branch separada.

Pergunta central: esta decisão pertence ao HTTP, à autenticação, à regra de negócio ou à persistência?

## 1. Mapa mental

```text
Navegador
  │ HTTP + cookie
  ▼
Frontend React/Vite :3000
  │ fetch + cookie
  ▼
API Node.js/Fastify :3333
  │ SQL parametrizado
  ▼
PostgreSQL :5433 no ambiente local
```

Node.js é o runtime; TypeScript verifica tipos no desenvolvimento; Fastify atende HTTP; Zod valida em runtime; Drizzle constrói SQL tipado; postgres.js mantém o pool; PostgreSQL é a fonte de verdade; Vitest testa regras; Docker Compose reproduz o banco local.

Não usamos NestJS. Para o tamanho atual, Fastify direto deixa o fluxo visível. Nest passa a ajudar quando equipe e sistema maiores precisam de convenções rígidas, muitos módulos e injeção de dependências; não é requisito para uma boa API Node.js.

## 2. Primeiro entry point

O script `dev` de `apps/api/package.json` executa `tsx watch src/server.ts`. Em produção, `npm run build` chama TypeScript e `npm start` executa `node dist/server.js`.

`apps/api/src/server.ts` carrega o ambiente, importa configuração e banco, chama `buildApp()`, registra encerramento para SIGINT/SIGTERM e abre a porta. Ao terminar, fecha Fastify e pool do PostgreSQL.

Separar `server.ts` de `buildApp()` permite testar sem porta real. Entry point pequeno e shutdown gracioso são boas práticas.

## 3. Configuração

`apps/api/src/config.ts` lê `process.env` e usa Zod para validar ambiente, porta, host, origem, URL do banco e duração da sessão. A aplicação falha cedo se algo estiver inválido.

Em produção, também convém validar proxies confiáveis, TLS, tamanho do pool e lista de origens.

## 4. Banco e ORM

`apps/api/src/db/client.ts` cria o cliente `postgres.js` e o fornece ao Drizzle:

```text
Rota → Drizzle constrói SQL → postgres.js envia → PostgreSQL executa
```

O pool aceita até dez conexões, ou uma em teste, e tem timeouts. `prepare: false` ajuda com certos poolers.

Drizzle não elimina SQL: performance ainda exige entender joins, índices, transações e planos. Em produção, limite do pool, quantidade de instâncias e limite do banco precisam ser calculados juntos; TLS segue o provedor.

## 5. Ciclo Fastify

`apps/api/src/app.ts` monta a aplicação:

```text
requisição
 → onRequest (origem)
 → validação
 → preHandler (autenticação)
 → handler
 → serialização
 → resposta
```

Cookies, Helmet, CORS e rate limit são plugins. O logger mascara cookie, authorization e set-cookie. Também há corpo limitado a 64 KB e handler central de erros.

Dívidas: `app.ts` crescerá demais; `trustProxy: true` deve virar uma lista de proxies confiáveis; rate limit em memória não serve a várias instâncias; health check mede processo vivo, não banco disponível.

A evolução natural é modularizar autenticação, clientes e agenda, sem abstrações genéricas prematuras.

## 6. Senhas e sessões

`apps/api/src/security.ts` normaliza e-mail, gera 32 bytes aleatórios para sessão, salva apenas SHA-256 do token e protege senhas com Argon2id.

```text
token aleatório → cookie
       │
       └─ SHA-256(token) → auth_sessions.token_hash
```

Se a tabela vazar, o hash não funciona diretamente como cookie. A senha nunca é armazenada em texto puro. Os parâmetros atuais do Argon2id atingem a recomendação mínima atual da OWASP.

O cookie é HttpOnly, SameSite=Lax e Secure em produção. Isso bloqueia leitura via JavaScript, exige HTTPS e reduz requisições entre sites, mas SameSite não substitui uma estratégia CSRF completa.

Dívidas: nome antigo do cookie, `lastUsedAt` sem uso, ausência de limpeza de sessões expiradas, revogação global, verificação de e-mail e recuperação de senha.

## 7. Cadastro, login e logout

Cadastro:

1. Zod valida nome, e-mail e senha;
2. normaliza e-mail;
3. procura duplicidade;
4. calcula Argon2id;
5. insere usuário;
6. cria sessão e cookie;
7. retorna apenas dados públicos.

Há uma corrida entre SELECT e INSERT: duas requisições podem não encontrar o e-mail e tentar inserir. A constraint UNIQUE preserva o banco, mas a perdedora pode responder 500. O ideal é capturar a violação e retornar 409.

Login usa mensagem genérica para não revelar se o e-mail existe. `GET /auth/me` transforma cookie em hash, faz join de sessões/usuários e exige expiração futura. Logout exclui a sessão e limpa o cookie; limpar apenas o cookie deixaria credencial válida no servidor.

## 8. Autenticação versus autorização

`apps/api/src/auth.ts` autentica: “quem é você?”. Cada consulta autoriza: “pode acessar este registro?”.

```sql
WHERE appointment.id = ? AND appointment.owner_id = ?
```

Filtrar pelo proprietário no SQL é mais seguro que buscar só por ID. Dados de outra conta retornam 404, sem confirmar existência. O smoke test cria duas contas e verifica que uma não lê nem altera clientes, sessões ou pagamentos da outra.

## 9. Clientes

As rotas hoje ficam em `apps/api/src/app.ts`. Listagem separa ativos/arquivados; criação define `ownerId` no servidor; edição exige ID e dono; arquivamento preserva histórico; restauração é explícita.

O frontend nunca escolhe o proprietário. São boas decisões: arquivar em vez de apagar, usar `numeric` para dinheiro e não incluir dados clínicos no schema atual.

## 10. Domínio de sessões e pagamentos

`apps/api/src/appointments-domain.ts` contém schemas e regras puras.

Sessão: `scheduled`, `completed`, `cancelled`, `no_show`.

Pagamento: `pending`, `paid`, `waived` (não cobrada).

Falta exige `absenceJustified`; pagamento realizado não vira “não cobrado” sem ser desfeito. Funções puras são fáceis de testar.

Dívida: falta uma máquina formal de estados. Hoje uma concluída pode voltar a agendada. Pode ser correção válida, mas precisa ser decisão explícita e, futuramente, auditável.

## 11. Escrita completa: criar sessão

Em `apps/api/src/appointments.ts`, `POST /appointments`:

1. verifica origem;
2. autentica;
3. valida o corpo com Zod;
4. inicia transação;
5. confirma cliente ativo e do usuário;
6. insere sessão;
7. insere pagamento;
8. confirma a transação;
9. converte para DTO e responde JSON.

```text
BEGIN
  SELECT client
  INSERT appointment
  INSERT payment com preço congelado
COMMIT
```

Se o pagamento falhar, a sessão é revertida. `clients.sessionPrice` é copiado para `payments.amount`; mudar o preço futuro não reescreve o histórico.

## 12. Leitura mensal

`GET /appointments?month=2026-08` valida `YYYY-MM`, calcula início do mês e início do próximo, faz join entre sessões/clientes/pagamentos, filtra dono e intervalo, ordena e mapeia DTOs.

```text
startsAt >= início do mês
startsAt <  início do próximo mês
```

O intervalo semiaberto evita inventar 23:59:59.999.

O banco usa `timestamptz`, acertadamente. Porém, os limites usam offset fixo `-03:00`. O ideal é a zona `America/Sao_Paulo`, convertendo limites locais em instantes UTC.

## 13. Edição, status e pagamento

A edição localiza por ID e dono, valida eventual novo cliente, atualiza campos enviados e preserva pagamento.

A mudança de status lê sessão/pagamento, aplica função pura e atualiza ambos em transação. Existe uma janela de concorrência: a leitura inicial ocorre antes da transação. Outra requisição pode mudar o pagamento entre SELECT e UPDATE. O ideal é ler e escrever na mesma transação, talvez com `SELECT ... FOR UPDATE`, ou usar versionamento otimista.

Marcar pago exige `ownerId` e deve retornar o DTO atualizado para o frontend atualizar o cache imediatamente.

## 14. Schema e integridade

`apps/api/src/db/schema.ts` define users, auth_sessions, clients, appointments e payments.

Pontos bons: UUIDs, `timestamptz`, `numeric`, FKs, índices, e-mail único, um pagamento por sessão e `ownerId` para isolamento.

TypeScript e Zod não são a última defesa. Faltam CHECK constraints para preço/valor não negativos, frequência e duração válidas, modalidades/status permitidos, `paidAt` coerente com pago e justificativa coerente com falta.

A duplicação de `ownerId` ajuda consultas seguras, mas sem constraint composta o banco não impede sessão ligada ao cliente de outro dono. A API impede hoje; o schema ideal também deve reforçar.

## 15. Migrações

`schema.ts` descreve o estado desejado; `apps/api/drizzle` registra mudanças SQL.

```text
alterar schema → gerar migração → revisar SQL
 → aplicar localmente → testar → aplicar no deploy
```

Revise perda de dados, locks, defaults, colunas obrigatórias e compatibilidade. Produção precisa de backup e estratégia de roll-forward/rollback.

## 16. Erros e contratos

Convenções: 400 entrada inválida, 401 não autenticado, 404 inexistente/outra conta, 409 conflito, 500 inesperado.

O handler não expõe stack trace. Melhorias: formato estável com `code`, mensagem e campos; captura de violações PostgreSQL; schemas de resposta; OpenAPI; ID de correlação. Schema de resposta também evita expor hashes internos.

## 17. Testes

Os unitários cobrem regras puras de `appointments-domain.test.ts`.

`scripts/isolation-smoke.mjs` cria duas contas, verifica isolamento, pagamento e valor congelado. É útil, mas manual: exige servidor, porta fixa e deixa dados.

Próximo nível:

1. rotas com `app.inject()`;
2. banco descartável por suíte;
3. configuração/conexão injetáveis;
4. testes de cookies, origem, autorização e concorrência;
5. contratos frontend/backend;
6. execução no CI.

Pirâmide adequada: muitos testes de domínio, integração das rotas críticas e poucos ponta a ponta.

## 18. Revisão honesta

O backend está bom para um MVP consciente. Não há razão para reescrever ou adotar Nest apenas para parecer “enterprise”.

### Manter

- entry point pequeno e shutdown gracioso;
- configuração validada;
- Argon2id e sessão opaca;
- cookie seguro;
- autorização no SQL;
- transações e preço histórico;
- regras puras;
- tipos adequados, FKs e índices;
- teste de isolamento.

### Alta prioridade antes de dados reais

1. verificação de e-mail, recuperação de senha e política de sessões;
2. integração automatizada com banco descartável;
3. constraints no PostgreSQL;
4. backup, restauração e migrações;
5. HTTPS, segredos, proxy confiável e rate limit compartilhado;
6. estratégia CSRF/origin explícita;
7. revisão de logs e dados pessoais;
8. corrigir corridas de cadastro e status.

### Prioridade média

1. contratos request/response compartilhados ou gerados;
2. modularizar `app.ts`;
3. readiness do banco;
4. zona temporal nomeada;
5. auditoria;
6. paginação.

Evite por enquanto microserviços, CQRS/event sourcing, repositories genéricos e abstrações sem dois usos reais.

## 19. Arquitetura ideal sem exagero

```text
src/
  server.ts
  app.ts
  config.ts
  plugins/{database,security}.ts
  modules/
    auth/{routes,service,schemas}.ts
    clients/{routes,service,schemas}.ts
    appointments/{routes,service,domain,schemas}.ts
  db/{schema,migrations}
  shared/errors.ts
```

Rotas traduzem HTTP; serviços coordenam casos de uso/transações; domínio expressa regras; Drizzle persiste. Uma camada só aparece quando reduz acoplamento ou melhora testes.

## 20. Contrato frontend/backend

Um bug recente envolveu nomes diferentes para estado financeiro. Tipos duplicados manualmente causam isso.

Opções: pacote compartilhado de DTOs/Zod; OpenAPI e cliente gerado; validação nas fronteiras críticas. Não compartilhe tipos das tabelas: o contrato HTTP não deve expor hashes nem depender do formato de persistência.

## 21. Segurança do domínio

Mesmo sem prontuário, nomes, contatos, agenda e pagamentos são dados pessoais. Antes do uso real:

- coletar apenas o necessário;
- limitar acesso;
- HTTPS e criptografia em repouso;
- backups criptografados e restauração testada;
- retenção e exclusão definidas;
- auditoria sem conteúdo sensível;
- evitar dados pessoais em logs/analytics;
- atualizar dependências e imagens;
- planejar resposta a incidentes.

Dados clínicos devem formar módulo separado, com autorização, auditoria e retenção mais rigorosas.

## 22. Exercícios

1. Use breakpoints em `server.ts`, autenticação e criação de sessão.
2. Faça POST sem cookie, com cookie válido e cliente de outra conta; explique os status.
3. Relacione uma chamada Drizzle ao SQL, sem logar segredos.
4. Force falha na criação do pagamento e confirme rollback.
5. Simule duas atualizações concorrentes.
6. Adicione CHECK constraint numa branch e tente violá-la direto no banco.
7. Reescreva uma rota com `app.inject()` e banco descartável.
8. Compare DTO público de usuário com a tabela users.

## 23. Perguntas de revisão

1. Por que TypeScript não substitui Zod?
2. Por que Zod não substitui constraints?
3. Como diferem autenticação e autorização?
4. Por que salvar hash do token?
5. Por que congelar o preço?
6. O que a transação garante?
7. Por que intervalo semiaberto?
8. Por que `timestamptz` não resolve sozinho mês local?
9. Como concorrência quebra SELECT/UPDATE?
10. O que `app.inject()` melhora?
11. Quando Nest traria valor real?
12. Quais regras precisam existir também no banco?

## 24. Leituras oficiais

- [Fastify: referência](https://fastify.dev/docs/latest/Reference/)
- [Fastify: ciclo de vida](https://fastify.dev/docs/latest/Reference/Lifecycle/)
- [Fastify: validação](https://fastify.dev/docs/v5.0.x/Reference/Validation-and-Serialization/)
- [Fastify: plugins](https://fastify.dev/docs/latest/Reference/Plugins/)
- [Fastify: testes](https://fastify.dev/docs/v5.7.x/Guides/Testing/)
- [Drizzle com PostgreSQL](https://orm.drizzle.team/docs/get-started-postgresql)
- [Drizzle: transações](https://orm.drizzle.team/docs/transactions)
- [Drizzle: constraints](https://orm.drizzle.team/docs/indexes-constraints)
- [PostgreSQL: constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)
- [OWASP: senhas](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [OWASP: sessões](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP: CSRF](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)

## Resumo

Uma requisição entra no Fastify, é protegida e validada, ganha identidade pela sessão, aplica regras de domínio, executa SQL autorizado e transacional no PostgreSQL e retorna apenas um DTO público.
