# Lote 3 — Publicação inicial com banco novo

Branch: `feat/lote-3-transicao-operacional`, criada da main em `ba13e603`. Em 02/11/2026, o proprietário confirmou início do zero, sem importar usuários, QRs ou histórico e sem preservar continuidade das URLs antigas. Substitui a parte de migração/ponte do plano anterior. **Não iniciar R3.**

- [Especificação](spec.md) / [GitHub #11](https://github.com/daviduartedev/yousef-qrcode/issues/11).
- [Acessos, decisões e gates](acessos-e-decisoes.md).
- [Comandos e procedimento de operação](operacao.md): configuração privada, preparação, backup e restauração separados.
- [Preparação Supabase + Vercel](vercel.md), escolhidos pelo proprietário; endereço `vercel.app` inicial, sem domínio próprio definido.
- [Roadmap reconciliado](../../../ROADMAPS.md).
- [Procedimento anterior do R2](../02-editor-qrcode/publicacao.md), histórico; início do zero prevalece sobre requisitos de legado.

## Fatias vigentes

| Fatia | Entrega | Bloqueada por | Ticket |
|---|---|---|---|
| 3.1 | Novo ambiente e backup/restauração ensaiados em alvo separado | Novo Postgres, hospedagem e política de recuperação | [#12](https://github.com/daviduartedev/yousef-qrcode/issues/12) / [local](tickets/01-inventario-restauracao.md) |
| 3.2 | Homologação com novas contas e QRs, sem legado | 3.1 e configuração de homologação | [#13](https://github.com/daviduartedev/yousef-qrcode/issues/13) / [local](tickets/02-homologacao-importacao.md) |
| 3.3 | Ponte antiga retirada por início do zero | Não aplicável | [#14](https://github.com/daviduartedev/yousef-qrcode/issues/14) / [registro](tickets/03-ponte-qrs-antigos.md) |
| 3.4 | Publicação e retorno compatível com novas gravações | 3.2, prontidão de produção e validação humana | [#15](https://github.com/daviduartedev/yousef-qrcode/issues/15) / [local](tickets/04-publicacao-retorno.md) |

Sequência ativa: **#12 → #13 → #15**. Migração e ponte foram retiradas pela confirmação do proprietário, sem mudança de tecnologia ou visual. Comandos, HTTP e navegador/celular continuam aplicáveis ao novo ambiente; casos de legado foram dispensados. `ready-for-agent` registra planejamento, não acessos disponíveis ou validação da entrega.

## Estado e próxima fronteira

- Comandos de inspeção/preparação/backup/restauração implementados para #12, com ensaio automatizado em bancos locais descartáveis. Ambiente remoto, política de retenção/guarda, homologação hospedada e publicação ainda não foram comprovados; #12 continua aberto.
- O proprietário pode criar outro Supabase; projeto pronto não confirmado. Próxima fronteira: confirmar/preparar o destino novo e separado, conforme README, para liberar #12.
- Acesso ao Supabase antigo foi confirmado e deixou de bloquear o lote. Não apagar/desligar a origem nesta preparação. QRs dependentes dela poderão parar quando o serviço for desligado, consequência aceita pelo proprietário.
- Lotes 1/2, skills e proteções preservados; pais #1/#6 abertos e `pr-assets` mantida.

## Sequência de execução

1. Conferir destino novo, acessos e decisões da fronteira. Configurar valores privadamente conforme README; nunca pedir segredos pelo chat.
2. Implementar somente a fatia liberada, com dados sintéticos isolados e testes aprovados. Não importar legado ou depender de contas antigas.
3. Revisar Standards/Spec e executar checks pertinentes; documentação não justifica repetir build, setup ou toda a validação anterior.
4. Aplicar dvd-tests à implementação nova e entregar checklist humana desmarcada. Sem UI nova para Drive nesta preparação.
5. Aguardar validação humana antes de commit/push/PR/merge; depois cumprir G4 e go/no-go. Início do zero não substitui essa validação.
6. Ensaiar retorno preservando gravações novas antes de publicar; acompanhar conforme G5.
