# Lote 17 — Integrações de QR e Cards

Base: `main` em `87b138c` (Lote 16, [PR #37](https://github.com/daviduartedev/yousef-qrcode/pull/37)). Branch: `feat/lote-17-integracoes`. Escopo do roteiro: R6, item P24 e CRM de P19 da [auditoria](../../referencias/auditoria-paridade-uniqode.md). Migração aditiva `0015` (colunas `kind`, `label` e `config` em `webhooks`; segredo maior; índice por espaço e tipo).

## Contrato

| Conector | Catálogo | Evento | Credencial e destino | Consentimento, escopo e deduplicação | Teste | Indisponibilidade |
|---|---|---|---|---|---|---|
| Slack | QR e Cards | `qr.scanned`, `form.submitted`, `card.contact` | Endereço de *incoming webhook*; só `https://hooks.slack.com/services/…` é aceito, então o segredo só vai ao Slack. | Mensagem de texto com o que o espaço já vê (respostas e contatos aparecem no canal, como a tela avisa); texto do visitante é escapado, fica em uma linha e vai sem markdown, para não virar menção, link formatado ou linha falsa. | Mensagem de teste. | Retentativas da fila do Lote 16 (1 min a 6 h, 6 tentativas), reenvio manual. |
| HubSpot CRM | Cards | `card.contact` | Token de *private app* (`pat-…`) enviado só para `api.hubapi.com`. | Só contatos deixados no cartão, onde o visitante aceita compartilhar os dados. Formulários não vão ao CRM (não têm esse consentimento). Só cria contatos, sem campos vazios: como o e-mail do visitante não é verificado, um contato existente com o mesmo e-mail nunca é alterado (HubSpot responde 409 e a entrega fica `skipped`), o que também evita duplicar em reenvios. Contato sem e-mail é `skipped`, e o conteúdo da entrega pulada é apagado. | Só lê (`GET /crm/v3/objects/contacts?limit=1`); nunca cria contato. | Igual ao Slack; o contato continua salvo no QRConnect. |
| Google Analytics 4 | QR | `qr.scanned` | ID de medição + segredo da Measurement Protocol, enviados só para `www.google-analytics.com`. | Evento `qr_scan` com id, código, título e dispositivo do QR; sem IP, país ou outros dados do visitante; `client_id` aleatório por scan (sem rastrear a pessoa). | Endpoint de validação `/debug/mp/collect`, que não registra dados; confere só o formato (o Google não confirma o segredo), como a tela avisa. | Igual. |
| Zapier, Make e n8n | QR e Cards | todos | Webhook assinado do Lote 16. | — | — | — |

Regras gerais: até 10 integrações por espaço, separadas dos webhooks (as rotas de webhook não leem nem alteram integrações e vice-versa). Conectar, pausar, testar, reenviar e desconectar exigem papel de administrador. A credencial é cifrada (AES-256-GCM), nunca volta nas respostas e aparece só como dica (`…abcd` ou o ID de medição). Desconectar apaga a credencial; pausar interrompe eventos e retentativas. Eventos e credencial mudam conectando de novo. A tela mostra o estado da última entrega (funcionando, tentando de novo, pulado, falhando) e o histórico com reenvio.

Teste local: `INTEGRATION_TEST_ORIGIN` troca a origem dos conectores por um receptor local, só com `WEBHOOK_ALLOW_LOOPBACK=true`, app em loopback e fora da Vercel.

## Tickets

| Ticket | Entrega | Estado |
|---|---|---|
| 17.1 | Migração `0015`, conectores Slack, HubSpot e GA4 sobre a fila de entregas. | Entregue e verificado |
| 17.2 | Tela de integrações com catálogos de QR e Cards em EN/AR com RTL. | Entregue e verificado |
| 17.3 | Prova com contas de teste reais de Slack, HubSpot e GA4. | **Bloqueado**: precisa de contas de teste autorizadas pelo proprietário |

## Verificação

| Verificação | Comando ou evidência | Resultado |
|---|---|---|
| Credenciais, lint, tipos, build | `node scripts/check-secrets.mjs --history`, `npm run lint`, `npm run typecheck`, `npm run build` | passou |
| Unitários: validação por conector (host do Slack, eventos permitidos, campos extras), escape do Slack, contato do HubSpot, evento do GA4 sem país | `npm run test:unit` | 27/27 |
| HTTP: endereço do Slack de outro host, HubSpot com evento de scan e ID de medição inválido recusados; credenciais fora das respostas; dicas; isolamento entre espaços; rotas de webhook não gerenciam integrações; scan chega ao Slack (escapado) e ao GA4 com o segredo certo, sem token do HubSpot; contato chega ao HubSpot como criação sem campos vazios; contato já existente (409) não é alterado; HubSpot fora do ar (503) reagenda e reenvio entrega; reenvio por outro espaço 404; contato sem e-mail pulado; teste do HubSpot só lê; edição de eventos recusada; pausa; desconexão | `npm run test:api` | 57/57 |
| Operações | `npm run test:ops` | 4/4 |
| Navegador (build de produção local, receptor local no lugar dos conectores) | `docs/lotes/17-integracoes/verificacao/e2e.mjs` · capturas em `docs/evidence/lote-17/` | 14/14 |

## Segurança

Revisão independente sem achados críticos ou altos. Corrigidos os médios: entregas puladas apagam o conteúdo na hora e entram na retenção de 30 dias; o HubSpot passou a só criar contatos (nunca altera um existente, porque o e-mail do visitante não é verificado) e não envia campos vazios. Corrigidos os baixos: valores do visitante ficam em uma linha e o Slack recebe a mensagem sem markdown, a troca de origem de teste exige endereço de loopback, a tela avisa que o teste do GA4 só confere o formato e que respostas e contatos aparecem no canal do Slack. Registrado: a migração recria um índice sem `CONCURRENTLY` (tabela pequena).

## Referência e lacunas

A auditoria registrou na Uniqode catálogos separados de QR (automação, analytics, design, GS1) e Cards (CRM, diretórios, assinaturas). Entregues Slack, HubSpot, GA4 e automação por webhook. Ficam fora: Salesforce, Google Sheets e outros que exigem aplicativo OAuth registrado, conectores de design, GS1, diretórios e assinaturas de e-mail; e a prova com contas reais (17.3).
