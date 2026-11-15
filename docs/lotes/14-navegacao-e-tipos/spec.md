# Lote 14 — Navegação e gestão restantes, tipos vinculados

Base: `main` em `3d55a13` (Lote 13, [PR #34](https://github.com/daviduartedev/yousef-qrcode/pull/34)). Branch: `feat/lote-14-navegacao-e-tipos`. Escopo do roteiro: R3, itens P03–P07, tipos de P09 que dependem dos módulos publicados e mídia de P10 na [auditoria](../../referencias/auditoria-paridade-uniqode.md). Migração aditiva `0012`: tabela `qr_templates` e coluna `qr_codes.created_by`.

## Contrato

| Área | Comportamento |
|---|---|
| Tipos vinculados | O assistente oferece Linkpage, Cartão digital, Formulário e PDF ou imagem. O conteúdo é a escolha de um item do espaço de trabalho; páginas, cartões e formulários precisam estar publicados. O servidor confere que o item pertence ao espaço, monta o endereço público e cria um QR rastreável do tipo correspondente. O QR segue o item: edições do item aparecem sem trocar o código, e a troca manual de destino é recusada (409). Apagar o item desativa todos os QRs vinculados a ele, e os tipos vinculados só nascem pela escolha do item. O editor de cartão local de demonstração foi retirado, porque o módulo Cards o substitui. |
| Arquivo público | PDF e imagem abrem em `/a/<arquivo>/<assinatura>`. A assinatura é um HMAC do id com o segredo do servidor, comparado em tempo constante; sem assinatura válida responde 404. O arquivo só abre enquanto houver um QR de arquivo ativo apontando para ele; pausar esses QRs ou apagar o arquivo encerra o endereço, sem cache público. PDFs abrem no visualizador; imagens com `sandbox` e `nosniff`. |
| Busca por imagem | "Buscar por imagem" na lista lê a foto ou captura no navegador (jsQR), sem enviar a imagem; o conteúdo decodificado vai no corpo de um POST (não fica em URL nem em log) e procura o código do espaço atual pelo endereço de rastreamento ou pelo conteúdo exato de códigos diretos e estáticos. Outro espaço nunca é consultado. |
| Responsável | Cada QR guarda a conta que o criou (preenchido para códigos dos espaços pessoais). O filtro "Criados por mim" separa os códigos de cada membro num espaço compartilhado. |
| Modelos salvos | Na aba de modelos do editor: salvar o design atual com um nome, aplicar e apagar. Até 50 por espaço; logo da biblioteca só do mesmo espaço. Apagar um modelo não muda QRs que o usaram. |

## Tickets

| Ticket | Entrega | Estado |
|---|---|---|
| 14.1 | Tipos vinculados no servidor, no assistente e no detalhe; endereço público assinado de arquivos. | Entregue e verificado |
| 14.2 | Busca por imagem e rota de consulta por conteúdo decodificado. | Entregue e verificado |
| 14.3 | Responsável pelo QR e filtro "Criados por mim". | Entregue e verificado |
| 14.4 | Modelos de design salvos por espaço. | Entregue e verificado |

## Verificação

| Verificação | Comando ou evidência | Resultado |
|---|---|---|
| Credenciais, lint, tipos, build | `node scripts/check-secrets.mjs --history`, `npm run lint`, `npm run typecheck`, `npm run build` | passou |
| Unitários e paridade EN/AR | `npm run test:unit` | 21/21 |
| HTTP: Linkpage vinculada com destino, rastreio, título e responsável; redirecionamento; troca de destino recusada; formulário não publicado, cartão de outro espaço e destino misturado recusados; arquivo público sem sessão, assinatura forjada 404, arquivo apagado 404; busca por endereço de rastreamento e por conteúdo estático, isolamento entre contas; modelos salvos, logo alheio recusado, isolamento e exclusão; filtro "Criados por mim" com dois membros ; QR de arquivo pausado revoga o arquivo, exclusão de página e arquivo desativa os vinculados, tipo vinculado sem item recusado | `npm run test:api` | 49/49 |
| Navegador (build de produção local) | `docs/lotes/14-navegacao-e-tipos/verificacao/e2e.mjs` · capturas em `docs/evidence/lote-14/` | 10/10 |

## Segurança

Revisão independente sem achados críticos ou altos. Corrigidos: QRs vinculados ativos depois de apagar o item, arquivo público acessível depois de pausar o QR, conteúdo decodificado em URL, tipo vinculado criado sem item, cache público do arquivo e busca com título vazio. Registrado: QRs criados por importação CSV e pelos botões de QR de Linkpage, cartão e formulário ainda não guardam o responsável.

## Referência e lacunas

Ficam para os lotes seguintes ou sem contrato: tipos com regras (senha, agenda, localização) no Lote 15; App download sem contrato de lojas; Auto Design e geração por IA no Lote 18; PDF/EPS de exportação vetorial; alternância QR Codes/Cards no topo (a navegação lateral já leva aos dois módulos).
