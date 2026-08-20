# Roadmap da Sophia

## Fundação — concluída

- Ambiente WSL, Docker e PostgreSQL.
- Cadastro, login, logout e sessões revogáveis.
- Separação dos dados por conta profissional.
- Dashboard e modo de demonstração.
- Navegação compartilhada e transições sem reload documental.
- Modelo inicial de clientes, sessões e pagamentos por sessão.

## Gestão de clientes — concluída

- Listagem e estado vazio.
- Cadastro, edição e arquivamento.
- Busca e filtros básicos.
- Preferência de frequência mensal e valor por sessão.

## Sessões e pagamentos — concluída
- API mensal de sessões, valor congelado por encontro e pagamento individual — concluída.

- Agenda mensal e criação de sessão.
- Estados: agendada, realizada, cancelada e falta do cliente.
- Falta justificada e definição de cobrança.
- Pagamento individual por sessão: pendente ou pago.
- Resumo mensal derivado dos registros reais.

## Segurança pré-produção — prioridade obrigatória

- Verificação de propriedade do e-mail com token de uso único e expiração curta.
- Estado de conta pendente até a confirmação.
- Reenvio com rate limiting e respostas que não revelem contas existentes.
- Recuperação de senha com revogação de sessões anteriores.
- Segundo fator de autenticação.
- Gestão de segredos, HTTPS, backups e teste de restauração.
- Auditoria de eventos administrativos sem conteúdo sensível.
- Testes automatizados de autorização entre contas.

## Área clínica — nice to have, isolada

- Definição prévia de requisitos de privacidade, retenção e acesso.
- Armazenamento separado dos dados administrativos.
- Criptografia, trilha de auditoria e exportação segura.
- Implementação somente após revisão jurídica e de privacidade aplicável.
