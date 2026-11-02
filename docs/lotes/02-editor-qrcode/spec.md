# Lote 2 — Editor confiável, design persistido e exportação fiel

Branch: `feat/lote-2-editor-qrcode`, criada de `main` sincronizada em `33a3c0f48a85e7ed435ce419819fa466fef4436c` em 02/11/2026. Escopo: correções do editor do R2. Referência visual: interface integrada no Lote 1 e análise dos vídeos; não redesenhar o produto.

## Problem Statement

O usuário encontra controles de idioma diferentes entre páginas, textos sem tradução e caminhos de retorno incompletos. Ao personalizar um QR, o template pode perder gradientes, o preview usa logos e molduras externos e o seletor de download não entrega o arquivo. A listagem não reabre a aparência escolhida, pois o design nunca foi armazenado. Controles sem efeito criam expectativas de GPS, edição futura e formatos ainda não implementados.

## Solution

Preservar as telas e tornar confiável o caminho escolher idioma → configurar QR → conferir preview → salvar → reabrir → baixar PNG/SVG. Uma configuração versionada de design deve alimentar miniaturas, preview, registro salvo e arquivo final, incluindo logos e molduras. A navegação deve oferecer retorno claro e proteger alterações não salvas. O tracking existente deve continuar explícito e funcional. Controles sem suporte devem sair desta entrega.

## User Stories

1. Como visitante, quero selecionar inglês ou árabe na landing para ler a apresentação no idioma escolhido.
2. Como visitante, quero encontrar o mesmo seletor na autenticação para manter a preferência ao entrar.
3. Como usuário, quero manter idioma e direção após navegar e recarregar para não precisar reconfigurá-los.
4. Como usuário de árabe, quero layout RTL, rótulos e ações coerentes para usar os mesmos fluxos.
5. Como usuário, quero conservar temas, cores, componentes e composição da interface já aprovada.
6. Como usuário, quero voltar da autenticação à landing e da listagem ao gerador sem depender de um histórico anterior.
7. Como usuário, quero receber um aviso ao abandonar uma edição não salva para escolher entre continuar e descartar.
8. Como usuário, quero cancelar a saída e encontrar minha edição intacta.
9. Como usuário, quero escolher um template e ver suas cores, gradientes, padrões, olhos e moldura completos no preview.
10. Como usuário, quero personalizar padrão, cores e olhos sem perder opções não alteradas do template.
11. Como usuário, quero escolher ou remover um logo existente e encontrá-lo no arquivo exportado.
12. Como usuário, quero escolher ou remover uma moldura e encontrar a mesma composição no arquivo exportado.
13. Como usuário, quero baixar um PNG real que corresponda ao preview.
14. Como usuário, quero baixar um SVG independente que incorpore logos e molduras sem exigir recursos externos.
15. Como usuário, quero ver apenas formatos que possam ser baixados com sucesso.
16. Como usuário, quero receber uma mensagem clara se o conteúdo ou a configuração impedir gerar ou baixar o QR.
17. Como usuário, quero que o QR baixado contenha o destino configurado e possa ser lido por leitores de QR.
18. Como usuário, quero gerar um QR sem tracking que codifique diretamente o destino informado.
19. Como usuário, quero gerar um QR com tracking que codifique a URL pública do próprio serviço.
20. Como usuário, quero saber quando uma mudança de conteúdo exige gerar novamente, para não baixar um destino anterior por engano.
21. Como usuário autenticado, quero salvar o design e a escolha de tracking associados ao meu QR.
22. Como usuário autenticado, quero encontrar meus códigos na listagem com a aparência salva.
23. Como usuário autenticado, quero reabrir um código para alterar e salvar seu design sem criar outro registro.
24. Como usuário autenticado, quero preservar ID, short code, URL pública e scans de um código ao atualizar sua aparência.
25. Como usuário, quero que códigos antigos sem design usem um padrão documentado, sem alegar recuperar uma aparência histórica inexistente.
26. Como proprietário de uma conta, quero que outra conta não possa consultar ou modificar meus designs.
27. Como usuário, quero que um erro ao salvar preserve minha edição para poder tentar novamente.
28. Como usuário, quero baixar pela listagem o mesmo design apresentado no editor.
29. Como usuário, quero que GPS e Update Later não apareçam como funcionalidades operantes nesta entrega.
30. Como responsável pela publicação, quero conhecer as etapas de migração, compatibilidade e retorno que ainda dependem dos dados e serviços reais.

