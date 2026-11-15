# Operação do banco novo

O proprietário escolheu início do zero. Estes comandos não importam o legado e não apagam bancos, schemas ou registros existentes. Usar somente alvos identificados e isolados. O ensaio local não conclui os gates hospedados.

## Homologação e restauração no Neon

1. Usar `yousef-hml` como origem de homologação e confirmar um segundo projeto Neon vazio para a restauração, com PostgreSQL 18, a mesma versão principal da origem. Confirmar o operador e o acesso aos dois projetos.
2. Em cada projeto, copiar a conexão direta do painel **Connect** para o arquivo operacional privado correspondente. Para os comandos deste roteiro, usar `sslmode=verify-full` como única opção da URL. O ambiente de produção será configurado separadamente pelo operador do cliente.
3. Inspecionar os dois alvos. Para inicializar somente homologação, usar `db:prepare` ou executar [postgres-bootstrap.sql](postgres-bootstrap.sql) inteiro no SQL Editor do Neon. Usar a mesma função de banco proprietária das tabelas para o acesso da aplicação. Preservar o destino de restauração vazio até executar `db:restore`.
4. Usar dados sintéticos em homologação e seguir o ensaio de backup e restauração abaixo. Definir com o operador onde guardar o dump e seu manifesto, quem terá acesso e por quanto tempo. A recuperação de produção será validada no ambiente escolhido pelo cliente.

## Configuração privada por ambiente

Preservar `.env.local` do desenvolvimento. Criar arquivos privados separados e ignorados pelo Git: `.env.operations.staging`, `.env.operations.production` e `.env.operations.restore`. Usar o exemplo fictício da raiz como referência, sem versionar valores reais.

Cada arquivo informa `OPERATIONS_ENVIRONMENT` (`staging`, `production` ou `restore`) e `DATABASE_URL` do respectivo banco. Para `prepare`, informar também `APP_URL` (origem HTTPS exata, sem barra final) e `BETTER_AUTH_SECRET` aleatório de pelo menos 32 caracteres. O alias `local` aceita banco em localhost e origem local para ensaios. O comando exige que o alias do arquivo corresponda ao argumento explícito.

Usar conexão direta ou session pooler, com `sslmode=verify-full` remotamente. O comando operacional usa somente `DATABASE_URL` desse arquivo, sem herdar outra conexão de `.env.local` ou `DATABASE_MIGRATION_URL`. A URL aceita apenas a opção `sslmode`; certificados personalizados ou outras opções exigem adaptação explícita antes do uso. Não colocar conexão no terminal, chat ou issues.

Docker deve estar ativo. Os comandos de backup/restauração usam o cliente da imagem oficial `postgres:<major>-alpine`, da mesma versão principal do servidor, obtida se ainda não estiver disponível. Credenciais seguem por ambiente do processo, sem aparecer nos argumentos ou saídas. A conta do banco precisa ler os schemas de aplicação e migrations e exportar snapshots; a restauração precisa criar objetos no destino separado.

No Docker nativo Linux, o cliente local usa rede host para alcançar a porta vinculada a `127.0.0.1`, sem ampliar a exposição do banco. No Docker Desktop usa `host.docker.internal`. O ensaio desta execução ocorreu em Windows/Docker Desktop; a execução em Linux/CI ainda precisa de evidência própria.

## Inspecionar e preparar

```sh
npm run db:inspect -- --config .env.operations.staging --environment staging
npm run db:prepare -- --config .env.operations.staging --environment staging
```

`inspect` imprime apenas alias, inicialização, contagens agregadas e estado de RLS, sem URLs ou valores de registros. `prepare` requer ausência dos schemas `qrconnect`/`qrconnect_migrations` e de tabelas/outros objetos de dados em `public`, aplica migrations e inspeciona o resultado. Não substitui schema existente; migrations futuras de uma implantação já inicializada continuam seguindo revisão e o comando documentado de migrations. Schemas internos do provedor não são copiados nem removidos.

