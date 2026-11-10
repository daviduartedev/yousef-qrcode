# Roadmaps — QRConnect

Planejamento original de 01/11/2026, reconciliado em 02/11/2026 com o código integrado e o GitHub. Base verificada: `main` e `origin/main` em `ba13e603d208ab0296030739ee18a7ff9daecb5e`, árvore limpa antes da abertura da branch do próximo lote. O PR #5 (Lote 1) está integrado; o PR #10 (Lote 2) está MERGED e seus tickets #7–#9 estão fechados. As especificações pai #1 e #6 permanecem abertas intencionalmente.

Os Lotes 1 e 2 tiveram validação humana local concluída. Os itens marcados abaixo representam essas entregas, sem declarar homologação externa ou produção concluídas. Procedimento documentado não equivale a operação executada. A referência visual é a interface integrada nesses lotes; não há nova escolha visual pendente.

Objetivo: preservar identidade visual e fluxos, migrar o aplicativo para Next.js + Postgres, remover dependências da Lovable e usar Better Auth com Postgres hospedado no novo Supabase. As correções do editor já foram entregues; novos módulos da referência continuam futuros.

**Decisão posterior em 02/11/2026:** o proprietário confirmou começar do zero, sem importar usuários, QR Codes ou histórico, aceitando que QRs dependentes do serviço antigo parem quando ele for desligado. Migração de dados, compatibilidade antiga e ponte foram dispensadas, não executadas. Novo ambiente, recuperação, homologação, publicação e retorno continuam pendentes. Esta decisão não apaga nem desliga a origem automaticamente.

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

| Etapa | Estado verificado em 02/11/2026 |
|---|---|
| R0 | Proteções/referência visual estabelecidas; inventário e recuperação do novo ambiente pendentes; legado dispensado. |
| R1 | Base Next.js + Postgres entregue localmente; homologação externa e operação pendentes; sem importação antiga. |
| R2 | Editor entregue/validado; publicação e retorno operacional pendentes; ponte antiga dispensada. |
| R3 | Não iniciado como lote próprio; CRUD/tracking básicos da base não concluem gestão e analytics. |
| R4–R5 | Módulos publicados/persistidos ainda não entregues; abas/editor local herdados não os substituem. |
| R6 | Opções futuras que exigem seleção e especificação. |

O próximo trabalho é o **Lote 3 — publicação inicial com banco novo**, fechando a operação de R0–R2, não o roadmap R3. Ver [especificação](docs/lotes/03-transicao-operacional/spec.md), [fatias](docs/lotes/03-transicao-operacional/README.md) e [acessos e decisões](docs/lotes/03-transicao-operacional/acessos-e-decisoes.md). Não iniciar R3 ou módulos posteriores automaticamente.

## R0 — Preparação e proteção do projeto

**Objetivo:** garantir os dados e definir exatamente qual versão será preservada.

- [x] Comparar gravações e código e estabelecer a interface integrada nos Lotes 1 e 2 como referência visual. A diferença de `Salvar Localmente` está registrada na análise dos vídeos.
- [x] Registrar rotas, idiomas, estados e comportamentos dos fluxos entregues nas especificações, README e evidências dos Lotes 1 e 2; não repetir sua validação local.
- [ ] Inventariar banco novo, autenticação Better Auth, domínio, hospedagem e configuração privada; acesso à origem não é bloqueador.
- [ ] Definir backups do novo banco e testar restauração em ambiente separado com dados sintéticos. Migrations não contêm os futuros registros de produção.
- Não aplicável por decisão de início do zero: exportação de usuários/hashes e compatibilidade de credenciais antigas.
- Não aplicável por decisão de início do zero: inventário/ponte dos QRs antigos; sua continuidade foi dispensada.
- [x] No novo repositório, excluir ambientes, manter exemplo fictício e aplicar hooks/checks de credenciais sem importar o histórico antigo. Isso não comprova rotação ou limpeza dos serviços de origem.
- [ ] Conferir permissões efetivas no novo ambiente de produção e gravação de scans controlada pelo backend; não copiar políticas públicas de inserção do legado.
- [ ] Configurar credenciais novas privadamente e verificar necessidade de rotação caso haja exposição comprovada. Segredos antigos não são reutilizados nem divulgados; nenhuma exposição privada foi comprovada nesta preparação.

**Conclusão vigente:** novo ambiente inventariado e recuperável, referência preservada, novas contas no fluxo existente e dispensa do legado registrada. Recuperação ainda precisa ser comprovada.

## R1 — Migração para Next.js + Postgres

**Objetivo:** executar o produto fora da Lovable com uma base própria em homologação.

