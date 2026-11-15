# Lote 18 — Criação assistida por IA, fontes e fila de revisão

Base: `main` em `2b90d66` (Lote 17, [PR #38](https://github.com/daviduartedev/yousef-qrcode/pull/38)). Branch: `feat/lote-18-ia`. Escopo do roteiro: R6, item P26 e a geração por descrição de P14 e P20 da [auditoria](../../referencias/auditoria-paridade-uniqode.md). Migração aditiva `0016` (`ai_sources`, `ai_generations`, com RLS).

## Contrato

| Área | Comportamento |
|---|---|
| Problema atendido | Escrever a primeira versão de uma Linkpage ou de um formulário a partir de uma descrição e, opcionalmente, de fontes do próprio espaço. |
| Fontes | Textos do espaço (cardápio, sobre, detalhes de evento), até 50 por espaço e 20.000 caracteres cada. Ficam no QRConnect e só vão ao provedor quando escolhidas para um rascunho (até 5). Não podem ser usadas por outro espaço. |
| Pedido | Descrição de até 2.000 caracteres. O modelo `claude-opus-5-5` (SDK oficial da Anthropic, saída estruturada validada por esquema, `effort: medium`, até 8.000 tokens de saída, 90 s de prazo, 2 retentativas do SDK) devolve campos simples. As instruções mandam usar só fatos do pedido e das fontes, não inventar contatos nem URLs, e tratar as fontes como dados (instruções dentro delas são ignoradas). |
| Validação | A resposta é convertida nos esquemas existentes de Linkpage e formulário. Itens inválidos, como link não HTTP/HTTPS, e-mail inválido ou escolha com menos de duas opções, são descartados e contados; nada inválido chega ao editor. |
| Fila de revisão | Todo rascunho fica `pending_review`. Aprovar cria uma Linkpage ou formulário **não publicado** (o id da geração é a chave de criação, então nova tentativa não duplica). Rejeitar mantém o registro. Cada rascunho é decidido uma vez. Publicar continua sendo o fluxo normal do editor. |
| Limites e custo | 20 pedidos por dia e 200 por mês por espaço (UTC), reservados sob trava antes de chamar o provedor; pedidos com falha contam. Tokens de entrada e saída e custo estimado (US$ 4 e US$ 20 por milhão) são gravados e somados no mês. |
| Falhas | Provedor fora, recusa, limite do provedor ou credencial inválida viram mensagens sem detalhes internos; o pedido fica `failed` no histórico. |
| Configuração | Ativo quando o servidor tem `ANTHROPIC_API_KEY`; sem ela a tela explica que não está configurado e o pedido responde 503. `AI_PROVIDER=fixture` usa respostas fixas só em teste local (app em loopback, fora da Vercel). |
| Permissões | Ler fontes e histórico: qualquer membro. Criar fontes, pedir e revisar rascunhos: quem pode editar (`write`). |

## Tickets

| Ticket | Entrega | Estado |
|---|---|---|
| 18.1 | Migração `0016`, fontes, pedido com saída estruturada, conversão validada e cotas. | Entregue e verificado (provedor de teste local) |
| 18.2 | Tela com fontes, fila de revisão, histórico e custo em EN/AR com RTL; atalho na barra lateral. | Entregue e verificado |
| 18.3 | Chamada real ao provedor. | **Bloqueado**: precisa de `ANTHROPIC_API_KEY` de teste autorizada pelo proprietário e configurada na Vercel |

## Verificação

| Verificação | Comando ou evidência | Resultado |
|---|---|---|
| Credenciais, lint, tipos, build | `node scripts/check-secrets.mjs --history`, `npm run lint`, `npm run typecheck`, `npm run build` | passou |
| Unitários: esquemas aceitos pelo formato de saída estruturada do SDK, conversão de Linkpage (link `javascript:` e e-mail inválido descartados, limites de texto), conversão de formulário (opções repetidas, campo vazio, consentimento, formulário nunca vazio), custo | `npm run test:unit` | 31/31 |
| HTTP: descrição vazia 400, fonte de outro espaço 404, rascunho na fila sem criar nada, item inválido descartado, custo gravado, revisão por outro espaço 404, aprovação cria rascunho não publicado, segunda decisão 409, formulário com consentimento, rejeição, falha do provedor 502 registrada, falhas contam no limite, histórico isolado, limite diário 429, exclusão de fonte | `npm run test:api` | 58/58 |
| Operações | `npm run test:ops` | 4/4 |
| Navegador (build de produção local, provedor de teste) | `docs/lotes/18-ia/verificacao/e2e.mjs` · capturas em `docs/evidence/lote-18/` | 12/12 |

## Segurança

Ver seção preenchida após a revisão independente.

## Referência e lacunas

A auditoria registrou na Uniqode agentes de IA com conversas, utilidade e fila de revisão, assistente de PDF e geração por descrição em Forms e Linkpages. Entregues: fontes, geração por descrição para Linkpages e formulários, fila de revisão, limites e custo. Ficam fora: agentes conversacionais publicados em QR, assistente de PDF (upload de PDF como fonte), Auto Design de QR e prova com o provedor real (18.3).