## Implementation Decisions

- Manter o App Router, Better Auth, Drizzle e Postgres, as fronteiras server-only, origem validada e autorização baseada na sessão. Não importar histórico ou ambientes do clone antigo.
- Manter inglês e árabe como idiomas oferecidos. Completar textos da landing, autenticação, editor e caminhos da listagem usados neste fluxo, incluindo mensagens, acessibilidade e estados de erro. Compartilhar o seletor existente e a preferência de idioma; não alterar a identidade visual.
- Acrescentar caminhos explícitos de retorno utilizáveis em desktop e celular. Proteger saída de alterações não salvas por links internos, ações de navegação/saída do editor e fechamento/recarregamento; cancelar mantém o rascunho, descartar permite sair, salvar bem-sucedido limpa o estado pendente. Na navegação pelo histórico, impedir perda silenciosa do rascunho.
- Usar um objeto de design versionado e validado, com template, padrões, cores/gradientes, olhos, fundo, logo e moldura. O template inicializa esse objeto integralmente; mudanças manuais alteram apenas as opções correspondentes. A visualização e a exportação compartilham a mesma composição.
- Conservar a intenção visual dos padrões especiais já existentes, inclusive diamantes e elipses. Corrigir perdas de propriedades e problemas de leitura comprovados, sem tratar a biblioteca externa como nova referência visual.
- Incorporar logos do catálogo existente, com tamanho e área de proteção limitados e correção de erros adequada. Não aceitar marcação SVG arbitrária ou buscar imagens remotas fornecidas pelo usuário. Retirar o botão de upload sem função; upload de logos próprios fica para uma entrega específica.
- Implementar moldura sem moldura e opções coerentes com os templates existentes, incluindo borda e legenda. Toda decoração deve integrar o SVG final, respeitando a margem livre e sem cortar módulos do QR. Texto deve ser escapado e limitado.
- Exportar PNG e SVG usando o mesmo estado e destino do preview, com resultado independente de recursos de rede. Remover PDF/EPS do seletor enquanto não houver exportação real. Bloquear exportação vazia, inválida ou de um destino desatualizado; informar falhas ao usuário e preservar a edição.
- Usar margem livre de QR, configuração de correção de erros e tamanho exportado adequados para leitura, incluindo combinações com logo e moldura. Não prometer que qualquer combinação arbitrária de cores é legível; validar os templates oferecidos e avisar/bloquear configurações inválidas reconhecíveis.
- Evoluir o armazenamento de modo aditivo, com design versionado opcional e indicação de tracking. Registros legados sem design continuam rastreáveis e recebem apresentação Classic preto sobre branco sem logo ou moldura. Não reescrever short codes nem simular recuperação histórica.
- Oferecer salvar/reabrir design tanto para QR direto quanto rastreável. QR direto exporta o destino HTTP/HTTPS; QR rastreável exporta a URL pública do serviço. Persistir essa escolha e retomá-la ao reabrir. Gerar e salvar não podem criar duplicações acidentais do mesmo registro em edição.
- A reabertura permite atualizar o design do registro próprio, mantendo conteúdo/destino, tipo, modo, short code e estatísticas. Alteração de destino e gestão avançada pertencem ao R3. A interface deve deixar essa restrição clara ao editar um registro existente.
- Estender as operações HTTP autenticadas para recuperar e atualizar o design de um registro próprio. Validar esquema, limites e valores no servidor; rejeitar ownership forjado, IDs de terceiros, versões ou propriedades inválidas. Erros não devem expor detalhes privados.
- Integrar miniaturas e download da listagem ao mesmo design/renderização do editor. Acrescentar somente a ação de reabrir necessária a esse fluxo; não introduzir dashboard, filtros ou nova gestão de QR.
- Retirar Update Later e GPS, cujos comportamentos não estão implementados. Manter tracking real de scans; localização aproximada disponível no servidor não equivale a GPS do aparelho.
- Atualizar documentação operacional com pré-condições, ensaio de migração aditiva e retorno compatível com dados gravados. Execução em produção, novo Supabase, importação real e ponte no serviço antigo permanecem pendentes de acesso e preparação; não marcar esses itens do R2 como concluídos por validar o editor localmente.
- Preservar instalações locais de skills e o arquivo de lock, hooks e checks de credenciais. Commit, push, PR, merge e publicação aguardam a validação humana aplicável; esta implementação não os executa.

