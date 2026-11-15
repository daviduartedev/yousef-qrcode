# Estado da execução autônoma do roadmap

Checkpoint persistente da execução dos lotes do [roteiro na nuvem](execucao-roadmap-cloud.md). Atualize este arquivo a cada lote verificado ou bloqueado. Uma nova sessão deve conseguir retomar só com este arquivo, o `ROADMAPS.md` e o Git.

## Situação atual (15/11/2026)

| Item | Valor |
|---|---|
| Lote anterior | 6 — PR #26, merge `e905477` (commit do lote `c1f19fb`); deploy da Vercel concluído; migração `0005` aplicada e verificada no Neon de homologação |
| Último lote integrado | 7 — PR #27, merge `ec65d95` (commit do lote `bba47dd`); deploy da Vercel concluído; sem migração |
| Próximo lote | 8 — site público e entrada (P01, P02); independe de 6 e 7 |
| Depois | 9 — biblioteca de arquivos; exige armazenamento de objetos compatível com a Vercel e credencial de teste autorizada |

## Lotes

| Lote | Estado | Commit | Testes | Deploy |
|---|---|---|---|---|
| 1–5 | Integrados antes desta execução | `f0c6f61` | ver especificações | homologação |
| 6 | Integrado e verificado | `c1f19fb`, merge `e905477` | unit 5/5, API 23/23, ops 4/4, navegador 21/21, upgrade `0004→0005` ok, CI verde | Vercel ok; smoke HTTP sem sessão ok; fluxos autenticados hospedados aguardam conta autorizada |
| 7 | Integrado e verificado | `bba47dd`, merge `ec65d95` | unit 9/9, API 26/26, ops 4/4, navegador 12/12, CI verde | Vercel ok; smoke HTTP sem sessão ok (`/analytics` 307, APIs 401) |
| 8–20 | Não iniciados | — | — | — |

## Bloqueios e pendências

- Comparação direta com o trial da Uniqode: o trial pede login no executor. Usar a auditoria arquivada e a ajuda oficial; registrar lacunas por lote.
- Produção (#15), recuperação hospedada (#12), DNS real, cobrança real e mensagens a terceiros estão fora da autorização.
- Testes autenticados na homologação exigem conta autorizada pelo proprietário (AGENTS.md). Até lá, a verificação hospedada é HTTP sem sessão.
- Confirmar `TRUST_PROXY_HEADERS=true` na Vercel de homologação para ativar scanners únicos e deduplicação (Lote 7).
- Defeito anterior: erro de hidratação React #418 em `/overview` no build de produção (existe na `main` antes do Lote 7).
- Lote 9 precisa de um provedor de armazenamento de objetos para a Vercel e credencial de teste autorizada; sem isso, só a parte local pode ser entregue.

## Como retomar

1. `git fetch origin && git checkout main && git pull --ff-only`. Confira `git log --oneline -5` contra a tabela acima.
2. `npm ci`. Use um Postgres local descartável, por exemplo `docker run -d --name qrconnect-campaign-db -e POSTGRES_HOST_AUTH_METHOD=trust -p 127.0.0.1:55432:5432 postgres:17-alpine`.
3. O `.env.local` deste executor aponta para o Neon de homologação. Os testes recusam hosts remotos; passe `TEST_DATABASE_ADMIN_URL=postgresql://postgres@127.0.0.1:55432/postgres`.
4. Checks: `node scripts/check-secrets.mjs --history`, `git diff --check`, `npm run lint`, `npm run typecheck`, `npm run build`, `TEST_DATABASE_ADMIN_URL=… npm test`.
5. Navegador: crie um banco descartável, rode `npm run db:migrate` com `DATABASE_MIGRATION_URL` local, inicie `next start` com `DATABASE_URL`, `APP_URL` e `BETTER_AUTH_SECRET` locais no ambiente e rode o roteiro do lote (ex.: `docs/lotes/06-criacao-e-detalhe/verificacao/e2e.mjs`).
6. Siga o ciclo do roteiro: especificação → implementação → testes → revisão de segurança → evidências → PR com CI → migração aditiva no Neon de homologação → merge → verificação da Vercel → atualizar este arquivo e o `ROADMAPS.md`.
