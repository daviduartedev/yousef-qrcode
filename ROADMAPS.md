# Roadmaps — QRConnect

Planejamento original de 01/11/2026, com estado atualizado em 15/11/2026 (Lote 6 incluído). Os PRs #5 e #10 entregaram a base e o editor. Os PRs #16 e #17 integraram o preparo operacional, o Neon e a correção de build para a Vercel. O [PR #25](https://github.com/daviduartedev/yousef-qrcode/pull/25) integrou o Lote 4 validado (#19–#24). As especificações pai #1 e #6 permanecem abertas intencionalmente.

Os Lotes 1 e 2 tiveram validação humana local. A [homologação](https://yousef-xi.vercel.app/) recebeu aceite do proprietário em 11/11/2026 com base nos testes hospedados de cadastro, login, isolamento, logout e tracking. O proprietário dispensou a rodada manual hospedada de reabertura do design, PNG/SVG e leitura no celular.

O produto usa Next.js, Better Auth e PostgreSQL. A homologação usa Vercel e Neon. O cliente ainda definirá a infraestrutura de produção. As correções do editor já foram entregues e os novos módulos da referência Uniqode continuam futuros.

O [roteiro de execução na nuvem](docs/agents/execucao-roadmap-cloud.md) resume a base entregue e ordena os próximos lotes por dependência, com critérios de teste e publicação em homologação.

Em 02/11/2026, o proprietário confirmou o início do zero, sem importar usuários, QR Codes ou histórico, e dispensou a ponte de URLs antigas. O serviço de origem tem operação separada. Em 11/11/2026, a recuperação hospedada continua adiada e a publicação e o retorno seguem pendentes.

## Sequência de entregas

| Roadmap | Entrega | Prioridade | Depende de |
|---|---|---|---|
| R0 | Preparação, acesso aos dados e proteção do projeto | Imediata | — |
| R1 | Migração da base para Next.js + Postgres em homologação | Essencial | R0 |
| R2 | Editor, paridade do site público e da entrada, primeira versão em produção | Essencial | R1 |
| R3 | Paridade da gestão, criação e analytics de QR Codes | Alta | Editor do R2 e homologação aceitos para iniciar o painel |
| R4 | Linkpages publicadas | Evolução | R3 |
| R5 | Cartões digitais publicados | Evolução | R3 |
| R6 | Formulários, biblioteca, equipe, extensões e operação comercial | Em ondas | Dependências por módulo |

R4 e R5 são independentes entre si. A ordem pode seguir a prioridade comercial. A meta atual é reproduzir as telas e os fluxos da Uniqode com a identidade do QRConnect. A [auditoria do trial](docs/referencias/auditoria-paridade-uniqode.md) registra a evidência, as lacunas e os pontos a verificar antes de detalhar cada lote.

| Etapa | Estado em 15/11/2026 |
|---|---|
| R0 | Banco de homologação provisionado e recuperação local aceita. Backup, retenção e restauração hospedada adiados no #12. |
| R1 | Homologação Vercel + Neon aceita no #13 com evidência HTTP e dispensa da rodada manual. |
| R2 | Editor entregue/validado; publicação e retorno operacional pendentes; ponte antiga dispensada. |
| R3 | Painel e gestão inicial do Lote 4 (#19–#24) aceitos e integrados. O [Lote 5](docs/lotes/05-gestao-avancada/spec.md) entregou navegação e gestão avançada na `main` em `f0c6f61`. CI e deploy na Vercel passaram, com a migração `0004` verificada no Neon de homologação. O [Lote 6](docs/lotes/06-criacao-e-detalhe/spec.md) entrega o assistente de criação, os tipos estáticos independentes, o download configurável e a troca de destino com histórico. |
| R4–R5 | Módulos publicados/persistidos ainda não entregues; abas/editor local herdados não os substituem. |
| R6 | Superfícies principais mapeadas no trial. Regras e fluxos restritos a planos superiores precisam de evidência própria. |

Os Lotes 4 e 5 estão em homologação na Vercel e no Neon. Ver [especificação validada do painel e da gestão](docs/referencias/r3-painel-e-gestao.md). A primeira publicação em produção e o ensaio de retorno do [#15](https://github.com/daviduartedev/yousef-qrcode/issues/15) ficam adiados. O [#12](https://github.com/daviduartedev/yousef-qrcode/issues/12) permanece aberto. Antes de publicar em produção, confirmar ambiente, operador, origem HTTPS, retorno, observação e critérios para liberar, além de decidir como tratar a recuperação adiada. Ver [acessos e decisões](docs/lotes/03-transicao-operacional/acessos-e-decisoes.md).

## Ordem do trabalho de paridade

| Ordem | Fatia | Aceite observável | Dependência |
|---|---|---|---|
| 1 | R3 · Navegação e gestão | Visão geral e lista comparadas em vazio e com dados. Gaveta mobile, busca, visualizações, ordenação, filtros, pastas e operações em lote com efeitos verificáveis. | Lote 4 aceito em 15/11/2026 |
| 2 | R3 · Criação e detalhe | Seleção, configuração, personalização, conclusão e download. O QR estático lê o conteúdo e o dinâmico conserva a URL ao trocar o destino. | Gestão, regras por tipo e editor existentes |
| 3 | R3 · Analytics | Métricas de QR e visão consolidada com período, granularidade, filtros e exportação que conferem com os eventos de teste. | QR rastreável, eventos e regras de contagem |
| 4 | R4 e R5 · Páginas e cartões | Galerias, editores, rascunhos, publicação, leitura pública e métricas. Produto Cards tem navegação e contatos próprios. | Biblioteca básica de arquivos, quando exigida |
| 5 | R6 · Formulários e extensões | Editor e respostas públicas; biblioteca, equipes, domínios, integrações, API, Webhooks e IA em lotes independentes. | Contratos de cada módulo; equipes antes de papéis e chaves por organização |
| 6 | R6 · Planos e operação comercial | Trial, limites, permissões, assinatura e faturamento demonstrados em sandbox. | Regras dos módulos e evidência dos fluxos bloqueados |

A paridade do site público e da entrada do R2 pode avançar em paralelo à gestão. Cada fatia compara os mesmos cenários nos dois produtos e testa o efeito das ações, além da aparência.

### Tickets propostos para a etapa 2

Os tickets 2.1–2.7 compõem o [Lote 5](docs/lotes/05-gestao-avancada/spec.md), sobre a `main` atualizada com o Lote 4. O proprietário autorizou a integração direta após a entrega dos testes e do comparativo. A homologação usa a Vercel e o Neon já configurados.

| Ticket proposto | Entrega verificável | Dependência |
|---|---|---|
| 2.1 | Navegação da gestão em desktop e gaveta no celular, com foco, seleção e retorno consistentes | Lote 4 validado |
| 2.2 | Busca global por texto com resultados de QR por nome e destino, navegável por teclado | Lote 4 validado |
| 2.3 | Visualizações e ordenação da lista preservadas na URL, com estados vazio e preenchido | Lote 4 validado |
| 2.4 | Filtros por operador para campos existentes, combinados com ordenação e paginação | 2.3 |
| 2.5 | Pastas, rótulos e lista de acompanhamento, com controles e filtros persistidos por conta | 2.4 |
| 2.6 | Seleção múltipla, download e aplicação de rótulos em lote, com retorno por registro quando houver falhas | 2.5 |
| 2.7 | Importação em lote com prévia, validação por linha e resumo de resultados | 2.6 e contrato dos tipos aceitos |

A busca por imagem de QR, os filtros por ciclo de vida e proprietário e os atalhos para Analytics e Templates dependem de verificação do fluxo de referência ou de módulos que ainda serão entregues. Ver [auditoria do trial](docs/referencias/auditoria-paridade-uniqode.md).

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

**Estado da entrega:** a recuperação foi ensaiada com dados locais descartáveis. A comprovação hospedada, a retenção e as decisões de produção seguem nos tickets operacionais.

## R1 — Migração para Next.js + Postgres

**Objetivo:** executar o produto fora da Lovable com uma base própria em homologação.

- [x] Preparar o projeto Next.js com TypeScript e execução de servidor para as APIs e o banco.
- [x] Reaproveitar componentes, estilos, imagens, temas e traduções, preservando as rotas `/`, `/auth`, `/app`, `/my-qrcodes` e `/qr`.
- [x] Adaptar navegação e componentes dependentes do navegador, incluindo QR, gráficos, tema e idioma.
- [x] Preparar Postgres local e Neon em homologação, com migrations e acesso pelo servidor usando Drizzle e Better Auth.
- [x] Substituir cadastro, login, logout e sessões; aplicar autorização por usuário em todas as consultas e alterações.
- [x] Adaptar no novo código as referências a `auth.users`, `auth.uid()` e demais dependências específicas do Supabase.
- Não aplicável por início do zero: importação de usuários, QRs, scans e mapeamento de IDs antigos.
- [x] Reimplementar o registro de scans e o redirecionamento. Limitar abuso e impedir que falhas de geolocalização travem o acesso ao destino.
- [ ] Usar domínio definitivo nos novos QR Codes rastreáveis; ponte antiga dispensada.
- [x] Remover do novo aplicativo `lovable-tagger`, Vite e metadados/ativos da Lovable; documentação conserva somente o contexto histórico necessário.
- [x] Substituir no novo aplicativo integrações de navegador/auth do Supabase por APIs próprias e Postgres no servidor. Ponte dispensada; serviço original não foi alterado.
- [x] Implantar a homologação com origem HTTPS, configuração privada e banco Neon.
- [ ] Definir backups e acompanhamento de falhas para a operação de produção.

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
- [ ] Comparar a experiência pública e as rotas de entrada da Uniqode em desktop e celular, incluindo CTA, cadastro, login, recuperação e estados de erro.
- Não aplicável por início do zero: importação final/delta e sincronização com a origem antiga.
- [ ] Publicar no destino novo, validar novas contas/QRs e acompanhar eventos; URLs antigas não são critério de aceite.
- [x] Documentar o procedimento de retorno compatível com design/tracking e gravações posteriores à troca.
- [ ] Ensaiar e comprovar esse retorno no ambiente operacional, sem perder gravações novas.

**Estado da entrega:** editor validado localmente e base em homologação. A paridade do site público e da entrada segue na fila. A publicação em produção e o ensaio de retorno seguem no #15.

## R3 — Gestão de QR Codes e analytics

**Objetivo:** transformar o gerador em uma área de gestão consistente.

- [x] Introduzir menu lateral e navegação entre visão geral, QR Codes e estatísticas básicas por código no Lote 4.
- [x] Entregar gaveta mobile e busca global por texto no Lote 5.
- [ ] Integrar alternância QR Codes/Cards, atalhos de Analytics e Templates e busca por imagem quando houver contrato e módulos disponíveis.
- [ ] Mapear estados do ciclo de vida e alinhar a composição da Visão geral com conta vazia e com atividade.
- [x] Implementar o fluxo de criação em etapas: tipo, conteúdo, personalização e conclusão (Lote 6).
- [x] Explicitar QR estático e dinâmico e implementar o conteúdo específico de cada tipo oferecido: Website, Texto, E-mail, Telefone, SMS e Wi-Fi no Lote 6. Tipos que dependem de Linkpages, Cards, Forms e mídia seguem no Lote 14.
- [x] Adicionar busca, filtros, paginação e ações de edição, ativação, desativação e exclusão no Lote 4.
- [x] Entregar visualizações, ordenação, filtros por operador, pastas, rótulos, watchlist, ações em lote e importação CSV no Lote 5.
- [ ] Verificar os recortes por ciclo de vida e proprietário e os estados ainda indisponíveis na referência.
- [x] Entregar a etapa final de download com PNG/SVG, larguras de 512 a 2048 px e correção de erros L/M/Q/H decodificados nos testes (Lote 6).
- [ ] Galeria de templates salvos pelo usuário, Auto Design e formatos PDF/EPS. O catálogo de templates existente é usado na etapa de design.
- [x] Permitir alterar o destino de um QR dinâmico preservando a URL pública e os scans, com histórico privado (Lote 6).
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
- [ ] Reproduzir galeria por categoria e salvos, criação a partir de modelo e retomada de rascunho com autosave.
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
- [ ] Criar navegação de Cards, analytics por cartão, gerenciador de contatos e o fluxo de troca de contato. Mapear eventos e conectores como extensões.

**Conclusão:** cartão editável, publicado, compartilhável e persistido, com ações e arquivo de contato validados em celular.

## R6 — Formulários, monetização e recursos avançados

**Objetivo:** ampliar o produto conforme prioridade comercial e especificação de cada módulo.

O trial confirmou entradas de Forms, Asset Library, AI Agents, integrações, API, Webhooks, organizações, domínios e planos. Dividir por dependência e especificar os fluxos que o trial só mostra em estado vazio, comercial ou bloqueado.

| Opção | Definições necessárias antes de implementar |
|---|---|
| Formulários e captura de leads | Tipos de campo, validação, destino das respostas e exportação. |
| Biblioteca de arquivos | Pastas, uploads, limites, propriedade e seleção de mídia nos editores. |
| Planos e cobrança | Produtos, preços, limites, provedor de pagamento, cancelamento e efeitos sobre recursos publicados. |
| Domínios personalizados | Propriedade do domínio, configuração, certificados e encaminhamento. |
| QR protegido, agendado ou com GPS | Fluxo público, permissões, regras de expiração e comportamento de fallback. |
| PDF/EPS e exportações adicionais | Renderização, qualidade, fontes e compatibilidade dos arquivos. |
| Integrações | Serviços prioritários, eventos, credenciais, reenvios e tratamento de falhas. |
| Equipes, organizações e API pública | Papéis, isolamento de dados, quotas e auditoria. |
| IA | Problema atendido, qualidade esperada, custos e limites de uso. |

**Conclusão por módulo:** regras especificadas, telas comparadas e fluxo validado de ponta a ponta em ambiente de teste.

## Decisões que determinam a execução

1. **Referência de paridade:** comparar com o trial da Uniqode observado em 11/11/2026 e usar os vídeos para estados históricos ou ainda indisponíveis. A interface validada nos Lotes 1 e 2 é a base do QRConnect.
2. **Usuários existentes — resolvida:** início do zero; sem importação, compatibilidade de hashes ou sessões antigas. Novas contas pelo cadastro existente.
3. **Códigos distribuídos — resolvida:** ponte/continuidade dispensadas. O proprietário aceita que QRs dependentes do endereço antigo parem quando ele for desligado; não houve desligamento automático.
4. **Expansão do produto:** concluir paridade por módulo. Decidir a ordem entre Linkpages e Cards e verificar os fluxos ainda restritos no trial antes de estimar.

As pendências vigentes são do novo ambiente: Postgres, hospedagem, domínio, recuperação, homologação, observabilidade e retorno. Diferenças de dados/políticas do legado deixaram de bloquear a entrega; não representam trabalho concluído. O registro do Lote 3 detalha acessos/decisões sem credenciais. Retirada ou exclusão do serviço antigo não faz parte desta preparação.

## Prazo

A estimativa anterior de 8–15 dias úteis dizia respeito à migração das funcionalidades implementadas. Ela não cobre automaticamente as correções e todos os módulos destes roadmaps. O cronograma deve ser consolidado após o R0, separando migração, correções e evolução do produto.

Referência: [análise dos vídeos](docs/referencias/analise-dos-videos.md).