- [x] Preparar o projeto Next.js com TypeScript e execução de servidor para as APIs e o banco.
- [x] Reaproveitar componentes, estilos, imagens, temas e traduções, preservando as rotas `/`, `/auth`, `/app`, `/my-qrcodes` e `/qr`.
- [x] Adaptar navegação e componentes dependentes do navegador, incluindo QR, gráficos, tema e idioma.
- [x] Preparar Postgres local, migrations e acesso exclusivamente pelo servidor com Drizzle e Better Auth. Supabase hospedará Postgres; contas antigas não serão migradas.
- [x] Substituir cadastro, login, logout e sessões; aplicar autorização por usuário em todas as consultas e alterações.
- [x] Adaptar no novo código as referências a `auth.users`, `auth.uid()` e demais dependências específicas do Supabase.
- Não aplicável por início do zero: importação de usuários, QRs, scans e mapeamento de IDs antigos.
- [x] Reimplementar o registro de scans e o redirecionamento. Limitar abuso e impedir que falhas de geolocalização travem o acesso ao destino.
- [ ] Usar domínio definitivo nos novos QR Codes rastreáveis; ponte antiga dispensada.
- [x] Remover do novo aplicativo `lovable-tagger`, Vite e metadados/ativos da Lovable; documentação conserva somente o contexto histórico necessário.
- [x] Substituir no novo aplicativo integrações de navegador/auth do Supabase por APIs próprias e Postgres no servidor. Ponte dispensada; serviço original não foi alterado.
- [ ] Configurar implantação, variáveis de ambiente, backups e acompanhamento de falhas.

**Conclusão vigente:** aplicação em homologação com novas contas isoladas, banco novo e redirecionamento validados. Comparação visual e editor já foram aceitos localmente; sem importação de legado.

## R2 — Editor confiável e primeira publicação

**Objetivo:** resolver os principais problemas do segundo vídeo e publicar a base migrada.

- [x] Compartilhar os controles de idioma entre os cabeçalhos e completar inglês/árabe na landing, autenticação e editor.
- [x] Preservar idioma e direção RTL ao navegar e recarregar.
- [x] Criar caminhos claros de retorno e tratar a saída de edições não salvas, com os limites de rascunho documentados.
- [x] Definir uma configuração de design do QR que alimente template, preview, registro salvo e arquivo exportado.
- [x] Corrigir diferenças de cores, gradientes, padrões, olhos e molduras entre miniaturas e preview.
- [x] Incorporar logos do catálogo e molduras no arquivo final, além da apresentação na tela.
- [x] Persistir o design e reabrir o editor. Registros antigos sem design usam Classic; a aparência nunca armazenada não é recuperável.
- [x] Conectar PNG/SVG e retirar formatos sem exportação funcional.
- [x] Manter tracking funcional e retirar `Update Later` e GPS sem implementação.
- [x] Concluir a validação dos arquivos e leitura de QR do Lote 2, incluindo logo/moldura, coberta pela confirmação humana e evidências do PR #10. Leitura em homologação/produção será uma verificação operacional distinta.
- [x] Testar os fluxos essenciais locais de ponta a ponta e corrigir falhas relevantes; Lotes 1 e 2 já validados e integrados.
- Não aplicável por início do zero: importação final/delta e sincronização com a origem antiga.
- [ ] Publicar no destino novo, validar novas contas/QRs e acompanhar eventos; URLs antigas não são critério de aceite.
- [x] Documentar o procedimento de retorno compatível com design/tracking e gravações posteriores à troca.
- [ ] Ensaiar e comprovar esse retorno no ambiente operacional, sem perder gravações novas.

**Conclusão vigente:** fluxo do editor já validado localmente e operação em produção no novo banco comprovada, preservando dados criados no novo ambiente e com retorno ensaiado. Compatibilidade antiga foi dispensada.

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

1. **Versão visual — resolvida:** preservar a interface integrada e validada nos Lotes 1 e 2; análise dos vídeos e evidências são as referências.
2. **Usuários existentes — resolvida:** início do zero; sem importação, compatibilidade de hashes ou sessões antigas. Novas contas pelo cadastro existente.
3. **Códigos distribuídos — resolvida:** ponte/continuidade dispensadas. O proprietário aceita que QRs dependentes do endereço antigo parem quando ele for desligado; não houve desligamento automático.
4. **Expansão do produto:** escolher a prioridade entre linkpages e cartões e quais opções do R6 entram no produto.

As pendências vigentes são do novo ambiente: Postgres, hospedagem, domínio, recuperação, homologação, observabilidade e retorno. Diferenças de dados/políticas do legado deixaram de bloquear a entrega; não representam trabalho concluído. O registro do Lote 3 detalha acessos/decisões sem credenciais. Retirada ou exclusão do serviço antigo não faz parte desta preparação.

## Prazo

A estimativa anterior de 8–15 dias úteis dizia respeito à migração das funcionalidades implementadas. Ela não cobre automaticamente as correções e todos os módulos destes roadmaps. O cronograma deve ser consolidado após o R0, separando migração, correções e evolução do produto.

Referência: [análise dos vídeos](docs/referencias/analise-dos-videos.md).
