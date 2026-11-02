# Roadmaps — QRConnect

Planejamento em 01/11/2026, baseado na análise do repositório `daviduartedev/pixel-perfect-clone` no commit `4458102` e nos dois vídeos enviados. Este documento organiza trabalho futuro; a aplicação ainda não foi migrada ou modificada.

Objetivo: preservar a identidade visual e os fluxos existentes, migrar para Next.js + Postgres, remover dependências da Lovable e substituir os serviços do Supabase. As correções apontadas no vídeo entram na primeira versão; os novos módulos da referência entram em entregas posteriores.

## Sequência de entregas

| Roadmap | Entrega | Prioridade | Depende de |
|---|---|---|---|
| R0 | Preparação, acesso aos dados e proteção do projeto | Imediata | — |
| R1 | Migração da base para Next.js + Postgres em homologação | Essencial | R0 |
| R2 | Correções do editor e primeira versão em produção | Essencial | R1 |
| R3 | Gestão de QR Codes e analytics | Alta | R2 |
| R4 | Linkpages publicadas | Evolução | R3 |
| R5 | Cartões digitais publicados | Evolução | R3 |
| R6 | Formulários, comercialização e recursos avançados | A definir | Base anterior e seleção de escopo |

R4 e R5 são independentes entre si. Sua ordem pode seguir a prioridade comercial. O planejamento não pressupõe a implementação de todas as opções visíveis na interface da Uniqode.

## R0 — Preparação e proteção do projeto

**Objetivo:** garantir os dados e definir exatamente qual versão será preservada.

- [ ] Comparar a versão gravada com o commit disponível e escolher uma referência visual. O vídeo mostra `Salvar Localmente`, enquanto o código analisado mostra um convite para cadastro.
- [ ] Registrar telas, rotas, estados, idiomas e comportamentos existentes para comparação posterior.
- [ ] Inventariar acesso ao banco, autenticação, arquivos, domínio, hospedagem e configuração dos serviços.
- [ ] Fazer backup dos dados e testar a restauração em ambiente separado. Migrations do Git não contêm os registros de produção.
- [ ] Verificar a possibilidade de exportar usuários e hashes de senha; definir preservação de credenciais ou fluxo de redefinição e nova autenticação.
- [ ] Inventariar QR Codes rastreáveis já distribuídos e definir a ponte para seus endereços antigos.
- [ ] Parar de versionar `.env`, adicionar regras de exclusão e manter `.env.example` com valores fictícios.
- [ ] Conferir as permissões efetivas de produção e, se a política pública de inserção de scans estiver ativa, substituí-la por gravação controlada pelo backend sem interromper o rastreamento legítimo.
- [ ] Rotacionar eventuais segredos privados identificados em outras fontes. A análise do Git encontrou uma chave pública `anon`, sem evidência de segredo administrativo nos padrões pesquisados.

**Conclusão:** backup restaurável, versão de referência registrada, acesso aos dados confirmado e estratégia definida para usuários e URLs antigas.

## R1 — Migração para Next.js + Postgres

**Objetivo:** executar o produto fora da Lovable com uma base própria em homologação.

- [ ] Preparar o projeto Next.js com TypeScript e execução de servidor para as APIs e o banco.
- [ ] Reaproveitar componentes, estilos, imagens, temas e traduções, preservando as rotas `/`, `/auth`, `/app`, `/my-qrcodes` e `/qr`.
- [ ] Adaptar navegação e componentes dependentes do navegador, incluindo QR, gráficos, tema e idioma.
- [ ] Preparar Postgres, migrations e acesso ao banco exclusivamente pelo servidor. Drizzle e Better Auth são a proposta inicial de implementação, sujeita à compatibilidade com os usuários existentes.
- [ ] Substituir cadastro, login, logout e sessões; aplicar autorização por usuário em todas as consultas e alterações.
- [ ] Adaptar as referências a `auth.users`, `auth.uid()` e demais dependências específicas do Supabase.
- [ ] Ensaiar a importação de usuários, QR Codes e scans, preservando IDs ou registrando um mapeamento completo. Identificar registros sem proprietário antes de atribuí-los.
- [ ] Reimplementar o registro de scans e o redirecionamento. Limitar abuso e impedir que falhas de geolocalização travem o acesso ao destino.
- [ ] Usar domínio próprio nos novos QR Codes rastreáveis e preparar a ponte dos endereços existentes.
- [ ] Remover `lovable-tagger`, configuração do Vite, metadados, imagens de compartilhamento e referências à Lovable na documentação.
- [ ] Substituir as integrações ativas do Supabase. A ponte para URLs antigas poderá permanecer como exceção documentada enquanto houver códigos distribuídos que dependam dela.
- [ ] Configurar implantação, variáveis de ambiente, backups e acompanhamento de falhas.

