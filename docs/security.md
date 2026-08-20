# Segurança

## Controles implementados

- Senhas protegidas com Argon2id e salt individual.
- Sessões opacas aleatórias; apenas o SHA-256 do token é persistido.
- Cookies `HttpOnly`, `SameSite=Lax` e `Secure` em produção.
- Logout revoga a sessão no servidor.
- Rate limiting global e limite mais restrito em cadastro/login.
- Validação de corpo e limites de tamanho antes de persistir dados.
- CORS restrito ao frontend configurado e verificação de origem em operações mutáveis.
- Cabeçalhos de segurança via Helmet.
- Redação de cookies e autorização nos logs.
- Toda consulta de clientes inclui o proprietário autenticado.
- PostgreSQL exposto apenas em `127.0.0.1` no ambiente local.
- Mensagem de login deliberadamente genérica para não confirmar contas existentes.

## Dados clínicos

Notas clínicas foram excluídas desta primeira versão. Antes de introduzi-las, será necessário definir requisitos de retenção, acesso, auditoria, criptografia em repouso e recuperação. Elas não devem compartilhar automaticamente as mesmas permissões dos dados administrativos.

## Antes de produção

- Usar segredos exclusivos e um gerenciador de segredos.
- Servir frontend e API exclusivamente por HTTPS.
- Definir política de backup e testar restauração.
- Implementar recuperação de conta e verificação de e-mail.
- Adicionar segundo fator de autenticação.
- Registrar eventos administrativos sem registrar conteúdo sensível.
- Revisar dependências, infraestrutura e modelo de ameaças a cada release.
- Fazer revisão jurídica e de privacidade aplicável ao local de operação.
