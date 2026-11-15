# Lote 6 — Assistente de criação, tipos estáticos, detalhe e download

Base: `main` em `85e425c` (Lote 5 integrado em `f0c6f61`). Branch: `feat/lote-06-criacao-e-detalhe`. Escopo do roteiro: R3, itens P08–P12 da [auditoria](../../referencias/auditoria-paridade-uniqode.md). Alvo hospedado: Vercel e Neon de homologação. O #15 (produção) continua adiado.

## Tickets

| Ticket | Entrega | Dependência | Estado |
|---|---|---|---|
| 6.1 | Contrato de conteúdo por tipo (`src/lib/qr-content.ts`): Texto, E-mail, Telefone, SMS e Wi-Fi com validação, payload documentado e limite de 1.200 bytes UTF-8. O servidor deriva `destination_url` do conteúdo e força os tipos estáticos a não rastrear. | Lote 5 | Entregue e verificado |
| 6.2 | Codificação UTF-8 do QR (`src/lib/qr-matrix.ts`). A biblioteca gravava só o byte baixo de cada caractere, o que corrompia texto árabe. URLs ASCII geram a mesma matriz de antes. | 6.1 | Entregue e verificado |
| 6.3 | Assistente em quatro etapas em `/app`: Tipo → Conteúdo → Design → Concluído, com validação por etapa, retorno, guarda de rascunho e foco no título da etapa. Website escolhe entre dinâmico (rastreável) e estático (direto). Tipos dependentes de módulos futuros aparecem como "chegam com seus módulos". O editor local de cartão continua acessível e identificado como prévia. | 6.1, Lote 2 | Entregue e verificado |
| 6.4 | Conclusão e download: resumo, URL de rastreamento, links para a lista, edição do design e novo QR. Diálogo de download com PNG/SVG, largura de 512, 1024 ou 2048 px e correção de erros L/M/Q/H. Com logo, apenas Q/H. | 6.3 | Entregue e verificado |
| 6.5 | Reabrir QRs anteriores. Registros antigos com `qr_type` de aba (`qrGenerator.tabs.*`) abrem como Website. Conteúdo estático aparece somente leitura e o design continua editável. | 6.3 | Entregue e verificado |
| 6.6 | Troca de destino de QR rastreável (`PATCH /api/qr-codes/:id` com `destination_url`) com bloqueio de linha, histórico privado (`GET /api/qr-codes/:id/destinations`), mesma URL pública e scans preservados. Disponível no editor e no detalhe de Meus QR Codes. QR direto ou estático recebe 409. | Lote 4 | Entregue e verificado |

## Contrato

| Tipo | Campos | Payload |
|---|---|---|
| `website` | URL HTTP(S) sem credenciais; `tracking_enabled` | URL (direto) ou `APP_URL/qr?code=<short_code>` (dinâmico) |
| `text` | `text` (1–1.000) | texto |
| `email` | `to` (e-mail), `subject` (≤200, uma linha), `body` (≤1.000) | `mailto:to?subject=…&body=…` com `encodeURIComponent` |
| `phone` | `number` (3–20 dígitos, `+` opcional) | `tel:+5511…` |
| `sms` | `number`, `message` (≤500) | `SMSTO:number:message` |
| `wifi` | `ssid` (1–32 bytes), `security` WPA/WEP/nopass, `password` (WPA 8–63), `hidden` | `WIFI:T:…;S:…;P:…;H:true;;` com escape de `\ ; , : "` |

`POST /api/qr-codes` aceita `content` (tipos estáticos) ou `destination_url` (website), nunca os dois. `tracking_enabled` em tipo estático retorna 400. O servidor armazena `content` (jsonb) e o payload em `destination_url`, assim lista, busca, ZIP e importação continuam lendo o mesmo campo.

Migração aditiva `0005_qr_content_and_destination_history.sql`: coluna anulável `qr_codes.content` e tabela `qr_destination_changes` com RLS, chave composta `(user_id, qr_code_id)` e exclusão em cascata. O código anterior continua funcionando com o esquema novo.

## Segurança e privacidade

