# Tickets — Painel e gestão de QR Codes

Fatia de homologação da [especificação #18](https://github.com/daviduartedev/yousef-qrcode/issues/18). O proprietário delegou as decisões de interface e pediu uma única validação humana após a implementação e os testes.

## 1. UI — Visão geral da conta ([#19](https://github.com/daviduartedev/yousef-qrcode/issues/19))

**Depende de** nenhum ticket.

Da visão geral em `/overview`, ver os totais dos próprios códigos e dos rastreáveis ativos e inativos. O menu autenticado permite ir à listagem e ao gerador, com acesso equivalente em celular, por teclado e em RTL. Conta vazia pode criar o primeiro QR. Testar isolamento dos totais com duas contas e a navegação em navegador.

Variante implementada **A — menu lateral**. A Visão geral usa a composição da Uniqode do Vídeo 1, aos 07:20: lateral com botão azul, busca no topo, faixa de estados, quatro cartões e área de desempenho com uma coluna lateral. Os cartões apresentam dados e ações do QRConnect. O gráfico usa scans registrados e compara períodos de 7, 14 ou 30 dias. A coluna lateral dá acesso à gestão de rastreáveis e aos QRs recentes. Em telas pequenas, a navegação passa para o topo.

## 2. UI — Paginação dos códigos ([#20](https://github.com/daviduartedev/yousef-qrcode/issues/20))

**Depende de** nenhum ticket. A rota de listagem já existe.

Percorrer 20 códigos próprios por página em ordem estável de criação. O servidor retorna resultados e totais da mesma consulta. A URL conserva a página e a listagem mantém reabertura, design Classic, PNG/SVG e estatísticas básicas. Verificar via HTTP os limites e o isolamento das páginas.

## 3. UI — Busca por nome ou destino ([#21](https://github.com/daviduartedev/yousef-qrcode/issues/21))

**Depende de** ticket 2.

Encontrar códigos próprios por trecho, sem distinguir maiúsculas de minúsculas. Alterar a busca volta à primeira página, o termo fica na URL e um resultado vazio oferece a ação de limpar. Verificar que paginação e total acompanham a busca e que registros de outra conta ficam fora dos resultados.

## 4. UI — Filtros por modo e estado ([#22](https://github.com/daviduartedev/yousef-qrcode/issues/22))

**Depende de** ticket 3.

Filtrar por modo direto/rastreável e por estado dos rastreáveis, combinando os filtros com a busca. Resultados, total e páginas refletem a combinação. Recarregar ou voltar recupera a consulta. Verificar os filtros pelo HTTP e no navegador.

## 5. UI — Pausar e reativar um QR rastreável ([#23](https://github.com/daviduartedev/yousef-qrcode/issues/23))

**Depende de** ticket 4, para atualizar a listagem filtrada após a mudança de estado.

Pausar um QR próprio e verificar `410` sem novo scan. Reativar e voltar a usar a mesma URL, com design, destino e histórico preservados. Atualizar os resultados e totais do filtro após sucesso. Em caso de erro, mostrar o estado confirmado e permitir nova tentativa. Verificar ciclo, isolamento e a ausência da ação em QRs diretos.

## 6. UI — Exclusão com consequência explícita ([#24](https://github.com/daviduartedev/yousef-qrcode/issues/24))

**Depende de** ticket 2, para ajustar a página após remover seu último item.

Antes de excluir, explicar que o arquivo de QR direto já distribuído conserva o destino e que a exclusão do rastreável interrompe o redirecionamento e remove o histórico associado. Após excluir, manter a consulta e voltar à última página disponível se necessário. Testar confirmação, cancelamento, falha e recusa de IDs de outra conta.

Após implementar os tickets, seguir a revisão, os checks, o dvd-tests e a validação humana do repositório.
