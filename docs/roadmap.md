# Roadmap da Sophia

## Fundação — concluída

- Ambiente WSL, Docker e PostgreSQL.
- Cadastro, login, logout e sessões revogáveis.
- Separação dos dados por conta profissional.
- Dashboard e modo de demonstração.
- Navegação compartilhada e transições sem reload documental.
- Modelo administrativo de clientes, sessões e pagamentos por sessão.
- Teste real de isolamento entre contas para clientes, sessões e pagamentos.

## Gestão de clientes — concluída

- Listagem e estado vazio.
- Cadastro, edição, arquivamento e restauração.
- Busca e filtros básicos.
- Preferência de frequência mensal e valor por sessão.

## Agenda e sessões — concluída

- Agenda mensal e criação de sessão.
- Edição e reagendamento de cliente, data, horário, modalidade e duração.
- Preservação do valor registrado originalmente ao editar uma sessão.
- Estados: agendada, realizada, cancelada e falta do cliente.
- Falta justificada e definição de cobrança.
- Resumo mensal derivado dos registros reais.

## Financeiro — concluído

- Pagamento individual por sessão: pendente, pago ou não cobrado.
- Página financeira mensal com valores cobrados, recebidos, pendentes e não cobrados.
- Filtros por estado do pagamento.
- Atualização do pagamento diretamente pela agenda ou pelo financeiro.

## Qualidade — próxima etapa

- Transformar os testes de integração em uma suíte independente do servidor local já iniciado.
- Adicionar testes do frontend e do fluxo completo de cadastro, cliente, sessão e pagamento.
- Cobrir acessibilidade, teclado e diferentes larguras de tela de forma automatizada.

## Segurança pré-produção — prioridade obrigatória

- Verificação de propriedade do e-mail com token de uso único e expiração curta.
- Estado de conta pendente até a confirmação.
- Reenvio com rate limiting e respostas que não revelem contas existentes.
- Recuperação de senha com revogação de sessões anteriores.
- Segundo fator de autenticação.
- Gestão de segredos, HTTPS, backups e teste de restauração.
- Auditoria de eventos administrativos sem conteúdo sensível.
- Termos de uso e política de privacidade reais, com registro da versão aceita.
- Exportação dos dados e encerramento de conta.

## Área clínica — nice to have, isolada

- Definição prévia de requisitos de privacidade, retenção e acesso.
- Armazenamento separado dos dados administrativos.
- Criptografia, trilha de auditoria e exportação segura.
- Implementação somente após revisão jurídica e de privacidade aplicável.
