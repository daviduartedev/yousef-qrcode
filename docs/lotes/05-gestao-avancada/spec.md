# Lote 5 — Navegação e gestão avançada de QR Codes

Base: [Lote 4, PR #25](https://github.com/daviduartedev/yousef-qrcode/pull/25), aceito em 15/11/2026. Branch: `feat/lote-5-gestao-avancada`. Alvo hospedado: Vercel e Neon de homologação. O #15 continua adiado.

| Ticket | Entrega | Dependência |
|---|---|---|
| 2.1 | Lateral recolhível no desktop. Gaveta no lado inicial da leitura, com foco contido, Escape, retorno ao botão e seleção da rota. | Lote 4 |
| 2.2 | Campo global com Ctrl/⌘+K, sugestões de até oito QRs da conta por nome e destino, setas, Enter e Escape. Uma sugestão abre o registro exato na lista; Enter sem item ativo abre todos os resultados. | Lote 4 |
| 2.3 | Lista ou grade, ordem por criação, atualização, nome ou scans, com desempate estável. URL preserva a visualização, a ordenação e a página. | Lote 4 |
| 2.4 | Até seis condições AND por nome, destino, modo, estado de rastreamento, scans e datas em UTC. Operadores próprios de cada campo; as condições combinam com o texto, a ordenação e a paginação no servidor. | 2.3 |
| 2.5 | Criar, renomear e excluir pastas e rótulos da conta. Mover um QR para uma pasta, atribuir vários rótulos e acompanhar rastreáveis. Remover uma pasta conserva os QRs. Os três recortes se combinam na listagem. | 2.4 |
| 2.6 | Selecionar registros na página, baixar PNG ou SVG em ZIP com o design e destino preservados e adicionar rótulos existentes. Resultados parciais identificam os QRs que falharam. Até 20 QRs e 20 rótulos por ação. | 2.5 |
| 2.7 | Baixar modelo, abrir CSV com prévia, conferir linhas inválidas, importar as válidas e consultar o resumo por linha. Contrato: CSV UTF-8 até 128 KiB e 50 linhas de dados; `title,destination_url[,mode]`; QR Website com URL HTTP(S), modo `direct` ou `tracked` (padrão) e design Classic. Repetir o mesmo envio após uma falha reutiliza os registros já criados. | 2.6 e contrato do arquivo |

Os QRs continuam editáveis no gerador e mantêm downloads individuais, estatísticas, pausa, reativação e exclusão. Telas e mensagens acompanham inglês e árabe. Todas as rotas privadas derivam o dono da sessão. O acompanhamento é uma lista de gestão, sem notificações por e-mail. Os cartões, atalhos de módulos futuros, busca por imagem, ciclo de vida da referência, importação de outros tipos e opções de planos ficam fora deste lote.

## Referência e lacunas

A tentativa de abrir `/qr-codes` na Uniqode redirecionou para o login. O vídeo arquivado mostra a navegação desktop, a busca no topo e a lista carregando. A [auditoria de paridade](../../referencias/auditoria-paridade-uniqode.md) registra gaveta mobile, lista vazia, seletor de pastas, ordenação, filtros e entrada de upload bloqueada pelo plano. Foram usadas também a ajuda oficial de [busca](https://docs.uniqode.com/en/articles/9053812-how-to-use-global-search-to-find-your-campaigns), [lista e filtros](https://docs.uniqode.com/en/articles/8885163-how-to-find-qr-codes-with-filters), [pastas](https://docs.uniqode.com/en/articles/12380574-organize-your-qr-codes-with-folders), [rótulos](https://docs.uniqode.com/en/articles/5140761-how-to-use-labels-with-qr-codes), [acompanhamento](https://docs.uniqode.com/en/articles/9728156-how-to-use-a-watchlist-to-receive-qr-code-scan-notifications), [ações em lote](https://docs.uniqode.com/en/articles/5516399-bulk-operations-on-qr-codes) e [importação](https://docs.uniqode.com/en/articles/3180578-how-to-create-qr-codes-in-bulk).

Ficaram sem conferência direta na referência: foco e retorno da gaveta, navegação por teclado e estados dos resultados da busca, lista preenchida e persistência na URL, resultado de organizar registros, resultado parcial de ações em lote e telas internas de prévia, erros e resumo da importação. O comparativo usa os quadros arquivados para a composição comprovada e identifica as capturas que mostram apenas QRConnect.

## Homologação

A migração aditiva `0004_qr_organization.sql` cria as tabelas privadas e inicializa os registros existentes sem pasta e fora da lista de acompanhamento. Após o aceite humano, aplicar as migrações com conexão direta ao Neon de homologação antes de disponibilizar o novo código na Vercel. O runtime mantém a conexão do ambiente. Testar na origem HTTPS configurada com duas contas autorizadas, QRs sintéticos e a versão do lote confirmada. O build da Vercel não modifica o banco.