Confirmar separadamente as permissões efetivas e que `qrconnect` não está exposto à Data API. O campo de RLS confirma as tabelas, não comprova a configuração do painel ou toda a infraestrutura. Não usar o banco antigo como destino nem limpar um banco para fazê-lo parecer novo.

## Backup privado

Escolher nome único, diretamente sob `backups/`, contendo somente letras, números, hífen ou sublinhado. O diretório deve ser novo; o comando não sobrescreve backups.

```sh
npm run db:backup -- --config .env.operations.staging --environment staging --out backups/staging-20261102-01
```

O arquivo `database.dump` usa formato custom do Postgres, com `qrconnect` e `qrconnect_migrations`, sem proprietários ou ACLs da origem. Contagens e dump compartilham um snapshot consistente. `manifest.json` registra versão, alias, horário UTC, versão principal do Postgres, identificação opaca da origem, contagens e SHA-256. A integridade é conferida antes de restaurar; isso não autentica backups de terceiros. Usar somente arquivos próprios e guardados pelo operador.

O backup contém dados privados, inclusive contas/sessões Better Auth do **novo** sistema. Ambos os arquivos devem permanecer juntos, fora do Git e de evidências públicas. O comando solicita permissões restritas nos sistemas que as suportam; no Windows, conferir as permissões da pasta no sistema. Uma cópia somente neste computador não define retenção ou recuperação de desastre: o operador deve escolher guarda privada externa, periodicidade, retenção e teste de recuperação antes de concluir G1/G4. O comando não remove backups automaticamente.

Configurações privadas da hospedagem, segredo de sessão, domínio, certificados, roles/grants globais e arquivos externos não são recuperados por esse dump parcial. Inventariar e guardar o necessário separadamente. Não importar schemas internos Supabase, storage ou auth legado.

## Restaurar somente em banco separado

Preparar um banco novo de recuperação da mesma versão principal, com alias privado `restore`, **sem executar prepare nele**. Não apontar a aplicação nem liberar usuários nesse alvo antes da conferência.

```sh
npm run db:restore -- --config .env.operations.restore --environment restore --from backups/staging-20261102-01
npm run db:inspect -- --config .env.operations.restore --environment restore
```

O comando recusa alias incorreto, backup alterado/incompleto, a origem identificada pelo backup, schemas de aplicação existentes e objetos em `public`. A carga usa uma transação, sem `clean`/drop, e confere contagens e RLS após a carga. Se a conferência falhar, manter o destino isolado e investigar; não há limpeza automática nem permissão para substituir produção.

Ensaiar com registros sintéticos representativos e observar também conteúdo/design/modo/scans e acesso por HTTP/navegador. Só contagens não demonstram que todos os comportamentos da aplicação estão prontos. Uma recuperação real exige conferir o canal privado, proprietário das tabelas, configurações e política de sessões antes de promover o novo destino.

## Publicação e retorno

