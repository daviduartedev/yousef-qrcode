# QRConnect — Next.js + Postgres

Migração do produto existente para Next.js App Router, preservando as telas da landing, autenticação, gerador e meus QR Codes. Postgres, sessões e operações de QR são acessados pelo servidor. O navegador não usa o cliente Supabase, chaves administrativas ou a função Deno do projeto anterior.

## Lote 1

- Branch: `feat/lote-1-nextjs-postgres`, criada de `main`.
- [Especificação #1](https://github.com/daviduartedev/yousef-qrcode/issues/1).
- [Next.js e proteção de credenciais #2](https://github.com/daviduartedev/yousef-qrcode/issues/2).
- [Autenticação e Postgres #3](https://github.com/daviduartedev/yousef-qrcode/issues/3), bloqueado por #2.
- [QR Codes no servidor #4](https://github.com/daviduartedev/yousef-qrcode/issues/4), bloqueado por #3.

A validação humana local deste lote foi concluída em 02/11/2026. Cada lote seguinte deve começar de uma `main` atualizada, após integração do lote anterior.

## Lote 2

- Branch: `feat/lote-2-editor-qrcode`, criada da `main` atualizada.
- [Especificação #6](https://github.com/daviduartedev/yousef-qrcode/issues/6); tickets [#7](https://github.com/daviduartedev/yousef-qrcode/issues/7), [#8](https://github.com/daviduartedev/yousef-qrcode/issues/8) e [#9](https://github.com/daviduartedev/yousef-qrcode/issues/9), com #9 dependente de #8.
- Inglês/árabe, RTL e retorno compartilhados; preview e PNG/SVG usam o mesmo design, logo e moldura.
- Design versionado e modo direto/rastreável persistidos. Reabertura altera somente a aparência e preserva destino, identidade e scans. Códigos sem design usam Classic sem alegar recuperar a aparência original.
- Sem upload de logo próprio, GPS, Update Later ou formatos de exportação sem implementação.
- [Preparação de publicação e retorno](docs/lotes/02-editor-qrcode/publicacao.md). Novo Supabase, importação real e ponte antiga continuam pendentes; este lote não os declara concluídos.
- A validação humana local do Lote 2 foi concluída em 02/11/2026. Importação de dados reais, compatibilidade no serviço antigo e implantação em produção continuam sujeitas às etapas documentadas de publicação.

## Desenvolvimento local

Requisitos: Node.js 22 ou superior, npm, Git e Docker com suporte a containers Linux.

```sh
npm ci
npm run db:local
npm run db:up
npm run db:migrate
npm run dev -- --hostname localhost --port 3000
```

`db:local` gera credenciais aleatórias somente em `.env.local`, sem imprimi-las e sem substituir configuração já existente. O comando informa a URL escolhida. Se a porta 3000 estiver ocupada, use no comando de inicialização a porta informada e mantenha `APP_URL` igual à origem da aplicação. O banco local fica vinculado a `127.0.0.1`; dados persistem em um volume do Docker.

Abra a URL informada. Não há login, senha padrão ou conta de demonstração embutida: crie uma conta pela interface. Para parar somente o banco deste projeto, use `docker compose --env-file .env.local stop`.

## Novo projeto Supabase

Neste lote, Supabase é a hospedagem do **Postgres**, sob a conta do proprietário. Better Auth gerencia usuários e sessões no próprio banco. Não são necessárias chaves `anon`, `publishable` ou `service_role`.

1. Crie o novo projeto e obtenha a conexão Postgres pelo painel Connect. Use conexão direta ou session pooler conforme a rede da hospedagem; o session pooler é uma opção para ambientes sem IPv6.
2. Configure `DATABASE_URL`, `BETTER_AUTH_SECRET` aleatório de pelo menos 32 caracteres e `APP_URL` na configuração privada da hospedagem ou em `.env.local`. O exemplo versionado contém apenas placeholders. Não envie esses valores pelo chat, em issues ou em commits.
3. Para migrations, é possível fornecer `DATABASE_MIGRATION_URL` com uma conexão direta/session pooler. O comando usa essa conexão quando definida; do contrário, usa `DATABASE_URL`.
4. Use TLS com validação do certificado para conexão remota. O exemplo usa `sslmode=verify-full`; não desative a verificação de certificados para contornar erros.
5. Execute `npm run db:migrate` contra **o novo projeto**, antes de publicar a aplicação. O usuário da conexão precisa ser proprietário das tabelas/migrations ou ter as permissões correspondentes.
6. Gere um build com `npm run build` e execute `npm start`. Em produção, use HTTPS e a origem pública exata em `APP_URL`.

As tabelas ficam no schema privado `qrconnect`, com RLS habilitado. Não exponha esse schema pela Data API. O backend confiável usa o proprietário das tabelas e aplica autorização com a sessão em cada operação; não existe uma política pública que permita inserir scans diretamente. O histórico de migrations fica em `qrconnect_migrations`.

`TRUST_PROXY_HEADERS` é `false` por padrão. Só habilite quando um proxy confiável sobrescrever os cabeçalhos recebidos da internet. Nesse caso, o rastreamento pode ler o IP encaminhado e cabeçalhos de localização do provedor. Sem essa configuração, IP/localização ficam indisponíveis; nenhuma consulta externa de geolocalização bloqueia o redirecionamento. Esse recurso não coleta GPS do aparelho.

## Proteção de credenciais

- `.env` e variantes, certificados, exportações e diretórios temporários são ignorados. Apenas `.env.example` com valores fictícios é permitido.
- `npm ci`/`npm install` instala hooks locais deste repositório. O pre-commit verifica o **conteúdo preparado no Git**, e o pre-push verifica também o histórico.
- A verificação recusa arquivos de ambiente, URLs de banco com senha, chaves privadas, tokens de provedores, JWTs e atribuições de segredo reconhecíveis. Ela informa regra/localização, sem imprimir valores.
- `npm run check:secrets` verifica a árvore atual. `node scripts/check-secrets.mjs --history` inclui o histórico alcançável pelas referências locais.
- O CI executa essas verificações e Gitleaks, além das verificações da aplicação.
- Banco e segredo de sessão só podem ser acessados por módulos marcados `server-only`. Variáveis com credenciais nunca devem usar o prefixo público do framework.

Essas camadas reduzem erros acidentais. Hooks podem ser desativados e scanners não reconhecem todo segredo possível. Recomenda-se exigir os checks de CI na proteção de `main` e habilitar secret scanning/push protection nas configurações do GitHub. A configuração do servidor GitHub não é substituída por este código. Se um segredo privado for exposto, revogue-o antes de limpar o histórico.

O histórico antigo não foi importado. Nenhum ambiente, banco ou token do projeto anterior deve ser copiado para este repositório público.

## Rotas e comportamento

| Rota | Comportamento |
|---|---|
| `/` | Landing pública com o visual herdado. |
| `/auth` | Cadastro/login por e-mail e senha. |
| `/app` | Gerador existente; requer sessão validada no servidor. |
| `/my-qrcodes` | Lista, exclusão e estatísticas dos próprios QR Codes. |
| `/qr?code=...` | Registra um scan e redireciona com HTTP 302, sem cache. |
| `/api/auth/*` | Sessão e operações de autenticação. |
| `/api/qr-codes` | Lista/criação autenticada; lista limitada aos 1.000 registros mais recentes nesta versão. |
| `/api/qr-codes/{id}` | Leitura, atualização somente do design e exclusão pelo dono. |
| `/api/qr-codes/{shortCode}/analytics` | Estatísticas agregadas no servidor e dez eventos recentes. |

Novos destinos rastreáveis aceitam HTTP/HTTPS sem credenciais embutidas. A criação e exclusão exigem a origem configurada. A leitura pública registra eventos e incrementa o contador na mesma transação. Pedidos HEAD não criam scans. Há um limite de 300 eventos por minuto por código, verificado de forma transacional; acima disso a resposta é 429 com indicação para tentar novamente. Medidas adicionais de proteção de tráfego podem ser aplicadas na hospedagem.

### QR Codes antigos

Um código impresso que aponta ao endereço da função Supabase original continuará apontando para ele. Para preservá-lo, exporte/importе os registros e mantenha uma ponte naquele endereço, encaminhando os mesmos short codes à nova rota pública. Esta implementação **não alterou nem desligou o projeto antigo** e não importou dados reais. Usuários e registros exigem uma migração acompanhada, com IDs preservados ou mapeados e validação dos hashes de senha. Enquanto não houver exportações e acesso ao serviço antigo, essa transição permanece pendente.

### Escopo preservado

O Lote 1 preservou o editor e seus limites conhecidos. O Lote 2 conecta PNG/SVG ao design compartilhado, incorpora logos do catálogo e molduras, completa inglês/árabe nas telas do fluxo e acrescenta reabertura de aparência. Download sem tracking codifica diretamente o destino; com tracking codifica a URL pública do serviço. PDF/EPS e controles sem função foram retirados. Rascunhos do editor ficam em memória: a saída interna pede confirmação, o histórico permite retomada e uma recarga/fechamento com alterações pendentes usa o aviso do navegador.

Linkpages publicadas, cartões publicados, formulários, cobrança, integrações e novos dashboards não fazem parte desta migração.

## Verificações

```sh
npm run check:secrets
npm run lint
npm run typecheck
npm run build
npm test
```

Os testes de proteção usam repositórios temporários e dados sintéticos. Os testes HTTP criam um **banco descartável separado em localhost**, aplicam migrations e iniciam um servidor de produção em porta livre. O runner recusa um banco fora de localhost e remove somente o banco temporário criado por ele ao terminar. Não são utilizadas credenciais de produção nem uma conta padrão. É necessário gerar o build antes de `test:api`.

A validação de navegador e a checklist humana seguem `dvd-tests`; não há um arquivo de teste E2E permanente ou credenciais de login versionadas.
