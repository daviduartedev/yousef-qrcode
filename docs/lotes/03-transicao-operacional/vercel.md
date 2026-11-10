# Publicação em Supabase + Vercel

Escolha do proprietário em 02/11/2026: usar Supabase + Vercel por enquanto, sem domínio próprio definido. A configuração real de contas/projetos ainda não foi acessada. Este roteiro prepara #12/#13/#15 e não comprova deploy ou libera publicação antes dos gates.

## Alvos e acesso

1. Confirmar as contas autorizadas e criar/identificar o **novo** Supabase para homologação e um destino separado de produção. Manter o schema `qrconnect` privado, sem Data API e sem Supabase Auth. O proprietário pode preparar pelo painel ou conectar a integração; não enviar credenciais ao chat.
2. Identificar time/projeto Vercel e a origem de homologação estável. Separar Preview e Production e seus respectivos bancos e segredos. O projeto precisa de permissão de leitura do repositório `daviduartedev/yousef-qrcode`; não copiar histórico/ambientes antigos.
3. Não acionar deploy automático de produção ao vincular Git antes de G4. Preparar as configurações e validar o lote antes de commit/push; o primeiro deploy e a promoção são ações operacionais posteriores, não parte implícita de criar um projeto.
4. Usar o endereço estável atribuído pela Vercel terminado em `vercel.app` como origem inicial, depois de conhecer o nome efetivamente disponível. Não inventar uma URL nem distribuir QRs com endereço exclusivo de um deployment descartável. Futuro domínio próprio exige preservar o endereço anterior se houver QRs que dependam dele.

## Configuração da aplicação

Usar o preset Next.js, raiz do repositório, instalação pelo lock e build `npm run build`, com Node compatível com o README. Não usar exportação estática: auth, APIs e `/qr` dependem do runtime de servidor. A integração nativa dispensa um Dockerfile da aplicação ou um arquivo Vercel de roteamento adicional para estas rotas.

Configurar privadamente em cada escopo Vercel:

| Variável | Uso |
|---|---|
| `DATABASE_URL` | Conexão do runtime ao banco correspondente, com TLS verificado; nunca pública |
| `BETTER_AUTH_SECRET` | Valor aleatório próprio de cada ambiente, pelo menos 32 caracteres |
| `APP_URL` | Origem HTTPS exata usada para entrar e criar/alterar QRs naquele ambiente |
| `TRUST_PROXY_HEADERS` | Manter `false` até confirmar headers sobrescritos pelo proxy e verificar seu comportamento |

`OPERATIONS_ENVIRONMENT` pertence aos arquivos privados dos comandos de operação; não é necessário para o navegador ou build. Migrations e backups são executados no canal operacional privado, antes da publicação, não como um efeito de todo build Preview. `DATABASE_MIGRATION_URL`, quando usada pelo comando existente de migrations, deve apontar ao mesmo destino lógico por conexão direta/session; não é chave Supabase API.

Para runtime serverless, o Supabase orienta transaction pooler, cliente reutilizado e poucas conexões por instância. Antes de G2, confirmar compatibilidade com as transações do aplicativo e adequar o limite de conexões: o código integrado usa `pg.Pool` reutilizado com máximo 5, ainda não validado nesta hospedagem. A adequação e os testes HTTP pertencem à fatia #13, sem desativar a verificação TLS. Para os novos comandos operacionais, usar conexão **direta ou session**, por causa do snapshot que precisa permanecer na mesma sessão.

Na homologação Preview, usar sempre o mesmo alias estável configurado em `APP_URL`; acessar uma URL diferente pode fazer a validação de origem/sessão recusar a operação. Confirmar como a proteção de acesso da Vercel se aplica ao navegador, HTTP e leitura no celular antes do teste; não compartilhar segredos de bypass. Não tornar um Preview equivalente a produção por apontá-lo ao banco real.

## Passagem pelos gates

- **G1/#12:** alvos privados confirmados, migrations, recuperação ensaiada no novo ambiente e guarda/retenção de backups definidas. O ensaio em Docker local não conclui G1 hospedado.
- **G2/#13:** usar novas contas autorizadas e banco isolado; confirmar sessão, isolamento, origem, persistência, redirecionamento/scans e leitura do QR no ambiente Vercel. Não refazer toda a validação visual do Lote 2.
- **G4/#15:** revisão, checks, dvd-tests, validação humana e integração do código concluídas; retorno compatível ensaiado, configuração de produção pronta, responsável, observação e go/no-go definidos.
- **G5/#15:** publicar/promover apenas a versão validada, confirmar novas contas e QRs na origem final e observar falhas/eventos pelo período acordado. Rollback de deployment não restaura/reconcilia o banco; seguir [operação](operacao.md).

Backups não ficam no filesystem efêmero da função. Selecionar guarda externa privada, retenção e agendamento operacional antes do aceite; estes comandos não criam um cron ou contratam serviço. QRs/contas antigos e a exclusão do Supabase antigo continuam fora do lote.

Referências: [Next.js na Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs), [escopos de variáveis](https://vercel.com/docs/environment-variables), [endereços Vercel](https://vercel.com/docs/domains/working-with-domains) e [conexões Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres).