**Conclusão:** aplicação em homologação, com comparação visual feita, autenticação e isolamento entre contas funcionando, dados importados e redirecionamento validado. Os ajustes do editor seguem no R2 antes da primeira publicação desta sequência.

## R2 — Editor confiável e primeira publicação

**Objetivo:** resolver os principais problemas do segundo vídeo e publicar a base migrada.

- [ ] Compartilhar os controles de idioma entre os cabeçalhos e completar as traduções da landing, autenticação e editor.
- [ ] Preservar idioma e direção RTL ao navegar e recarregar.
- [ ] Criar caminhos claros de retorno e tratar a saída de edições não salvas.
- [ ] Definir uma configuração de design do QR que alimente template, preview, registro salvo e arquivo exportado.
- [ ] Corrigir diferenças de cores, gradientes, padrões, olhos e molduras entre miniaturas e preview.
- [ ] Incorporar logos e molduras no arquivo final, além da apresentação na tela.
- [ ] Persistir o design no banco e reabrir o editor com a configuração salva. QR Codes antigos sem dados de design exigirão um padrão de apresentação; não é possível recuperar aparência que nunca foi armazenada.
- [ ] Conectar os downloads PNG e SVG. Disponibilizar outros formatos apenas com exportação funcional.
- [ ] Verificar o comportamento dos controles `Update Later`, tracking e GPS. Implementar o comportamento definido ou retirar controles sem função da entrega.
- [ ] Validar os arquivos baixados com leitores reais de QR Code, incluindo exemplos com logo e moldura.
- [ ] Testar os fluxos essenciais de ponta a ponta e corrigir falhas relevantes nas verificações do projeto.
- [ ] Fazer a importação final com uma janela de escrita controlada ou sincronização definida; conferir diferenças após o ensaio.
- [ ] Publicar, validar links antigos e novos e acompanhar os primeiros eventos.
- [ ] Preparar retorno à versão anterior que considere também os dados gravados após a troca.

**Conclusão:** usuário escolhe um idioma, configura um QR, salva, reabre e baixa um arquivo fiel ao preview e legível. A aplicação funciona em produção com os dados preservados e estratégia de compatibilidade ativa.

## R3 — Gestão de QR Codes e analytics

**Objetivo:** transformar o gerador em uma área de gestão consistente.

- [ ] Introduzir menu lateral e navegação entre visão geral, QR Codes e estatísticas.
- [ ] Implementar o fluxo de criação em etapas: tipo, conteúdo, personalização e conclusão.
- [ ] Explicitar QR estático e dinâmico e implementar o conteúdo específico de cada tipo oferecido.
- [ ] Adicionar busca, filtros, paginação e ações de edição, ativação, desativação e exclusão.
- [ ] Permitir alterar o destino de um QR dinâmico preservando a URL pública.
- [ ] Implementar analytics por QR e visão consolidada, com filtro de período, dispositivos e localização aproximada disponível.
- [ ] Definir o significado de scanner único e o tratamento de bots e acessos repetidos antes de apresentar essa métrica.
- [ ] Agregar estatísticas no servidor, controlar duplicações de eventos e acrescentar exportação dos dados definidos para a entrega.

**Conclusão:** usuário encontra e gerencia os próprios QR Codes e consulta métricas verificáveis; alterações de destino não exigem reimpressão de códigos dinâmicos.

## R4 — Linkpages

