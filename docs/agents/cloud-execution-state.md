# Estado da execução autônoma do roadmap

Checkpoint persistente da execução dos lotes do [roteiro na nuvem](execucao-roadmap-cloud.md). Atualize este arquivo a cada lote verificado ou bloqueado. Uma nova sessão deve conseguir retomar só com este arquivo, o `ROADMAPS.md` e o Git.

## Situação atual (15/11/2026)

| Item | Valor |
|---|---|
| Último lote verificado localmente | 6 — [assistente de criação, tipos estáticos, detalhe e download](../lotes/06-criacao-e-detalhe/spec.md) |
| Branch do lote | `feat/lote-06-criacao-e-detalhe` (base `85e425c`) |
| Integração na `main` | pendente: PR com CI e migração `0005` no Neon de homologação |
| Próximo lote | 7 — Analytics e ciclo de vida no Overview (P03, P13), depende do 6 |
| Lotes paralelos possíveis | 8 (site público e entrada) e 9 (biblioteca de arquivos; exige armazenamento persistente compatível com a Vercel) |

## Lotes

| Lote | Estado | Commit | Testes | Deploy |
|---|---|---|---|---|
| 1–5 | Integrados antes desta execução | `f0c6f61` | ver especificações | homologação |
| 6 | Implementado e verificado localmente | ver histórico da branch | unit 5/5, API 23/23, ops 4/4, navegador 21/21, upgrade `0004→0005` ok | pendente |
| 7–20 | Não iniciados | — | — | — |

## Bloqueios e pendências

- Comparação direta com o trial da Uniqode: o trial pede login no executor. Usar a auditoria arquivada e a ajuda oficial; registrar lacunas por lote.
- Produção (#15), recuperação hospedada (#12), DNS real, cobrança real e mensagens a terceiros estão fora da autorização.
- Lote 9 precisa de um provedor de armazenamento de objetos para a Vercel e credencial de teste autorizada; sem isso, só a parte local pode ser entregue.

## Como retomar

1. `git fetch origin && git checkout main && git pull --ff-only`. Confira `git log --oneline -5` contra a tabela acima.
2. `npm ci`. Use um Postgres local descartável, por exemplo `docker run -d --name qrconnect-campaign-db -e POSTGRES_HOST_AUTH_METHOD=trust -p 127.0.0.1:55432:5432 postgres:17-alpine`.
3. O `.env.local` deste executor aponta para o Neon de homologação. Os testes recusam hosts remotos; passe `TEST_DATABASE_ADMIN_URL=postgresql://postgres@127.0.0.1:55432/postgres`.
4. Checks: `node scripts/check-secrets.mjs --history`, `git diff --check`, `npm run lint`, `npm run typecheck`, `npm run build`, `TEST_DATABASE_ADMIN_URL=… npm test`.
5. Navegador: crie um banco descartável, rode `npm run db:migrate` com `DATABASE_MIGRATION_URL` local, inicie `next start` com `DATABASE_URL`, `APP_URL` e `BETTER_AUTH_SECRET` locais no ambiente e rode o roteiro do lote (ex.: `docs/lotes/06-criacao-e-detalhe/verificacao/e2e.mjs`).
6. Siga o ciclo do roteiro: especificação → implementação → testes → revisão de segurança → evidências → PR com CI → migração aditiva no Neon de homologação → merge → verificação da Vercel → atualizar este arquivo e o `ROADMAPS.md`.
