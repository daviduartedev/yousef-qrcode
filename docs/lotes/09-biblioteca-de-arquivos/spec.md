# Lote 9 — Biblioteca de arquivos

Base: `main` em `363ff25` (Lote 8, [PR #29](https://github.com/daviduartedev/yousef-qrcode/pull/29)). Branch: `feat/lote-09-biblioteca-de-arquivos`. Escopo do roteiro: R6, item P21 e uploads de P10 da [auditoria](../../referencias/auditoria-paridade-uniqode.md). Os usos em Linkpages (P15) e Cards (P17) entram nos Lotes 10 e 11 com a mesma biblioteca.

## Decisão de armazenamento

Os arquivos ficam no próprio Postgres (`bytea`), na tabela `assets`. Assim a hospedagem na Vercel não precisa de outro provedor nem de outra credencial, e backup e restauração continuam cobrindo tudo com `pg_dump`. Os limites mantêm o banco pequeno: 4 MB por arquivo (abaixo do limite de 4,5 MB do corpo de requisição da Vercel), 50 MB e 500 arquivos por conta. Se o volume crescer, a troca por armazenamento de objetos fica isolada em `src/server/assets.ts`. Migração aditiva `0007`: `asset_folders` e `assets`, ambas com RLS, com chave composta `(user_id, id)` para impedir mover um arquivo para pasta de outra conta.

## Contrato

| Área | Comportamento |
|---|---|
| Formatos | PNG, JPEG, WebP, GIF e PDF. O tipo vem da assinatura do conteúdo, não do nome nem do tipo declarado pelo navegador. SVG é recusado, porque pode carregar scripts. Imagens precisam ter cabeçalho legível, no máximo 10.000 px por lado e 25 megapixels. |
| Envio | `POST /api/assets` multipart com `file` e `folder_id` opcional; exige origem do próprio site, sessão e `Content-Length`. Envio múltiplo na tela, com relatório por arquivo. |
| Cota | Verificada no banco dentro de uma transação com trava por conta, para que envios simultâneos não ultrapassem o limite. |
| Organização | Pastas por conta (até 100, nomes únicos), mover, renomear, busca por nome, filtro por tipo e por pasta, paginação de 24. Excluir pasta mantém os arquivos na raiz. |
| Leitura | `GET /api/assets/:id/file` só para o dono, sem cache, com `nosniff`, `Content-Security-Policy: sandbox`, `Cross-Origin-Resource-Policy: same-origin` e `Content-Disposition` com nome codificado e alternativa ASCII com a extensão do tipo real (`?download=1` baixa). PDFs não usam `sandbox`, para o visualizador do navegador funcionar. |
| Reúso no QR | A aba Logo do editor mostra "Da sua biblioteca", com upload direto. O design guarda `logoAssetId`; o servidor só aceita imagem da mesma conta. A prévia, o PNG/SVG baixado e o ZIP em lote embutem a imagem como data URL, então o arquivo exportado não depende da sessão. O download espera o logo carregar; se o arquivo sumiu, o QR sai sem logo (nunca com um quadrado vazio) e o ZIP marca a linha como falha. O seletor pagina toda a biblioteca. |
| Remoção | Excluir avisa quantos QRs usam o arquivo. Esses QRs perdem o logo no design salvo, e os códigos já impressos continuam funcionando, porque o conteúdo do QR não muda. |

## Tickets

| Ticket | Entrega | Estado |
|---|---|---|
| 9.1 | Esquema, migração `0007`, detecção de tipo, dimensões e limpeza de nome. | Entregue e verificado |
| 9.2 | API de arquivos e pastas com isolamento por conta, cota e respostas seguras. | Entregue e verificado |
| 9.3 | Tela `/assets` com envio múltiplo, medidor de espaço, pastas, busca, filtro, renomear, mover, baixar, excluir e paginação, em EN/AR e celular. | Entregue e verificado |
| 9.4 | Logo da biblioteca no editor de QR, na prévia, no download e no ZIP; limpeza ao excluir. | Entregue e verificado |
| 9.5 | Backup e restauração verificam as novas tabelas. | Entregue e verificado |

## Verificação

| Verificação | Comando ou evidência | Resultado |
|---|---|---|
| Credenciais, lint, tipos, build | `node scripts/check-secrets.mjs --history`, `npm run lint`, `npm run typecheck`, `npm run build` | passou |
| Unitários: assinaturas (SVG com script, HTML e executável recusados), dimensões PNG/GIF/JPEG, nomes, paridade EN/AR | `npm run test:unit` | 14/14 |
| HTTP: tipo detectado, cabeçalhos de leitura, bytes idênticos, outra conta recebe 404 em leitura, edição e exclusão, origem externa 403, sem sessão 401; SVG, arquivo disfarçado, vazio, acima de 4 MB e acima da cota de 50 MB recusados; pastas, nomes duplicados, mover para pasta alheia (404), busca com `%` literal, logo próprio aceito e alheio, PDF ou inexistente recusados, exclusão limpando o design ; nomes com caracteres de controle bidirecional e `Content-Disposition` seguro | `npm run test:api` | 34/34 |
| Operações | `npm run test:ops` | 4/4 |
| Navegador (build de produção local) | `docs/lotes/09-biblioteca-de-arquivos/verificacao/e2e.mjs` · capturas em `docs/evidence/lote-09/` | 25/25 |

O roteiro de navegador confere: biblioteca vazia pelo menu, envio misto com SVG recusado, dimensões e medidor, pasta criada e filtrada, renomear, filtro por tipo e busca. No editor, escolhe o logo da biblioteca, confere a prévia com a imagem embutida, cria o QR e decodifica o SVG com jsQR. Também confere uso informado na biblioteca, aviso ao excluir, QR sem o logo depois da exclusão, outra conta sem acesso e a tela em árabe RTL no celular sem rolagem horizontal.

## Segurança

Revisão independente sem achados críticos ou altos. Corrigidos: download antes do logo carregar, seletor limitado à primeira página, logo apagado em paralelo (agora renderiza sem logo), pasta apagada durante envio (trava `FOR KEY SHARE`), limite de 25 megapixels, nome de download ASCII e RFC 5987, PDF visível, caracteres bidirecionais nos nomes, `Content-Length` estrito e verificação de tipo antes do envio no seletor. Registrado: `qr_uses` faz uma subconsulta por arquivo listado; um índice por expressão fica para quando houver volume.

## Referência e lacunas

A Asset Library da Uniqode foi vista na auditoria com pastas iniciais e paginação; o trial exige login e não permitiu exercitar envios. Pastas iniciais pré-criadas, arrastar e soltar, edição de imagem e vídeos não fazem parte deste lote.

## Pendências e riscos

- O teste antigo de paginação da lista de QRs falhou uma vez por empate de `created_at` no banco local e passou em três repetições seguidas; registrado como instável, sem relação com este lote.
- A cota por conta é fixa até haver planos (Lote 19).
