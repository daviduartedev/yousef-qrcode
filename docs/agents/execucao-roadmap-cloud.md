# Executar os próximos lotes do QRConnect na nuvem

Abra uma tarefa na nuvem vinculada a `daviduartedev/yousef-qrcode`, na `main`, e cole o bloco abaixo. O roteiro serve para uma sessão autônoma até concluir a fila ou registrar o que depende de acesso, evidência ou decisão do proprietário. Cada lote chega à `main` em um commit próprio depois de passar pelos testes do repositório, revisão e verificação no navegador.

## Prompt para copiar

> Execute os lotes restantes do QRConnect em `daviduartedev/yousef-qrcode`, partindo da `main` atual. Leia integralmente `AGENTS.md`, `ROADMAPS.md`, `docs/agents/execucao-roadmap-cloud.md` e `docs/referencias/auditoria-paridade-uniqode.md`. Confira o Git e os tickets existentes. Use o Lote 5 como exemplo de implementação, revisão e evidência.
>
> Siga a fila e as dependências do roteiro. Para cada lote, confirme o que já existe, escreva a especificação e os tickets, implemente, revise, execute o CI localmente, rode `dvd-tests` ou seu equivalente no navegador e registre evidências. Mantenha um agente coordenador. Se houver subagentes, delegue a comparação com a Uniqode, implementações realmente independentes e revisão de escopo e risco. O coordenador resolve conflitos, integra e valida a versão final.
>
> O proprietário autoriza esta execução sem espera por aceite humano a cada lote e permite commits e pushes diretos em `main` por avanço rápido, dentro dos limites do roteiro. Valide o destino de homologação e a compatibilidade da migração antes de qualquer push que possa disparar deploy. Preserve o #15 e as operações de produção adiadas. Atualize `ROADMAPS.md` a cada lote verificado e registre bloqueios com a evidência que falta. Quando um bloqueio afetar só uma parte, entregue as partes independentes verificadas e avance para os próximos lotes possíveis.
>
> Preserve inglês/árabe, RTL, isolamento por conta e as URLs públicas já emitidas. Teste efeitos observáveis com dados sintéticos, estados de erro, isolamento e os fluxos afetados dos lotes anteriores. Evidencie o que viu no trial, em capturas ou na ajuda oficial da Uniqode. Falta de acesso ao trial é uma lacuna da comparação e deve ficar registrada.
>
> Ao concluir, entregue um resumo por lote com commits, links de homologação, resultados de CI e navegador, diferenças com a referência e pendências. Dê **uma única checklist humana**, com o caminho pelas telas publicadas e os dados de teste necessários. Se a sessão terminar antes da fila, deixe registrado o último commit entregue e o próximo passo que permite retomá-la.

## Base já entregue

