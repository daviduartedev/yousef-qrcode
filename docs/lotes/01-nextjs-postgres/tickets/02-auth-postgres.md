## Parent

https://github.com/daviduartedev/yousef-qrcode/issues/1

## What to build

o usuário cria uma conta, entra, acessa o gerador e sai da conta usando o novo backend com Postgres. Sessões sobrevivem à navegação e ao recarregamento; um visitante anônimo é direcionado à autenticação.

## Acceptance criteria

- [ ] Banco local isolado e migrations permitem reproduzir o ambiente sem dados de produção.
- [ ] Cadastro, login, sessão e logout funcionam pela interface pública.
- [ ] Dados de conexão e segredo de sessão não são enviados ao navegador nem registrados no Git.
- [ ] Rotas protegidas e operações do servidor exigem sessão válida.
- [ ] A documentação explica como configurar o novo Supabase sem enviar chaves pelo chat ou versioná-las.
