# Operação do banco novo

O proprietário escolheu início do zero. Estes comandos não importam o legado e não apagam bancos, schemas ou registros existentes. Usar somente alvos identificados e isolados. A implantação hospedada ainda depende do novo Supabase, hospedagem e domínio; o ensaio local não conclui esses gates.

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

Seguir #13/#15 e [acessos/decisões](acessos-e-decisoes.md). Antes de publicar: homologação separada, validação humana, código integrado, domínio HTTPS, destino de produção sem legado/fixtures, backup/observabilidade/plantão e go/no-go.

Ensaiar retorno com uma gravação criada depois do marco do exercício. Preservar design/tracking e migrations e usar build compatível. Não restaurar snapshot antigo sobre gravações novas: definir pausa/captura de escritas (inclusive scans), preservar o delta do novo ambiente, restaurar em outro alvo e reconciliar antes da promoção quando necessário. Não há delta nem retorno ao Supabase antigo.

O procedimento não automatiza DNS, deploy, agendamento de backups, retenção, reconciliação de dados pós-snapshot ou desligamento da origem antiga. Esses itens continuam gates operacionais, não efeitos implícitos dos comandos.

Referências de comportamento dos clientes: [pg_dump](https://www.postgresql.org/docs/17/app-pgdump.html), [pg_restore](https://www.postgresql.org/docs/17/app-pgrestore.html) e [conexão para backup no Supabase](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore).