| Lote | Entrega que deve continuar funcionando | Referência |
|---|---|---|
| 1 | Next.js, PostgreSQL e Better Auth. Cadastro, login, logout, criação, listagem e rastreamento de QR com isolamento por conta. | [PR #5](https://github.com/daviduartedev/yousef-qrcode/pull/5) · [Especificação](../lotes/01-nextjs-postgres/spec.md) |
| 2 | Editor EN/AR e RTL, design persistido, PNG/SVG fiéis à prévia e guarda de alterações pendentes. | [PR #10](https://github.com/daviduartedev/yousef-qrcode/pull/10) · [Especificação](../lotes/02-editor-qrcode/spec.md) |
| 3 | Vercel e Neon em homologação, recuperação local e procedimento de operação. Início do zero e ponte do legado dispensada. Produção, retorno e recuperação hospedada continuam fora desta execução. | [PR #16](https://github.com/daviduartedev/yousef-qrcode/pull/16) · [PR #17](https://github.com/daviduartedev/yousef-qrcode/pull/17) · [Acessos e decisões](../lotes/03-transicao-operacional/acessos-e-decisoes.md) |
| 4 | Overview e gestão de QRs próprios. Paginação, busca e filtros. Pausar e retomar na mesma URL, excluir com consequência explícita e ver estatísticas básicas. | [PR #25](https://github.com/daviduartedev/yousef-qrcode/pull/25) · [Tickets #19–#24](../referencias/r3-painel-e-gestao-tickets.md) |
| 5 | Gaveta mobile, busca global, lista e grade, filtros por operador, pastas, rótulos, watchlist, ZIP e importação CSV. CI e Vercel passaram, com a migração `0004` aplicada no Neon de homologação. | [Commit f0c6f61](https://github.com/daviduartedev/yousef-qrcode/commit/f0c6f6158c4786a55684f8ecab9bc6fea92c1a64) · [Especificação](../lotes/05-gestao-avancada/spec.md) |
| 6 | Assistente de criação em etapas, tipos estáticos Texto/E-mail/Telefone/SMS/Wi-Fi, download com tamanho e correção de erros, troca de destino rastreável com histórico. Migração `0005` aplicada no Neon de homologação. | [PR #26](https://github.com/daviduartedev/yousef-qrcode/pull/26) · [Especificação](../lotes/06-criacao-e-detalhe/spec.md) |
| 7 | Analytics consolidado com período, comparação, filtros e CSV; regras de bots, repetição e scanner único; ciclo de vida no Overview e na lista. | [Especificação](../lotes/07-analytics-ciclo-de-vida/spec.md) |

Antes de criar tickets, confira os que já existem. #1 e #6 são especificações pai mantidas abertas. #13 tem aceite hospedado documentado. #12 mantém a recuperação hospedada adiada. #15 mantém produção e retorno adiados. #14 foi retirado. A paridade do Lote 5 cobre a navegação que os quadros arquivados permitem comparar. O trial pediu login e os fluxos com dados foram exercitados no QRConnect. Consulte a [auditoria da Uniqode](../referencias/auditoria-paridade-uniqode.md) como registro histórico do trial e use o [roadmap atual](../../ROADMAPS.md) para saber o que já chegou à `main`.

## Preparar o ambiente da nuvem

1. Confirme acesso de leitura e escrita ao repositório, rede para dependências e documentação oficial, Node.js 24 como no CI, npm, Git, Docker com Compose e navegador automatizável. Guarde acesso GitHub, Vercel, Neon e eventuais provedores na configuração privada do executor. A tarefa recebe permissões de homologação apenas quando o destino e a conta forem confirmados.
2. Comece de árvore limpa e `origin/main` atualizada. Instale com `npm ci`, confirme os hooks do Git e leia a documentação Next.js que acompanha a versão instalada em `node_modules/next/dist/docs/` antes de alterar as convenções do framework.
3. Em checkout descartável, use os comandos abaixo. O passo `db:local` conserva uma configuração existente. Antes de migrar, confirme que tanto `DATABASE_URL` quanto qualquer sobrescrita de migração ou teste apontam para Postgres em loopback. Use a porta de aplicação informada pelo script e a mesma origem no `APP_URL`. Use projeto Compose separado para testes de worktrees concorrentes.

```sh
npm ci
npm run db:local
docker compose --env-file .env.local up -d --wait db
npm run db:migrate
npm run dev -- --hostname localhost --port 3000
```

O último comando usa 3000 como exemplo. Os testes HTTP e operacionais criam bancos locais descartáveis. Se Docker, navegador ou permissão de push faltarem, rode as verificações disponíveis, tente a alternativa suportada pelo executor e registre o que ficou sem prova. Um lote que depende de um check indisponível fica preparado para retomada. A tarefa pode continuar outros lotes em worktrees locais e entregar patches se o executor não publicar em GitHub.

## Fila de entrega

Os números abaixo dão continuidade aos cinco lotes entregues. Divida um lote em tickets concluíveis conforme o risco e as dependências, com um caminho de ponta a ponta por entrega. O aceite da coluna final é o mínimo para uma revisão automatizada. Subtarefas independentes podem avançar em paralelo. Integração na `main` é sequencial.

| Lote | Escopo e referência | Depende de | Aceite mínimo |
|---|---|---|---|
| 6 | R3 · Assistente de criação, tipos independentes, detalhe, templates e download. P08–P12. | Lotes 2 e 5 | Criar Website direto e rastreável em etapas. Comprovar os tipos estáticos independentes por payload e decodificação. Reusar o design salvo em prévia, etapa de conclusão e download. Reabrir QRs anteriores. Alterar o destino rastreável e provar que a mesma URL redireciona ao novo destino, preserva os scans e registra a alteração. Entregar parâmetros e formatos documentados à medida que os arquivos forem verificáveis. |
| 7 | R3 · Analytics e ciclo de vida no Overview. P03 e P13. | 6 | Documentar contagem de scans, scanner único, bots, deduplicação, retenção e regras de ciclo de vida antes de exibir a métrica. Validar dados sintéticos com totais conhecidos no detalhe, no consolidado, no período anterior, nos filtros e na exportação. |
| 8 | R2 · Site público e entrada. P01 e P02. | Lotes 1 e 2. Pode avançar em paralelo a 6 e 7. | Conferir CTAs, navegação pública, desktop, celular, EN/AR, cadastro, login, logout, acesso privado e estados de erro. Exercitar recuperação e verificação com provedor de teste, quando fizerem parte do contrato definido. |
| 9 | R6 · Biblioteca de arquivos. P21 e uploads de P10, P15 e P17. | Lote 5 | Criar, organizar, buscar e reaproveitar mídia autorizada. Testar tipo, tamanho, remoção e escrita/leitura entre duas contas. Provar armazenamento persistente compatível com a Vercel para o escopo hospedado. |
| 10 | R4 · Linkpages, galeria, editor, publicação e analytics. P14–P16. | 7 e 9 | Criar rascunho privado e retomar; publicar, ler sem sessão, clicar e editar sem mudar a URL e o QR. Conferir visualizações, cliques e filtros com dados conhecidos. |
| 11 | R5 · Cards, galeria, publicação, vCard, troca de contato e métricas. P17–P19. | 7 e 9. Independente de 10. | Abrir cartão fora da sessão, conferir ações, importar vCard EN/AR e editar mantendo a URL. Testar consentimento e finalidade da troca de contato, escopo de contatos e métricas. Eventos e CRM seguem nos lotes 17 e 20 conforme o contrato. |
| 12 | R6 · Forms, templates, publicação, envio e exportação. P20. | 6 e 9 | Publicar formulário, responder sem conta, validar dados e abuso, impedir acesso por terceiros e conferir exportação das respostas. |
| 13 | R6 · Organizações, membros, papéis e convites. P22 e base de P29. | Lote 5 | Migrar contas existentes preservando propriedade. Testar troca de organização, matriz de papéis, entrada e revogação de membro, contas isoladas e convites em sandbox. Cobrir os módulos já integrados. |
| 14 | R3 · Fechar navegação e gestão restantes. P03–P07, tipos dependentes de P09 e mídia de P10. | 7, 9, 10, 11, 12 e 13 | Ligar QR Codes/Cards e atalhos reais de Analytics/Templates. Conectar os tipos QR aos módulos publicados. Exercitar busca por imagem, campos de proprietário e ciclo de vida e ações restantes da listagem na medida do contrato confirmado. Registrar as diferenças em estados sem referência. |
| 15 | R6 · Domínios e QR avançado. P23 e tipos baseados em regras de P09. | 6 e 13 | Exercitar edição de alias com continuidade da URL, senha, agenda/fuso, fallback e consentimento de localização. Testar verificação do domínio e TLS em domínio de teste autorizado quando disponível. **O número deste lote não corresponde à issue #15**, que trata de produção e segue adiada. |
| 16 | R6 · API pública e webhooks. P25. | 13 | Validar escopos, revogação, quotas, assinatura, repetição e reentrega controlada em receptor de teste. A conta ou chave de outro escopo não deve ler nem alterar o recurso. |
| 17 | R6 · Integrações de QR e Cards. P24 e CRM de P19. | 11, 13 e 16 | Especificar por conector o evento, o consentimento, o escopo, a deduplicação e a revogação. Comprovar os conectores suportados com conta de teste e tratar indisponibilidade sem perder dados. |
| 18 | R6 · IA, fontes, fila de revisão e geração assistida. P26; Auto Design, descrições e tipos de IA de P09, P10, P14 e P20. | 9, 10, 12 e 13 | Testar fontes e isolamento, limites e custo, rejeição e aprovação. Conteúdo gerado só segue para publicação pelo fluxo previsto. Provar a chamada real somente com provedor e credencial de teste autorizados. |
| 19 | R6 · Trial, planos, cobrança e permissões comerciais. P27 e P29. | 13 e 16; regras dos módulos que serão limitados | Testar cotas, adesão, mudança de plano, falhas, cancelamento, faturas e reprocessamento em sandbox. Preços, cobrança real e efeitos sobre conteúdo publicado exigem contrato de negócio explícito. |
| 20 | R6 · Conta, suporte, notificações e eventos. P28 e eventos de P19. | 11 e 13; 16 quando usar eventos de integração | Exercitar preferências persistidas, permissões e isolamento de notificações, rotas reais de ajuda e estados de eventos confirmados. Entrega externa de notificações e convites usa destinatários de teste autorizados. |

Esta fila cobre `P01` a `P29` como mapa de trabalho, incluindo itens já parciais. As observações da auditoria sobre um plano comercial, um botão ou um estado vazio sustentam somente o que foi observado. Quando uma decisão de produto impedir a conclusão, registre o contrato faltante, o motivo e o menor próximo passo. Implemente as partes verificáveis da mesma fatia quando puderem funcionar sozinhas. Registre como **parcial** qualquer item que ainda dependa de provedor, regra de negócio, evidência ou teste.

## Executar e fechar cada lote

1. **Mapear.** Atualize `origin/main`, registre o commit base e compare o roadmap, os tickets, o produto atual e a referência. Crie `feat/lote-NN-<slug>` e uma especificação curta em `docs/lotes/NN-<slug>/spec.md` com tickets, dependências, contrato, efeitos observáveis e evidências da referência. Use issues existentes quando houver vínculo. A documentação da Uniqode pode complementar os quadros arquivados. Se o trial pedir login ou um plano indisponível, registre a fonte consultada e quais estados ficaram sem comparação.
2. **Implementar e integrar.** Com subagentes, delegue primeiro a investigação da referência. Divida a implementação por contratos e arquivos, preferencialmente em worktrees isolados. Dê a outro agente a revisão de escopo e segurança, com revisão separada de código se houver capacidade. Somente o coordenador integra, grava migrations e publica. Sem subagentes, execute as mesmas passagens em sequência.
3. **Testar.** Faça os checks de credenciais e os mesmos comandos de aplicação do CI. Gere o build antes de `npm test`. Use dois usuários e, quando aplicável, organizações e papéis diferentes. Cubra o fluxo principal, rejeição, repetição, persistência e regressões afetadas. Para mudanças em dados, prove uma migração desde banco vazio e uma atualização a partir do esquema anterior com registros existentes. Rode `dvd-tests` se a skill estiver disponível ou use o Playwright no build local com o mesmo roteiro. Compare desktop e mobile, foco e teclado, EN/AR e RTL, estado vazio, com dados e falha quando aplicável. Guarde prints sanitizados com rotas, dimensões e estado da referência, ou registre quando aquela captura não estiver acessível no executor.
4. **Publicar.** Atualize `ROADMAPS.md` somente para os itens provados. Registre o status e os resultados na especificação. Revise o diff e faça um commit por lote ou por fatia verificável. Confirme que `origin/main` é ancestral do commit que passou nos checks e publique por avanço rápido com `git push origin HEAD:refs/heads/main`. Em caso de mudança concorrente, integre a nova base e repita os checks afetados antes do push. Preserve hooks e a política da plataforma. Cheque CI e o deploy do commit e verifique a URL pública e as rotas afetadas no nível autorizado. Se a publicação falhar, diagnostique e corrija antes de integrar dependências. Quando o código publicado causar regressão e uma correção imediata não for segura, reverta o commit de código sem reescrever histórico e revalide a versão. Preserve os dados e a migração compatível.
5. **Continuar.** Registre o último lote entregue, o commit, a URL, o que foi aprovado/testado e o próximo passo. Um lote bloqueado pode deixar uma fatia pronta em branch local, com patch e evidência exportáveis se o executor for descartável. Ao retomar, parta da `main` mais recente e confirme o estado já entregue. Entregue um único roteiro humano ao final, em ordem de dependências, com telas e efeitos verificáveis e ao menos uma recusa de acesso.

```sh
node scripts/check-secrets.mjs --history
git diff --check
npm run lint
npm run typecheck
npm run build
npm test
```

O [workflow de CI](../../.github/workflows/checks.yml) é a fonte para os checks vigentes. Use testes estáveis e independentes de credenciais comerciais. Diferencie **passou**, **falhou** e **bloqueado** e registre separadamente referência visual, verificação funcional automática e aceite humano.

## Homologação, dados e segurança

A origem conhecida é a [Vercel de homologação](https://yousef-xi.vercel.app/). O Neon pertence ao projeto `yousef-hml`. Sua branch chamada `production` é do ambiente de **homologação**. Confirme o projeto, o endpoint e a origem em cada publicação. Use a configuração privada já autorizada. Para DDL que precisa estar presente no deploy seguinte, aplique primeiro a migração revisada em conexão direta com TLS verificado no Neon de homologação. Comprove o registro da migração e a leitura pelo runtime. Use preferencialmente mudanças aditivas que deixem a versão anterior funcionando. Se a execução não tiver acesso ao Neon, integre somente uma fatia com compatibilidade comprovada com o esquema hospedado. Uma mudança que quebraria o deploy fica preparada com a etapa operacional exata pendente. Consulte o [procedimento operacional](../lotes/03-transicao-operacional/operacao.md).

Mantenha as seguintes proteções por fluxo:

- Derive conta, organização e permissões da sessão no servidor. Confira ownership em leitura, escrita, download, listas, exportações e jobs. Conserve RLS e `server-only` onde se aplicam, controle origem nas mutações e siga o padrão de respostas privadas sem cache.
- Valide payloads, destinos, uploads, slugs, tamanho e limites no servidor. Manipule nomes e conteúdo fornecidos pelo usuário como dados. Preserve integridade quando houver concorrência, repetição ou falha parcial. Dê retorno acionável sem detalhes privados. Teste revogação e troca de papéis quando afetadas.
- Permita destinos de callbacks apenas por política explícita e bloqueie destinos de rede privados durante resolução e redirecionamento. Use assinatura, expiração e proteção contra repetição para eventos externos. Verifique exportações CSV contra interpretação de fórmulas. Mantenha coleta e retenção proporcionais ao uso. Preserve credenciais, cookies, dados de clientes e arquivos de ambiente fora do Git.
- Use contas, uploads, domínios, pagamentos, caixas de e-mail e receptores sintéticos nos testes. Produção de cliente, recuperação hospedada adiada, alterações de DNS real, cobrança real, mensagens a terceiros e acesso ao legado ficam fora da autorização desta execução.
