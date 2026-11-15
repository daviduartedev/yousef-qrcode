# Lote 10 — Linkpages

Base: `main` em `de0404c` (Lote 9, [PR #30](https://github.com/daviduartedev/yousef-qrcode/pull/30)). Branch: `feat/lote-10-linkpages`. Escopo do roteiro: R4, itens P14–P16 da [auditoria](../../referencias/auditoria-paridade-uniqode.md). Migração aditiva `0008`: `link_pages`, `link_page_events` e `public_slugs`, com RLS.

## Contrato

| Área | Comportamento |
|---|---|
| Modelo | Cada página tem um nome interno, um endereço (`/p/<slug>`), um rascunho privado e a última cópia publicada. O conteúdo é validado no servidor: perfil (nome, descrição, foto e capa da biblioteca), tema (5 predefinições, cores `#rrggbb`, 4 formatos de botão) e até 40 blocos (link, telefone, e-mail, rede social, texto, separador). Links só aceitam HTTP/HTTPS. |
| Galeria e criação | Lista com estado vazio, status (Rascunho, Publicada, Publicada com alterações, Despublicada), visitas e cliques de 30 dias, e galeria por categoria (Em branco, Pessoal, Negócios, Restaurante, Eventos). A criação é idempotente por chave do cliente: duplo clique ou nova tentativa devolve a mesma página. Limite de 50 páginas por conta. |
| Editor | Três abas (Conteúdo, Estilo, Configurações), prévia de celular ao lado, adicionar, editar, mover e remover blocos. Salva sozinho 1 s depois da última alteração, mostra o estado ("Todas as alterações salvas", "Salvando…", campos incompletos) e avisa antes de sair com alteração pendente. |
| Publicação | Publicar copia o rascunho para a versão pública. Alterações posteriores ficam no rascunho até "Publicar alterações". Despublicar faz o endereço responder 404; publicar de novo volta ao mesmo endereço. |
| Endereço estável | O endereço pode mudar até a primeira publicação ou até a página ganhar um QR; depois fica fixo. Todo endereço usado fica reservado para sempre à conta que o usou (`public_slugs`), mesmo após renomear ou excluir a página, para que um QR impresso nunca leve a página de outra pessoa. Palavras reservadas são recusadas. |
| QR da página | Um QR rastreável por página, apontando para o endereço público. Pedidos simultâneos geram um único QR. Excluir a página desativa esse QR. |
| Página pública | Renderizada no servidor, sem sessão, só com a versão publicada. Cliques passam por `/p/<slug>/go/<bloco>`, que conta e redireciona para o destino publicado (`https`, `tel:` ou `mailto:`). Foto e capa ficam públicas em `/p/<slug>/media/<arquivo>` somente enquanto a versão publicada as usa. |
| Métricas | Visita conta quando a página abre num navegador (beacon do próprio site; origem externa recusada). Robôs, prévias de link, requisições entre sites e cliques embutidos como imagem ou script não contam; visitas e cliques têm limites separados de 300 por minuto por página; repetição do mesmo endereço confiável e navegador em 10 s conta uma vez. Visitantes únicos seguem a regra do Lote 7 (endereço confiável + navegador). Analytics por página com período, atalhos 7/30/90, dispositivo, comparação com o período anterior, taxa de cliques, série diária, cliques por bloco, dispositivos, países e CSV protegido contra fórmulas. |
| Código compartilhado | `src/server/visitor.ts` concentra dispositivo, navegador, robôs e endereço confiável; o redirecionamento de QR passou a usá-lo sem mudar o comportamento. |

## Tickets

| Ticket | Entrega | Estado |
|---|---|---|
| 10.1 | Esquema, migração `0008`, contrato de conteúdo, modelos e regras de endereço. | Entregue e verificado |
| 10.2 | API privada: lista, criação idempotente, rascunho, endereço, publicar/despublicar, excluir, QR, analytics e CSV. | Entregue e verificado |
| 10.3 | Página pública, contagem de visitas e cliques, mídia pública restrita. | Entregue e verificado |
| 10.4 | Telas: lista e galeria, editor com autosave e prévia, analytics; navegação lateral; EN/AR. | Entregue e verificado |

## Verificação

| Verificação | Comando ou evidência | Resultado |
|---|---|---|
| Credenciais, lint, tipos, build | `node scripts/check-secrets.mjs --history`, `npm run lint`, `npm run typecheck`, `npm run build` | passou |
| Unitários e paridade EN/AR | `npm run test:unit` | 14/14 |
| HTTP: criação idempotente, modelo inválido, link `javascript:` recusado, endereço reservado e duplicado, rascunho privado, seis rotas com outra conta (404), publicação, nome interno fora da página, endereço fixo depois de publicar, rascunho invisível até republicar, QR único que redireciona para a página, despublicar/republicar, exclusão; visitas e cliques com robôs ignorados, origem externa 403, `tel:`, bloco inexistente 404, totais, filtro de dispositivo, série, cliques por bloco e CSV neutralizado; mídia pública só quando publicada e referenciada, imagem alheia recusada ; endereço antigo reservado após renomear e excluir, QR que trava o endereço e é desativado na exclusão, requisições embutidas sem contagem, corpo acima de 64 KB recusado | `npm run test:api` | 39/39 |
| Navegador (build de produção local) | `docs/lotes/10-linkpages/verificacao/e2e.mjs` · capturas em `docs/evidence/lote-10/` | 26/26 |

O roteiro de navegador percorre a galeria (filtro por categoria e duplo clique gerando um único rascunho), o editor (perfil, bloco novo movido para o topo, bloco incompleto impedindo o salvamento, estilo, endereço) e a publicação. Depois confere a página pública num celular sem sessão (ordem dos blocos, sem rolagem horizontal, clique indo ao destino), a edição após publicar sem mudar o endereço, o QR apontando para o endereço, o analytics com a visita e o clique, a lista em árabe RTL e a recusa de acesso a outra conta.

## Segurança

Revisão independente sem achados críticos. Corrigido o achado alto: endereços liberados por renomeação ou exclusão podiam ser tomados por outra conta e receber os scans de QRs impressos; agora ficam reservados e o QR trava o endereço. Corrigidos os médios e baixos: contagem inflada por requisições entre sites, limites separados por tipo, QR duplicado em pedidos simultâneos, corrida entre renomear e publicar, leitura do corpo com limite em bytes, limite de páginas sob trava e endereços normalizados. Registrados: retenção dos eventos (decisão do proprietário), limite por endereço de rede na borda (depende de proxy confiável), páginas com nomes que imitam marcas (moderação) e `lang` fixo em inglês na página pública, com texto em `dir="auto"`.

## Referência e lacunas

A auditoria registrou na Uniqode lista, galeria por categoria e salvos, rascunho criado automaticamente, editor em três etapas com autosave, widgets e analytics com visitas, cliques, usuários e localização. Ficaram fora: geração por descrição com IA (Lote 18), salvos/favoritos de modelos, widgets além dos seis blocos, opções de acessibilidade da galeria, domínio próprio (Lote 15) e mapa de localização.
