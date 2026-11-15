# Lote 7 — Analytics consolidado e ciclo de vida no Overview

Base: `main` em `e905477` (Lote 6 integrado pelo [PR #26](https://github.com/daviduartedev/yousef-qrcode/pull/26)). Branch: `feat/lote-07-analytics-ciclo-de-vida`. Escopo do roteiro: R3, itens P03 e P13 da [auditoria](../../referencias/auditoria-paridade-uniqode.md). Sem migração de banco.

## Regras de métrica (documentadas antes de exibir)

Todas as fronteiras de dia e hora usam **UTC**. Contrato em `src/lib/qr-analytics.ts`.

| Regra | Definição |
|---|---|
| Scan | Um `GET /qr?code=…` de QR ativo que redireciona. `HEAD` não conta (comportamento anterior). |
| Bots | User agents de prévias e robôs (`Slackbot`, `WhatsApp/`, `facebookexternalhit`, `Googlebot`, `TelegramBot`, `LinkedInBot`, `Discordbot`, `curl/`, `python-requests`, etc.) são redirecionados, mas não registrados. Navegadores internos de apps (LinkedInApp, Telegram, Facebook) continuam contando. |
| Deduplicação | Repetição do mesmo endereço de rede confiável e mesmo navegador no mesmo QR em até 10 s é redirecionada sem novo registro. Sem endereço confiável, não há deduplicação. Janelas usam o relógio do banco. |
| Scanner único | Pares distintos de endereço de rede confiável + navegador no período. Scans sem endereço confiável contam como scans e aparecem separados, sem entrar nos únicos. Nenhum cookie ou identificador novo é criado. |
| Endereço confiável | Só existe com `TRUST_PROXY_HEADERS=true`, atrás de proxy que **substitui** `X-Forwarded-For` (a Vercel substitui). Com `false`, únicos ficam em zero e a tela explica o motivo. |
| Período anterior | Mesmo número de dias imediatamente antes do período escolhido. Intervalo máximo 366 dias; intervalo inválido volta aos últimos 30 dias. |
| Retenção | Eventos brutos continuam guardados sem expiração automática. Uma política de expiração exige decisão do proprietário e entra como lote operacional. |

### Ciclo de vida (QR rastreável)

Prioridade: Pausado → Novo → Sem scans → Em queda → Ativo. QRs diretos e estáticos não têm dados de scan e aparecem como "QR Codes diretos".

| Estado | Regra |
|---|---|
| Pausado | Rastreamento pausado. |
| Novo | Criado há menos de 7 dias. |
| Sem scans | Nenhum scan nos últimos 30 dias. |
| Em queda | Pelo menos 4 scans entre 28 e 14 dias atrás e, nos últimos 14 dias, menos da metade disso. |
| Ativo | Demais rastreáveis com scan nos últimos 30 dias. |

## Tickets

| Ticket | Entrega | Estado |
|---|---|---|
| 7.1 | Regras de contagem no redirecionamento: bots e repetições não registrados; janelas pelo relógio do banco (corrige também o limite de 300/min, que comparava com o relógio do Node). | Entregue e verificado |
| 7.2 | Ciclo de vida em SQL (`src/server/lifecycle.ts`), espelhando `lifecycleOf()`. Faixa do Overview com contagens e links; filtro `lifecycle=` na lista. | Entregue e verificado |
| 7.3 | `/analytics` e `GET /api/analytics`: período com atalhos de 7, 30 e 90 dias ou datas, comparação com o período anterior, filtros por QR, dispositivo e país, resumo (scans, únicos, sem endereço), série diária, ranking de QRs, dispositivo, sistema, navegador, país e hora UTC. Consultas em um único snapshot somente leitura e uma conexão. | Entregue e verificado |
| 7.4 | `GET /api/analytics/export`: CSV UTF-8 com BOM, uma linha por dia e QR, com os mesmos filtros, e proteção contra fórmulas (`= + - @`, espaços iniciais e sinais de largura total). | Entregue e verificado |
| 7.5 | Atalhos: "Analytics" na navegação e "Abrir analytics" no detalhe do QR (`/analytics?qr=…`). | Entregue e verificado |

## Segurança

- Todas as consultas de analytics, exportação e ciclo de vida juntam scans aos QRs do usuário da sessão; filtros só restringem dentro da conta. Respostas privadas sem cache; exportação exige sessão.
- Revisão independente: nenhum achado crítico ou alto. Corrigidos: consultas paralelas que poderiam ocupar o pool (agora uma conexão por requisição), SQL do ciclo de vida (`EXISTS` e uma única passagem para a tendência), CSV com espaços e sinais de largura total, tradução só de valores conhecidos. Registrados: o proxy precisa substituir `X-Forwarded-For`; apps leitores que buscam a URL com `okhttp`/`java` não contam como scan.

## Verificação

| Verificação | Comando ou evidência | Resultado |
|---|---|---|
| Credenciais, lint, tipos, build | `node scripts/check-secrets.mjs --history`, `npm run lint`, `npm run typecheck`, `npm run build` | passou |
| Unitários: bots e navegadores reais, prioridade e limiares do ciclo de vida, intervalos UTC, CSV, paridade EN/AR | `npm run test:unit` | 9/9 |
| HTTP com totais conhecidos (scans sintéticos semeados no banco descartável): resumo, únicos, período anterior, série, ranking, dispositivo, país, hora, filtros combinados, isolamento, exportação e CSV neutralizado; bots e repetição em servidor com proxy confiável; ciclo de vida na lista e no Overview | `npm run test:api` (o executor sobe um segundo servidor com `TRUST_PROXY_HEADERS=true` só para o teste de deduplicação) | 26/26 |
| Operações | `npm run test:ops` | 4/4 |
| Navegador (build de produção local, contas sintéticas) | `docs/lotes/07-analytics-ciclo-de-vida/verificacao/e2e.mjs` · capturas em `docs/evidence/lote-07/` | 12/12 |

O roteiro de navegador confere as contagens do ciclo de vida, o clique em "Em queda", os totais de 30 e 7 dias, filtros por QR e dispositivo, CSV com os mesmos filtros, atalho do detalhe, árabe RTL, celular 390×844 sem rolagem horizontal e isolamento por conta.

## Referência e lacunas

O trial da Uniqode pede login no executor. A comparação usa a auditoria arquivada (P03, P13). Ficaram sem comparação direta: granularidade semanal/mensal, amostra, mapa de localização e recortes por tipo da referência. Não há métrica de cidade porque o redirecionamento só grava cidade com proxy confiável.

## Limitações e defeito existente

- **Defeito anterior ao lote:** o `/overview` de produção emite o erro de hidratação React #418 (texto), também na `main` sem este lote. A página funciona; a causa fica para correção separada.
- Em homologação, `TRUST_PROXY_HEADERS` não está confirmado como `true`. Até a configuração ser revisada pelo proprietário, scanners únicos e deduplicação ficam inativos lá, e a interface informa isso.
- O ciclo de vida é calculado a cada leitura. Volumes muito altos pedem uma tabela diária agregada em lote futuro.
