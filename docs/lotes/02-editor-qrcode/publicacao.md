# Publicação e retorno — pendências do R2

O editor do Lote 2 é validado localmente. Isto não conclui a primeira publicação do R2. Em 02/11/2026 não há novo Supabase configurado, exportação dos dados reais, ponte implantada no endereço antigo ou publicação autorizada deste lote.

**Atualização de escopo em 02/11/2026:** o proprietário escolheu começar do zero. O [Lote 3 — publicação inicial com banco novo](../03-transicao-operacional/README.md) é a referência vigente: sem importação de usuários/QRs/scans, compatibilidade de hashes, delta legado ou ponte. A continuidade dos QRs dependentes do serviço antigo foi dispensada, sem desligá-lo nesta preparação. As instruções abaixo preservam o procedimento histórico do Lote 2; os passos de legado foram substituídos por essa decisão e não devem ser executados como pré-requisitos atuais. Recuperação do banco novo e retorno com preservação de gravações novas continuam obrigatórios. Não repetir a validação local nem interpretar aprovação de escopo como publicação executada.

## Ensaio antes de publicar

1. O proprietário prepara o novo Postgres e configura a conexão, segredo de sessão e origem pública na configuração privada, conforme o README. Não enviar valores por chat, issues ou Git.
2. Fazer backup consistente do banco de origem e comprovar a restauração em ambiente separado. Migrations contêm estrutura, não registros de produção.
3. Importar usuários, QR Codes e scans em homologação, preservando IDs ou um mapeamento completo e todos os short codes. Resolver registros sem dono e compatibilidade dos hashes de senha antes de permitir acesso.
4. Aplicar todas as migrations no destino de homologação. A migration do Lote 2 somente acrescenta design JSON opcional e tracking habilitado por padrão. Não reconstituir aparência histórica: registros sem design usam Classic, preto sobre branco, sem logo/moldura.
5. Conferir contagens e amostras de propriedade, short codes, destinos e scans antes/depois. Testar contas distintas, reabertura, PNG/SVG e leitura em celular, incluindo logo e moldura.
6. Preparar a ponte na URL antiga da função Supabase com os mesmos short codes e testar QRs físicos já distribuídos. Alterar este repositório não muda o endereço impresso.

## Troca em produção

1. Aprovar o lote localmente e concluir as etapas de publicação de código previstas pelo projeto. Esta documentação não autoriza commit, push, PR, merge ou deploy.
2. Definir uma janela de escrita controlada ou sincronização explícita entre origem e destino; registrar início e fim e conferir as diferenças desde o ensaio.
3. Fazer backup final e importar o delta preservando identidade e propriedade. Validar totais e amostras novamente, com homologação separada do banco real.
4. Publicar a versão validada com a origem HTTPS correta. Confirmar sessões, links antigos e novos, scans, salvar/reabrir design e downloads no domínio final.
5. Acompanhar falhas, redirecionamentos e contagens de eventos. Não desligar o serviço antigo enquanto QRs distribuídos ainda dependerem dele.

## Retorno sem perder gravações novas

- Preservar o backup final, os registros gravados depois da troca e um ponto de referência temporal. Reverter o código não desfaz com segurança a migração de dados.
- A mudança de esquema é aditiva: conservar as colunas de design/tracking e o histórico de migrations durante um retorno. Não apagar colunas ou restaurar um backup antigo sobre dados novos sem reconciliação.
- Usar uma versão de retorno capaz de ler as novas colunas. O build anterior ao Lote 2 ignora design e modo direto; não liberar edição/download de novos registros nessa versão, pois apresentaria um QR diferente. Se for necessário usá-lo temporariamente, suspender essas escritas/downloads até disponibilizar um build compatível e preservar os dados criados após a troca.
- QR direto já exportado continua apontando diretamente ao destino; códigos rastreáveis e a ponte antiga precisam continuar servindo os mesmos short codes. Testar ambos antes de encerrar o incidente.
- Se o retorno também envolver trocar banco, exportar/reconciliar usuários e gravações posteriores ao backup com IDs/short codes preservados antes de reabrir escritas. Documentar e conferir o resultado.

## Rascunhos e navegação

As ações internas de saída pedem confirmação para descartar uma edição. O histórico do navegador mantém o rascunho em memória e apresenta uma faixa para retomá-lo ou descartá-lo; não reescreve o histórico. Fechar/recarregar com alterações pendentes usa o aviso nativo do navegador. Rascunhos não substituem o botão de salvar e não sobrevivem a uma recarga confirmada.