**Objetivo:** criar e publicar páginas de links dentro do produto.

- [ ] Criar modelo de dados para páginas, blocos, design, propriedade e arquivos.
- [ ] Construir editor com foto, capa, título, descrição, links, telefone, redes sociais e separadores.
- [ ] Permitir ordenar, editar e remover blocos com preview de celular.
- [ ] Salvar rascunho e publicar em uma URL estável, com slug único.
- [ ] Gerar QR para a página e permitir alterações posteriores sem mudar seu endereço.
- [ ] Registrar visualizações e cliques conforme métricas definidas.
- [ ] Integrar listagem e analytics ao dashboard.

**Conclusão:** página publicada permanece acessível e conserva conteúdo e aparência após recarregar, sair da conta ou acessar outro dispositivo.

## R5 — Cartões digitais

**Objetivo:** levar o editor de cartões atual até um recurso publicado e persistido.

- [ ] Persistir perfil, foto, empresa, cargo, contatos, redes sociais e design.
- [ ] Implementar armazenamento dos arquivos enviados e biblioteca de templates.
- [ ] Publicar o cartão em URL própria e gerar seu QR Code.
- [ ] Oferecer ações funcionais de telefone, e-mail, site e redes sociais.
- [ ] Implementar download do contato em vCard, com suporte aos caracteres dos idiomas oferecidos.
- [ ] Permitir reabrir e editar o cartão sem mudar seu endereço público.
- [ ] Registrar visualizações e ações de contato definidas para a entrega.
- [ ] Integrar cartões e estatísticas ao dashboard.

**Conclusão:** cartão editável, publicado, compartilhável e persistido, com ações e arquivo de contato validados em celular.

## R6 — Formulários, monetização e recursos avançados

**Objetivo:** ampliar o produto conforme prioridade comercial e especificação de cada módulo.

Este roadmap é um conjunto de opções a selecionar e estimar. A presença dessas opções nos vídeos não estabelece o escopo de uma entrega única.

| Opção | Definições necessárias antes de implementar |
|---|---|
| Formulários e captura de leads | Tipos de campo, validação, destino das respostas e exportação. |
| Planos e cobrança | Produtos, preços, limites, provedor de pagamento, cancelamento e efeitos sobre recursos publicados. |
| Domínios personalizados | Propriedade do domínio, configuração, certificados e encaminhamento. |
| QR protegido, agendado ou com GPS | Fluxo público, permissões, regras de expiração e comportamento de fallback. |
| PDF/EPS e exportações adicionais | Renderização, qualidade, fontes e compatibilidade dos arquivos. |
| Integrações | Serviços prioritários, eventos, credenciais, reenvios e tratamento de falhas. |
| Equipes, organizações e API pública | Papéis, isolamento de dados, quotas e auditoria. |
| IA | Problema atendido, qualidade esperada, custos e limites de uso. |

**Conclusão por módulo:** regras especificadas, fluxo funcionando de ponta a ponta e operação validada para a funcionalidade escolhida.

## Decisões que determinam a execução

1. **Versão visual:** confirmar qual estado apresentado deve prevalecer quando vídeo e repositório divergem.
2. **Usuários existentes:** verificar exportação e compatibilidade dos hashes; definir tratamento de sessões e credenciais.
3. **Códigos já distribuídos:** manter a ponte no endereço Supabase ou substituir os códigos. Desligar esse endereço interrompe os QR Codes que o contêm.
4. **Expansão do produto:** escolher a prioridade entre linkpages e cartões e quais opções do R6 entram no produto.

Essas decisões não impedem iniciar o inventário, os registros visuais e a preparação local. A migração dos dados de produção e a retirada dos serviços antigos dependem das estratégias correspondentes.

## Prazo

A estimativa anterior de 8–15 dias úteis dizia respeito à migração das funcionalidades implementadas. Ela não cobre automaticamente as correções e todos os módulos destes roadmaps. O cronograma deve ser consolidado após o R0, separando migração, correções e evolução do produto.

Referência: [análise dos vídeos](docs/referencias/analise-dos-videos.md).
