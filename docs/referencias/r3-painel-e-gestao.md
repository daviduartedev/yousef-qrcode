# R3 — Painel e gestão de QR Codes

Especificação validada pelo proprietário e publicada no [#18](https://github.com/daviduartedev/yousef-qrcode/issues/18). A primeira fatia do R3 será desenvolvida e validada em homologação, com a publicação em produção adiada no [#15](https://github.com/daviduartedev/yousef-qrcode/issues/15). Ver [tickets aprovados](r3-painel-e-gestao-tickets.md).

## Resultado esperado

O usuário entra na área autenticada, vê um resumo dos próprios QR Codes, encontra um código específico e consegue reabrir seu design, baixar o arquivo, controlar o redirecionamento de um QR rastreável ou excluir o registro.

Hoje, **Meus QR Codes** já lista os códigos da conta, reabre o editor, baixa arquivos, exclui registros e mostra estatísticas básicas por QR. A busca, os filtros, a paginação e o controle de ativação passam a fazer parte da gestão. O redirecionador já reconhece o estado inativo.

## Referência visual

Usar a composição do painel da Uniqode no **Vídeo 1, 07:20** (`video-1/detail-440.jpg`): menu lateral, barra superior, faixa de estados, cartões de resumo, gráfico de scans e coluna de atividade. Preencher os cartões e a coluna com os dados e ações de QR Codes disponíveis no QRConnect. Manter a identidade do produto e a experiência em inglês e árabe, incluindo RTL. O [resumo dos vídeos](analise-dos-videos.md#vídeo-1-funcionalidades-mostradas-na-referência) descreve o contexto da gravação.

## Entrega

| Área | Comportamento |
|---|---|
| Navegação | Menu autenticado com **Visão geral** em `/overview`, **Create New** em `/app` e **QR Codes** em `/my-qrcodes`. Como no trial, o link da listagem e a seta do submenu são controles separados. O submenu abre os filtros de rastreáveis ativos, inativos e diretos. No desktop, a lateral pode recolher para um trilho de ícones e conserva a preferência ao navegar. No celular, as mesmas rotas permanecem acessíveis pelo menu compacto. As estatísticas básicas ficam no detalhe de cada QR. |
| Visão geral | Resumo da própria conta com total de códigos e contagem de rastreáveis ativos e inativos. Acesso direto à listagem, inclusive quando a conta está vazia. |
| Listagem | Reusar a rota `/my-qrcodes`. Buscar por trecho do nome ou destino sem distinguir maiúsculas de minúsculas, filtrar por modo direto/rastreável e, para rastreáveis, por estado. Combinar filtros no servidor, com 20 códigos por página e ordem estável por criação. Manter busca, filtros e página na URL para permitir recarregar ou voltar à mesma consulta. |
| Ações | Reusar edição de design, PNG/SVG e exclusão com confirmação. Expor ativação e desativação apenas em QRs rastreáveis. Mostrar feedback de sucesso ou falha e atualizar a lista após a confirmação do servidor. |

## Critérios de aceite

- [ ] Uma conta vazia vê um caminho para criar o primeiro QR. Uma busca sem correspondência oferece ação para limpar os filtros.
- [ ] Busca, filtros, totais e páginas refletem a mesma consulta, sempre restrita à conta autenticada. Duas contas com dados semelhantes veem apenas os próprios registros.
- [ ] Navegar entre páginas conserva os filtros. Alterar a busca ou um filtro volta à primeira página. Após excluir o último item de uma página, a lista volta à última página disponível.
- [ ] Reabrir, editar e baixar continuam funcionando em registros existentes, inclusive quando o design usa o padrão Classic. A edição mantém o destino e a identidade do registro.
- [ ] Desativar um QR rastreável faz sua URL pública retornar `410` sem registrar scan. Reativar restaura o redirecionamento na mesma URL. Design, destino e scans anteriores permanecem preservados nas duas ações.
- [ ] Um QR direto continua codificando o destino no arquivo, inclusive após excluir o registro salvo. A interface explica a consequência antes da exclusão. Um QR rastreável excluído deixa de redirecionar, e a confirmação informa a perda do histórico associado.
- [ ] Operações sobre IDs de outra conta são recusadas pelo servidor. Em caso de falha, a interface mostra o estado confirmado e permite tentar novamente.
- [ ] Navegação, busca, filtros, paginação e ações funcionam com teclado e em tela pequena. Inglês e árabe mantêm idioma e direção ao navegar e recarregar.

## Fatias seguintes do R3

O criador em etapas, a expansão dos tipos de QR, a troca de destino de um código dinâmico e a área de analytics com períodos, métricas consolidadas e exportação entram em especificações próprias. Ver [roadmap do R3](../../ROADMAPS.md#r3--gestão-de-qr-codes-e-analytics).

## Validação prevista

Verificar busca, paginação, isolamento e ativação pelo HTTP com duas contas sintéticas. Confirmar em navegador o fluxo de gestão, as confirmações de exclusão e a navegação responsiva em inglês e árabe. A execução e os tickets ficam vinculados ao lote de implementação.