O [#13](https://github.com/daviduartedev/yousef-qrcode/issues/13) recebeu aceite em 11/11/2026 com evidência HTTP e dispensa da rodada manual hospedada. Para preparar o [#15](https://github.com/daviduartedev/yousef-qrcode/issues/15), confirmar os alvos e responsáveis em [acessos e decisões](acessos-e-decisoes.md). A homologação usa Vercel e Neon PostgreSQL 18. A branch Neon `production` do projeto `yousef-hml` pertence à homologação.

### Confirmar alvos e acesso

1. Identificar quem tem acesso administrativo à homologação para alternar deployments e consultar logs. Confirmar com o cliente os provedores e aliases dos projetos de produção para aplicativo e PostgreSQL, separados da homologação. Identificar quem opera o deploy, o banco e o DNS, e quem decide a publicação e o retorno.
2. Registrar a origem HTTPS definitiva e quem controla o DNS/TLS. Conferir que a origem coincide com `APP_URL` e com o endereço usado pelos novos QRs rastreáveis. Configurar `DATABASE_URL` do runtime com pool e TLS verificado e um `BETTER_AUTH_SECRET` próprio do ambiente pelo canal privado do operador.
3. Antes de liberar tráfego, conferir migrations, permissões e ausência de legado e de fixtures no banco de produção confirmado. Usar inspeção e evidência agregada.

### Ensaiar o retorno em homologação

1. Selecionar o build candidato e o build que o operador conseguirá ativar no retorno. Registrar o commit e a referência privada de cada deployment. Para a primeira publicação, identificar explicitamente o artefato de retorno disponível. Verificar compatibilidade com o schema vigente, autenticação, design e tracking. Agendar a janela do ensaio com o operador.
2. Registrar o horário do marco e as migrations aplicadas. Depois do marco, cadastrar uma conta sintética, salvar e editar o design de um QR rastreável e escaneá-lo. Guardar evidência privada da conta, do QR, do design, do modo, do destino, do evento e do contador. Conferir que o `GET /qr` redireciona com `302` sem cache e que o evento foi gravado. `HEAD /qr` serve para verificar o redirecionamento sem criar scan.
3. Antes da troca, planejar como editor, APIs de escrita, cadastro e scans públicos serão tratados. Se a troca exigir pausa, testar o controle também em `GET /qr` e medir o impacto no redirecionamento. Acompanhar o término das requisições em andamento antes de considerar as escritas pausadas. Alternar para o build de retorno preservando a origem, o banco e as migrations.
4. No build de retorno, entrar com a conta criada depois do marco, reabrir o QR e conferir design, modo, destino, evento e contador. Repetir uma gravação do editor e um scan para comprovar que os dois fluxos seguem gravando. Registrar o tempo de recuperação, o resultado e a referência da evidência sanitizada. Restabelecer a versão de homologação acordada e remover os dados sintéticos do exercício.
5. Se a estratégia exigir troca de banco, ensaiar também a sequência completa com um alvo isolado. Pausar ou capturar as escritas, incluindo scans, e reconciliar o que foi gravado após o snapshot antes de apontar o aplicativo ao alvo restaurado e reabrir escritas. Conferir novamente os registros e os fluxos do passo anterior. O retorno precisa preservar as gravações já confirmadas.

### Decidir e acompanhar a publicação

- **Antes do go/no-go**, combinar com o operador a janela e o fuso, o plantão, o canal de alertas, a duração da observação, os limiares de falha e o tempo de recuperação aceitável. Usar como sinais a saúde da origem HTTPS, falhas de auth e de gravação no editor, erros no redirecionamento e scans que deixem de persistir. Vincular a evidência do ensaio ao build validado.
- **Recuperação hospedada.** O [#12](https://github.com/daviduartedev/yousef-qrcode/issues/12) segue aberto com backup e restauração hospedados adiados. Registrar com o operador como a recuperação de produção será tratada antes de decidir a publicação, incluindo guarda, retenção e restauração. Um ensaio bem-sucedido de troca de build cobre o retorno do aplicativo com o banco preservado.
- **Go/no-go.** Conferir G4, código integrado, revisão, checks e validação humana aplicáveis, alvos confirmados e retorno ensaiado. Falha em cadastro/login, isolamento, persistência, redirecionamento ou registro de scans exige investigação antes de liberar. Publicar somente após decisão explícita de publicar.
- **Após a publicação**, conferir na origem final novas contas, isolamento, salvar/reabrir, exportação PNG/SVG, leitura de QR novo e registro de eventos. Acompanhar os sinais no período combinado, acionar o retorno conforme os critérios acordados e registrar o resultado e o aceite de G5.

O procedimento não automatiza DNS, deploy, agendamento de backups, retenção, reconciliação de dados pós-snapshot ou desligamento da origem antiga. Esses itens continuam gates operacionais, não efeitos implícitos dos comandos.

Referências de comportamento dos clientes: [pg_dump](https://www.postgresql.org/docs/17/app-pgdump.html), [pg_restore](https://www.postgresql.org/docs/17/app-pgrestore.html) e [conexão para backup no Supabase](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore).
