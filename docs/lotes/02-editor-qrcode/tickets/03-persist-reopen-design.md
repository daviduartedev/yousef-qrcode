# Lote 2.3 — Salvar e reabrir o design do próprio QR

## Parent

Part of #6.

## What to build

O usuário salva o QR direto ou rastreável, encontra sua aparência na listagem, reabre e atualiza o design do mesmo registro. Alterações pendentes recebem proteção contra saída e a documentação distingue a validação local da publicação ainda dependente dos dados reais.

## Acceptance criteria

- [ ] Migração aditiva armazena design versionado e modo de tracking; registros legados usam Classic sem logo/moldura e continuam funcionando.
- [ ] APIs autenticadas permitem criar, consultar e atualizar design somente do proprietário, com origem e esquema validados.
- [ ] Salvar novamente não duplica o registro em edição nem altera ID, short code, conteúdo, modo ou contagem de scans.
- [ ] Listagem, reabertura e download usam o design persistido; após recarga a configuração se mantém.
- [ ] Código de outra conta, ownership forjado, design inválido e origem indevida são recusados.
- [ ] Erro ao salvar mantém o rascunho; conteúdo e modo de registros existentes ficam claramente bloqueados para alteração nesta entrega.
- [ ] Saída por navegação interna, histórico ou fechamento/recarga não perde edição silenciosamente; cancelar mantém e descartar permite sair.
- [ ] HTTP e navegador verificam os comportamentos nos pontos aprovados, incluindo cenário negativo.
- [ ] Documentação apresenta migração/retorno e pendências de novo Supabase, dados reais, ponte antiga e publicação sem declará-los concluídos.
- [ ] Revisão Standards/Spec, verificações finais e dvd-tests; servidor local saudável e checklist humana desmarcada antes de commit/push.

## Blocked by

Lote 2.2 — Preview e downloads fiéis ao design.
