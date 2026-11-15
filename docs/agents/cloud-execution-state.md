# Estado da execução autônoma do roadmap

Checkpoint persistente da execução dos lotes do [roteiro na nuvem](execucao-roadmap-cloud.md). Atualize este arquivo a cada lote verificado ou bloqueado. Uma nova sessão deve conseguir retomar só com este arquivo, o `ROADMAPS.md` e o Git.

## Situação atual (15/11/2026)

| Item | Valor |
|---|---|
| Último lote integrado | 9 — PR #30, merge `de0404c`; migração `0007` aplicada no Neon de homologação; deploy da Vercel verificado |
| Em andamento | 10 — Linkpages, branch `feat/lote-10-linkpages` (migração `0008`) |
| Depois | 11 (Cards) e 12 (Forms), ambos dependem de 7 e 9; depois 13 (organizações) |

## Lotes

| Lote | Estado | Commit | Testes | Deploy |
|---|---|---|---|---|
| 1–5 | Integrados antes desta execução | `f0c6f61` | ver especificações | homologação |
| 6 | Integrado e verificado | `c1f19fb`, merge `e905477` | unit 5/5, API 23/23, ops 4/4, navegador 21/21, upgrade `0004→0005` ok, CI verde | Vercel ok; smoke HTTP sem sessão ok; fluxos autenticados hospedados aguardam conta autorizada |
| 7 | Integrado e verificado | `bba47dd`, merge `ec65d95` | unit 9/9, API 26/26, ops 4/4, navegador 12/12, CI verde | Vercel ok; smoke HTTP sem sessão ok (`/analytics` 307, APIs 401) |
| 8 | Integrado e verificado | PR #29, merge `363ff25` | unit 11/11, API 30/30, ops 4/4, navegador 30/30, CI verde | Vercel ok; migração `0006`; recuperação aparece indisponível sem provedor de e-mail |
| 9 | Integrado e verificado | PR #30, merge `de0404c` | unit 14/14, API 34/34, ops 4/4, navegador 25/25, CI verde | Vercel ok; migração `0007`; `/assets` 307, API 401, POST de outra origem 403 |
| 10 | Em andamento | branch `feat/lote-10-linkpages` | API 37/37, navegador 26/26 | migração `0008` pendente até o PR |
| 11–20 | Não iniciados | — | — | — |

## Bloqueios e pendências

- Comparação direta com o trial da Uniqode: o trial pede login no executor. Usar a auditoria arquivada e a ajuda oficial; registrar lacunas por lote.
- Produção (#15), recuperação hospedada (#12), DNS real, cobrança real e mensagens a terceiros estão fora da autorização.
- Testes autenticados na homologação exigem conta autorizada pelo proprietário (AGENTS.md). Até lá, a verificação hospedada é HTTP sem sessão.
- Confirmar `TRUST_PROXY_HEADERS=true` na Vercel de homologação para ativar scanners únicos e deduplicação (Lote 7).
- Recuperação de senha e confirmação de e-mail (Lote 8) dependem de uma conta de envio (Resend) autorizada; sem ela aparecem como indisponíveis na homologação.
- Biblioteca (Lote 9) guarda arquivos no Postgres; não depende de provedor externo.
- Teste antigo de paginação da lista de QRs é instável no Docker local (empate de `created_at`).

## Como retomar

1. `git fetch origin && git checkout main && git pull --ff-only`. Confira `git log --oneline -5` contra a tabela acima.
2. `npm ci`. Use um Postgres local descartável, por exemplo `docker run -d --name qrconnect-campaign-db -e POSTGRES_HOST_AUTH_METHOD=trust -p 127.0.0.1:55432:5432 postgres:17-alpine`.
3. O `.env.local` deste executor aponta para o Neon de homologação. Os testes recusam hosts remotos; passe `TEST_DATABASE_ADMIN_URL=postgresql://postgres@127.0.0.1:55432/postgres`.
4. Checks: `node scripts/check-secrets.mjs --history`, `git diff --check`, `npm run lint`, `npm run typecheck`, `npm run build`, `TEST_DATABASE_ADMIN_URL=… npm test`.
5. Navegador: `node .scratch/serve.mjs qrconnect_e2eNN <porta>` (local, fora do Git) cria o banco e sobe o build; ou crie um banco descartável, rode `npm run db:migrate` com `DATABASE_MIGRATION_URL` local, inicie `next start` com `DATABASE_URL`, `APP_URL` e `BETTER_AUTH_SECRET` locais no ambiente e rode o roteiro do lote (ex.: `docs/lotes/06-criacao-e-detalhe/verificacao/e2e.mjs`).
6. Siga o ciclo do roteiro: especificação → implementação → testes → revisão de segurança → evidências → PR com CI → migração aditiva no Neon de homologação → merge → verificação da Vercel → atualizar este arquivo e o `ROADMAPS.md`.