## Testing Decisions

- Pontos aprovados pelo usuário em 02/11/2026: APIs HTTP existentes e navegador/arquivos baixados. Testar comportamento observável, sem mocks de colaboradores internos, consultas diretas ao banco para validar comportamento ou testes permanentes dos detalhes do renderizador.
- Expandir os testes HTTP existentes para salvar/ler/alterar design, compatibilidade de registros sem design, modos direto/rastreável, estabilidade de identidade e isolamento entre contas. Incluir payload inválido e origem indevida nas novas operações. Usar somente banco descartável local e credenciais sintéticas em memória.
- Aplicar TDD em fatias: um comportamento falha no ponto aprovado, implementar o mínimo para passar e seguir ao próximo. Não escrever uma suíte imaginada inteira antes da implementação.
- Guiar o navegador local para idioma, recarga, RTL, geração, escolha de template/logo/moldura, download PNG/SVG, salvar, reabrir e alterar design, saída cancelada/confirmada e entrada inválida. Usar scripts temporários, sem adicionar teste E2E permanente.
- Observar arquivos baixados com um decodificador independente e comparar o destino esperado, inclusive logo/moldura e templates representativos. Verificar composição exportada versus preview sem usar o próprio renderizador como oráculo do resultado. Resultados automáticos não substituem a câmera real.
- Reutilizar a suíte de Git/CLI para preservar a proteção de credenciais. Rodar typecheck e testes pertinentes durante as fatias; lint, build, checks de credenciais e suíte completa ao final.
- A revisão avalia Standards e Spec separadamente contra a base desta branch e inclui mudanças ainda não commitadas. Depois, dvd-tests deixa servidor saudável e checklist humana desmarcada, incluindo leitura real em celular e um cenário negativo.

## Out of Scope

- R3 e posteriores: dashboard, criação em etapas, filtros, paginação, ativação/desativação, alteração de destino de QR dinâmico, analytics novos, linkpages/cartões publicados, formulários, cobrança, integrações e IA.
- Novos tipos de conteúdo além dos fluxos implementados. Abas herdadas não significam módulos publicados novos.
- Upload/armazenamento de logos próprios, imagens arbitrárias remotas, novos formatos de arquivo e novas línguas.
- Recuperar design histórico inexistente, trocar URLs impressas, importar dados reais ou desligar o Supabase antigo.
- Publicar em produção sem concluir as pendências de acesso/dados e a validação humana.
- Commit, push, abertura de PR e merge antes da validação do lote.

## Further Notes

O R2 completo também inclui importação final, publicação e compatibilidade em produção. O novo Supabase não foi configurado, os dados reais não foram fornecidos e o serviço antigo não foi alterado. Esta entrega torna o editor verificável localmente e documenta os passos restantes; não declara esses marcos operacionais concluídos.

As interpretações incertas do áudio não introduzem novos requisitos. O visual integrado no Lote 1 continua sendo a referência. A especificação pai do Lote 1 permanece aberta e não será modificada; os novos tickets pertencem a uma especificação própria do Lote 2.
