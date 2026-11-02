## Parent

https://github.com/daviduartedev/yousef-qrcode/issues/1

## What to build

o usuário cria um QR rastreável, encontra-o na sua lista, consulta estatísticas e remove o registro. Quem lê o QR é redirecionado pelo domínio da aplicação, com um evento registrado. Outras contas não acessam os recursos desse usuário.

## Acceptance criteria

- [ ] Criar e listar QRs funciona com dados reais do Postgres local e propriedade derivada da sessão.
- [ ] Exclusão e analytics ficam restritos ao dono; consultar identificadores de outra conta não vaza dados.
- [ ] Um QR ativo redireciona ao destino permitido e registra o scan com contagem consistente.
- [ ] Códigos ausentes/inativos e destinos inseguros têm respostas públicas apropriadas.
- [ ] Novos links usam a origem da aplicação, sem projeto Supabase antigo hardcoded.
- [ ] O gerador estático existente continua funcionando com o visual preservado.
- [ ] Testes, revisão de código e Drive de navegador terminam com lista manual desmarcada e servidor saudável, sem commit da implementação.
