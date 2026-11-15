# Lote 16 — API pública e webhooks

Base: `main` em `f132e26` (Lote 15, [PR #36](https://github.com/daviduartedev/yousef-qrcode/pull/36)). Branch: `feat/lote-16-api-e-webhooks`. Escopo do roteiro: R7, itens de API e webhooks da [auditoria](../../referencias/auditoria-paridade-uniqode.md). Migração aditiva `0014` (`api_keys`, `api_key_usage`, `webhooks`, `webhook_deliveries`, todas com RLS).

## Contrato

| Área | Comportamento |
|---|---|
| Chaves | Pertencem ao espaço de trabalho, não à pessoa. Até 20 por espaço. Formato `qrc_<prefixo de 12>_<segredo de 43>`; só o hash SHA-256 é guardado e o segredo aparece uma única vez. Permissões: `qr:read`, `qr:write` (inclui leitura) e `analytics:read`. Revogar é imediato e definitivo. Criar, listar e revogar exigem papel de administrador. |
| API `/api/v1` | `Authorization: Bearer <chave>`; cookies de sessão não valem. `GET/POST /qr-codes`, `GET/PATCH/DELETE /qr-codes/{id}`, `GET /analytics?from&to`. Cada chave vê só o próprio espaço (outro espaço responde 404). 60 requisições por minuto por chave, com `X-RateLimit-Limit/Remaining/Reset` e 429 com `Retry-After`. |
| Webhooks | Até 10 por espaço. Só HTTPS para endereços públicos: o host é resolvido, endereços privados, de loopback, link-local, CGNAT, multicast e reservados (IPv4, IPv6 e IPv4 mapeado) são recusados, a conexão usa o IP já conferido e redirecionamentos não são seguidos. Eventos: `qr.scanned` (scan contado), `form.submitted` (com as respostas) e `card.contact` (contato deixado no cartão). Segredo de assinatura mostrado uma vez e guardado cifrado (AES-256-GCM). |
| Assinatura | `QRConnect-Signature: t=<unix>,v1=<HMAC-SHA256 hex de "t.corpo">` e `QRConnect-Event-Id`. O receptor deve recusar eventos com mais de 5 minutos e ids já processados. |
| Entregas | Primeira tentativa logo após a resposta ao visitante (sem atrasá-la). Resposta 2xx encerra; outras respostas ou falhas reagendam em 1 min, 5 min, 30 min, 2 h e 6 h (6 tentativas, depois `failed`). Cada entrega é reivindicada por atualização condicional, sem envio duplo. Histórico das últimas 50 por webhook, reenvio manual com o mesmo id de evento e evento de teste (`ping`). Pausar o webhook interrompe novos eventos. |
| Agendador | `/api/cron/webhooks` processa retentativas vencidas; exige `Authorization: Bearer <CRON_SECRET>` (mínimo 16 caracteres). `vercel.json` agenda uma vez ao dia (limite do plano gratuito); frequência maior depende do plano ou de agendador externo. |
| Teste local | `WEBHOOK_ALLOW_LOOPBACK=true` aceita `http://127.0.0.1` só quando o próprio app roda em loopback e fora da Vercel. |

## Tickets

| Ticket | Entrega | Estado |
|---|---|---|
| 16.1 | Migração `0014`, chaves com escopo, cota por minuto e API `/api/v1`. | Entregue e verificado |
| 16.2 | Webhooks assinados, proteção SSRF, entregas com retentativa, reenvio e teste; eventos de scan, formulário e cartão. | Entregue e verificado |
| 16.3 | Tela "API e webhooks" em EN/AR com RTL. | Entregue e verificado |
| 16.4 | `CRON_SECRET` na hospedagem para ativar as retentativas agendadas. | **Pendente humano** |

## Verificação

| Verificação | Comando ou evidência | Resultado |
|---|---|---|
| Credenciais, lint, tipos, build | `node scripts/check-secrets.mjs --history`, `npm run lint`, `npm run typecheck`, `npm run build` | passou |
| Unitários: bloqueio de endereços privados (IPv4, IPv6, mapeado) | `npm run test:unit` | 25/25 |
| HTTP: formato da chave, segredo só uma vez, isolamento entre espaços, escopo de leitura não escreve, sem escopo de análise 403, chave inválida/ausente/cookie 401, criar, editar e apagar pela API, revogação, cota 429 com `Retry-After`; webhook em IP privado e HTTP recusados, assinatura confere com o segredo, falha 500 reagenda, reenvio por outro espaço 404, reenvio mantém o id, evento de formulário com respostas, webhook pausado não recebe, ping, entregas de outro espaço 404, agendador sem segredo 401 | `npm run test:api` | 56/56 |
| Operações | `npm run test:ops` | 4/4 |
| Navegador (build de produção local) | `docs/lotes/16-api-e-webhooks/verificacao/e2e.mjs` · capturas em `docs/evidence/lote-16/` (segredos mascarados) | 16/16 |

## Segurança

Ver seção preenchida após a revisão independente.

## Referência e lacunas

A auditoria registrou na Uniqode chaves de API, documentação de endpoints e webhooks por evento. Ficam sem prova: documentação OpenAPI publicada, mais eventos (criação/edição de QR) e retentativas mais frequentes que diárias na hospedagem gratuita.