- Toda leitura e escrita nova deriva o dono da sessão; o histórico filtra por usuário e pelo QR. Mutação mantém `requireSameOrigin`. Respostas privadas sem cache.
- Troca de destino aceita só HTTP(S) sem credenciais, com até 2.048 caracteres após normalização; o redirecionamento revalida o destino.
- Wi-Fi: lista, busca global e visão geral mostram `Wi-Fi · SSID`; a busca não procura no payload de Wi-Fi. A lista ainda recebe o payload para desenhar o QR do próprio dono. A senha fica no padrão impresso por natureza; a interface avisa isso.
- Revisão independente de segurança: nenhum achado crítico ou alto. Achados médios e baixos corrigidos: mascaramento na busca e na visão geral, limite de bytes do SSID, mínimo de 8 caracteres para WPA, comprimento após normalização. Registrados como limitação: ver abaixo.

## Verificação

| Verificação | Comando ou evidência | Resultado |
|---|---|---|
| Credenciais | `node scripts/check-secrets.mjs --history` | passou |
| Lint, tipos, build | `npm run lint`, `npm run typecheck`, `npm run build` | passou |
| Unitários de payload e decodificação (jsQR) por tipo, nível de correção, logo, árabe e paridade EN/AR | `npm run test:unit` (`tests/qr-content.test.mjs`) | 5/5 |
| HTTP: tipos estáticos, recusas, isolamento, troca de destino, histórico, origem e mascaramento | `npm run test:api` com Postgres local descartável | 23/23 |
| Backup/restauração com histórico e conteúdo | `npm run test:ops` | 4/4 |
| Migração desde banco vazio | `test:api` e `test:ops` aplicam `0000–0005` | passou |
| Atualização a partir de `0004` com registros existentes | `node docs/lotes/06-criacao-e-detalhe/verificacao/upgrade-check.mjs <admin URL local>` | `ok: true`, scans e RLS preservados |
| Navegador (build de produção local, Chromium headless, contas sintéticas) | `docs/lotes/06-criacao-e-detalhe/verificacao/e2e.mjs` · capturas em `docs/evidence/lote-06/` | 21/21 |

O roteiro de navegador cobre: etapas e validação; website dinâmico com PNG de 512 px decodificado igual à URL de rastreamento e SVG de 2048 px; redirecionamento antes e depois da troca de destino na mesma URL com scans preservados e histórico; Wi-Fi com recusa de senha vazia, PNG decodificado e senha ausente da lista; reabertura de estático somente leitura; confirmação ao sair com rascunho; árabe RTL com texto árabe decodificado; celular 390×844 sem rolagem horizontal; recusa de leitura, alteração e histórico por outra conta.

## Referência e lacunas

O trial da Uniqode pede login no executor; foram usados os registros da [auditoria](../../referencias/auditoria-paridade-uniqode.md) (P08–P12) e os vídeos. Sem comparação direta nesta execução: aparência exata das etapas, galeria de templates salvos, Auto Design, comentários e histórico do detalhe da referência, e os parâmetros finais do modal de download da referência. Formatos PDF/EPS e templates salvos pelo usuário ficam para o R6 e para a biblioteca de arquivos (Lote 9).

## Limitações conhecidas

- jsQR não lê módulos redondos com gradiente (template 3); a decodificação automática usa o template Classic. A leitura de designs estilizados exige celular na checklist humana, como no Lote 2.
- O ZIP em lote da lista continua em correção H; o diálogo individual permite L/M/Q.
- `/qr?code=` de QR direto ou estático ainda redireciona quando o payload é uma URL HTTP(S) (comportamento anterior, sem risco novo); não é impresso nesses QRs.
- Reverter para o código anterior com registros estáticos criados exibiria o payload completo (incluindo senha de Wi-Fi) na lista do próprio dono. Em caso de retorno, preferir corrigir para frente.
- Tipos Linkpage, PDF, App, Localização, Formulário e cartões publicados dependem dos Lotes 9–12.

## Homologação

Aplicar `0005` no Neon de homologação por conexão direta com TLS verificado antes de integrar na `main` (deploy da Vercel). Resultado e commit registrados em `docs/agents/cloud-execution-state.md`.
