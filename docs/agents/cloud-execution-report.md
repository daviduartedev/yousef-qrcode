# Relatório da execução autônoma — QRConnect (15/11/2026)

## 1. Resumo executivo

Esta execução entregou dois lotes completos do roteiro, ambos implementados, testados, revisados por um agente de segurança independente, verificados no navegador e integrados na `main` por PR com CI verde:

- **Lote 6** — assistente de criação em quatro etapas, tipos estáticos (Texto, E-mail, Telefone, SMS, Wi-Fi), download com formato, tamanho e correção de erros, e troca de destino de QR rastreável com histórico. Migração aditiva `0005` aplicada e verificada no Neon de homologação antes do deploy.
- **Lote 7** — analytics consolidado (período, comparação, filtros, rankings, CSV), regras documentadas de bots, repetição e scanner único, e ciclo de vida dos QRs no Overview e na lista.

Os Lotes 8–20 não foram iniciados. Nenhuma operação de produção (#15), recuperação hospedada (#12), DNS, cobrança ou mensagem a terceiros foi executada. Testes autenticados na homologação não foram feitos porque o AGENTS.md exige autorização do proprietário para credenciais hospedadas.

## 2. Lotes concluídos

| Lote | Estado | PR | Commit do lote | Merge na `main` |
|---|---|---|---|---|
| 6 | Implementado e verificado | [#26](https://github.com/daviduartedev/yousef-qrcode/pull/26) | `c1f19fb` | `e905477` |
| 7 | Implementado e verificado | [#27](https://github.com/daviduartedev/yousef-qrcode/pull/27) | `bba47dd` | `ec65d95` |

## 3. Funcionalidade por lote

**Lote 6** ([especificação](../lotes/06-criacao-e-detalhe/spec.md))
- `/app` em etapas Tipo → Conteúdo → Design → Concluído, com validação por etapa, foco no título da etapa, guarda de rascunho e EN/AR.
- Website dinâmico (rastreável) ou estático; Texto, E-mail, Telefone, SMS e Wi-Fi com payload derivado no servidor e limite de 1.200 bytes.
- Correção da codificação UTF-8 do QR (texto árabe era corrompido pela biblioteca).
- Diálogo de download: PNG/SVG, 512/1024/2048 px, correção L/M/Q/H (Q/H com logo).
- Troca de destino na mesma URL com scans preservados e histórico privado, no editor e no detalhe.
- Senha de Wi-Fi mascarada na lista, busca global e visão geral.

**Lote 7** ([especificação](../lotes/07-analytics-ciclo-de-vida/spec.md))
- Redirecionamento sem registrar bots e repetições de 10 s; janelas pelo relógio do banco (corrige também o limite de 300/min).
- Ciclo de vida (Novo, Ativo, Em queda, Sem scans, Pausado) no Overview com links para a lista filtrada.
- `/analytics` e `/api/analytics`: atalhos de 7/30/90 dias ou datas, período anterior, filtros por QR, dispositivo e país, scans, únicos, scans sem endereço, série diária, ranking, dispositivo, sistema, navegador, país e hora UTC.
- `/api/analytics/export`: CSV por dia e QR com proteção contra fórmulas.

## 4. Commits e pull requests

- `c1f19fb` feat: deliver QR creation wizard, static types and destination changes (lot 6) — PR #26, merge `e905477`.
- `bba47dd` feat: deliver consolidated analytics and QR lifecycle (lot 7) — PR #27, merge `ec65d95`.

## 5. CI e testes

| Verificação | Lote 6 | Lote 7 | Como reproduzir |
|---|---|---|---|
| Credenciais (histórico) | passou | passou | `node scripts/check-secrets.mjs --history` |
| Lint, tipos, build | passou | passou | `npm run lint && npm run typecheck && npm run build` |
| Segurança | 6/6 | 6/6 | `npm run test:security` |
| Unitários | 5/5 | 9/9 | `npm run test:unit` |
| Operações (backup/restauração) | 4/4 | 4/4 | `TEST_DATABASE_ADMIN_URL=<postgres local> npm run test:ops` |
| HTTP | 23/23 | 26/26 | `TEST_DATABASE_ADMIN_URL=<postgres local> npm run test:api` |
| Upgrade `0004 → 0005` com dados | ok | — | `node docs/lotes/06-criacao-e-detalhe/verificacao/upgrade-check.mjs <admin URL local>` |
| Navegador (build de produção local) | 21/21 | 12/12 | `docs/lotes/0N-*/verificacao/e2e.mjs` com `PLAYWRIGHT_MODULE` e `CHROMIUM_PATH` |
| CI GitHub (credentials, application) e Vercel | verde no PR #26 e na `main` `e905477` | verde no PR #27 | GitHub Actions `Checks` |

Capturas: `docs/evidence/lote-06/` e `docs/evidence/lote-07/` (contas e dados sintéticos).

## 6. Revisão de segurança

Dois agentes revisores independentes, somente leitura, um por lote. Nenhum achado crítico ou alto.

- Lote 6, corrigidos: mascaramento de Wi-Fi na busca e na visão geral, limite de bytes do SSID, mínimo de 8 caracteres para WPA, comprimento do destino após normalização. Documentados: payload na resposta da lista do próprio dono (necessário para desenhar o QR), ZIP em lote sempre em correção H, `/qr` de QR direto ainda redireciona como antes.
- Lote 7, corrigidos: consultas paralelas que podiam esgotar o pool (agora uma conexão por requisição), ciclo de vida com `EXISTS` e passagem única, CSV com espaços iniciais e sinais de largura total, tradução só de valores conhecidos. Documentados: o proxy precisa substituir `X-Forwarded-For`; leitores que buscam a URL por `okhttp`/`java` não contam.
- Isolamento por conta conferido por testes HTTP e de navegador com segunda conta em todas as rotas novas.

## 7. Deploy e URLs

- Homologação: <https://yousef-xi.vercel.app/> (Vercel + Neon `noisy-rain-62808360`, branch `production` = homologação).
- Lote 6: deploy da Vercel concluído para `e905477`. Migração `0005` aplicada por conexão direta com TLS verificado; o banco passou de 5 para 6 migrações, com `content` e a tabela de histórico com RLS. Smoke HTTP sem sessão: rotas públicas 200, privadas redirecionam para `/auth`, `/api/qr-codes/:id/destinations` responde 401 (rota publicada), POST de outra origem 403.
- Lote 7: deploy da Vercel concluído para `ec65d95`. Smoke HTTP sem sessão: `/analytics` e `/overview` redirecionam para `/auth`, `/api/analytics`, exportação e lista por ciclo de vida respondem 401. Sem migração.
- Produção: não publicada (#15 adiado).

## 8. Defeitos conhecidos e riscos

- Erro de hidratação React #418 em `/overview` no build de produção, já presente na `main` antes do Lote 7. A página funciona.
- `TRUST_PROXY_HEADERS` não confirmado como `true` na homologação: scanners únicos e deduplicação ficam inativos até a revisão da configuração.
- Retenção de eventos brutos sem expiração automática (decisão do proprietário).
- Reverter o Lote 6 depois de criar QRs estáticos exibiria payloads completos (inclusive senhas de Wi-Fi) na lista do próprio dono.
- Ciclo de vida calculado a cada leitura; volumes altos pedem agregação diária futura.
- jsQR não lê módulos redondos com gradiente; a leitura de designs estilizados depende do teste em celular.

## 9. Lotes pendentes

| Lote | Situação | Observação |
|---|---|---|
| 8 — Site público e entrada | Não iniciado; pronto para começar | Recuperação de senha e verificação de e-mail dependem de provedor de e-mail de teste autorizado |
| 9 — Biblioteca de arquivos | Não iniciado | Exige armazenamento de objetos compatível com a Vercel e credencial de teste |
| 10–12 | Não iniciados | Dependem de 9 |
| 13 — Organizações | Não iniciado | Base para 14–20 |
| 14–20 | Não iniciados | Dependências em cadeia; 18 e 19 exigem provedores e contratos comerciais |

## 10. Checklist humana consolidada

Use duas contas de teste suas na homologação (<https://yousef-xi.vercel.app/>), em desktop e celular, depois do deploy dos dois lotes.

1. **Criar Website dinâmico:** Criar novo → Website → URL → Dinâmico → nome → Próximo → escolha um template com logo → Criar. Na tela Concluído, baixe PNG 1024 px e leia com o celular: deve abrir a URL.
2. **Trocar o destino:** Meus QR Codes → detalhes do QR → nova URL → Alterar destino. Leia o mesmo QR impresso/baixado: deve abrir o novo destino. O histórico mostra a troca e os scans continuam.
3. **Wi-Fi:** crie um QR Wi-Fi da sua rede de teste; leia com o celular e confirme que conecta. Confirme que a lista mostra só "Wi-Fi · nome da rede".
4. **Tipos estáticos:** crie Texto, E-mail, Telefone e SMS; leia cada um no celular e confira o app aberto e o conteúdo.
5. **Árabe/RTL:** troque para العربية, crie um QR de Texto em árabe, baixe e leia no celular; confira alinhamento das etapas.
6. **Design estilizado:** baixe um QR com template de pontos e gradiente em SVG e PNG 2048 px e leia no celular.
7. **Rascunho:** comece um QR, preencha o conteúdo e clique no menu lateral: deve pedir confirmação.
8. **Analytics:** leia um QR rastreável algumas vezes; abra Analytics, confira os totais, aplique filtros de QR e dispositivo e exporte CSV; abra o CSV numa planilha.
9. **Ciclo de vida:** no Overview, clique em cada estado e confira a lista filtrada.
10. **Recusa de acesso:** com a segunda conta, abra `/analytics?qr=<id da primeira conta>` e confirme que não aparecem dados; tente abrir `/app?edit=<id da primeira conta>` e confirme a mensagem de erro.
11. **Configuração:** decida se a Vercel de homologação deve usar `TRUST_PROXY_HEADERS=true` para ativar scanners únicos e deduplicação.
