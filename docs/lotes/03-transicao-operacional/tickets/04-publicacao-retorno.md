# Lote 3.4 — Publicação inicial e retorno compatível

## Parent

Part of #11 — Publicação inicial com banco novo.

## What to build

Publicar com banco novo, novas contas e QRs no domínio final, acompanhamento e recuperação ensaiada. Comprovar retorno preservando dados posteriores no novo ambiente. Sem importação, ponte ou retorno ao banco legado.

## Acceptance criteria

- [ ] Registrar go/no-go, janela, plantão, domínio/origem HTTPS, DNS/TLS, backups/monitoramento, observação e limiares de falha.
- [ ] Confirmar produção nova com migrations, sem legado ou fixtures de homologação; não esvaziar banco automaticamente e criar contas pelo fluxo normal.
- [ ] Controlar escritas novas, incluindo editor/API e scans públicos durante publicação/manutenção/retorno; preservar gravações posteriores, sem delta legado.
- [ ] Ensaiar retorno em homologação com usuários, QRs, design, modo e scans posteriores ao marco do exercício; build compatível, colunas/migrations conservadas e dados novos reconciliados antes de restauração que os substitua. Não depender do serviço antigo.
- [ ] Concluir revisão, checks pertinentes, dvd-tests e validação humana antes de commit/push/PR/merge; G4 e decisão operacional antes do deploy. Início do zero não substitui esses passos.
- [ ] Publicar versão validada e confirmar no domínio final novas contas, isolamento, salvar/reabrir, PNG/SVG, QR novo e eventos; acompanhar falhas pelo período acordado.
- [ ] Concluir G5 com evidência sanitizada e aceite; não implantar ponte nem apagar/desligar o projeto antigo. QRs antigos não são critério de aceite.

## Blocked by

#13 — Homologação com novas contas e QRs. Pré-condições adicionais: A9 e D7–D9. #14 retirado do escopo e não bloqueia esta entrega.
