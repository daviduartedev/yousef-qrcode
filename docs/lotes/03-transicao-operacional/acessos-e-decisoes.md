# Acessos e decisões — início do zero

Registro em 02/11/2026. Pendente significa sem prontidão/execução comprovada; não presumir inexistência fora desta conversa. Guardar valores e evidências identificáveis apenas em canal privado.

Em 10/11/2026, o proprietário escolheu Neon Free para o PostgreSQL de homologação e do ensaio de restauração. A decisão substitui a escolha anterior de Supabase para esses dois alvos. O cliente definirá o provedor e o operador de produção. Better Auth continua no aplicativo. A Vercel segue como opção prevista para hospedar o aplicativo de homologação, com projeto e origem ainda por confirmar. Ver [preparação dos bancos Neon](operacao.md#homologação-e-restauração-no-neon).

O projeto Neon de homologação `yousef-hml` foi vinculado à branch Neon chamada `production`. O banco PostgreSQL 18 estava vazio e recebeu as migrations do Drizzle. O destino de restauração e a hospedagem do aplicativo seguem pendentes.

## Decisões estabelecidas

- Main em `ba13e603`, Lotes 1/2 validados, PR #10 MERGED; pais #1/#6 abertos. Preservar interface, inglês/árabe/RTL, skills e proteções.
- Proprietário confirmou acesso ao Supabase antigo e pode criar outro; nenhum novo projeto confirmado pronto.
- **D0 resolvida:** respondeu “Sim, começar do zero” após ser informado de que não seriam importados usuários, QRs ou histórico e de que QRs dependentes do serviço antigo parariam quando desligado.
- Migração de dados/auth, hashes, reconciliação e ponte foram retiradas. Legado não é pré-condição. O projeto antigo não foi apagado/desligado por essa decisão.
- Destino segue Postgres no novo Supabase e Better Auth no schema privado; Supabase Auth não é necessário.
- Hospedagem escolhida: Vercel. Sem domínio próprio definido; usar inicialmente a origem estável `vercel.app` efetivamente atribuída ao projeto. Projetos/contas ainda não acessados, integrações Supabase/Vercel encontradas mas sem conexão confirmada.
- Sequência #12 → #13 → #15; #14 retirado como não planejado, sem alegar implementação. Aprovação de escopo não conclui validação humana nem libera commit/push/deploy.

## Acessos ao novo ambiente

Responsáveis são papéis a atribuir. O proprietário confirma a conta Neon de homologação e o acesso do operador; o cliente confirma a operação de produção. Informar apenas estado e referências sanitizadas, sem conexão, token, senha, hash ou cookie no chat/GitHub.

| ID | Recurso | Estado | Próximo passo | Fatia |
|---|---|---|---|---|
| A2 | Backup/recuperação novos — operador | Ensaio local passou; recuperação hospedada e guarda externa não comprovadas | Definir guarda privada/retencão e comprovar schema/migrations/configuração no alvo remoto separado | 3.1 |
| A3 | PostgreSQL — proprietário e cliente | Homologação inicializada no Neon; restauração e produção pendentes | Confirmar destino de restauração isolado com PostgreSQL 18 e banco de produção separado sob gestão do cliente | 3.1–3.2 |
| A4 | Vercel — operador | Provedor escolhido; conta/time/projeto e acesso não confirmados | Homologação e produção separadas, configuração privada, HTTPS, logs sanitizados e artefatos de retorno | 3.1–3.4 |
| A5 | Novas contas de homologação — responsável pelos testes | Sem perfis permanentes definidos | Duas contas autorizadas isoladas, sem senha padrão, sem copiar legado nem levar fixtures a produção | 3.2 |
| A7 | Origem Vercel/TLS — proprietário | Sem domínio próprio; origem estável `vercel.app` ainda não alocada | Confirmar URL efetiva e `APP_URL` de cada ambiente antes de distribuir QRs; domínio próprio pode ser decidido depois | 3.2–3.4 |
| A9 | Operação/plantão — gestor | Responsáveis/janela não definidos | Go/no-go, observabilidade, acompanhamento e retorno | 3.4 |

A1 (origem), A6 (função antiga), A8 (contas antigas) e A10 (políticas antigas) deixam de ser requisitos. Isso dispensa trabalho sobre legado; não declara sua segurança, limpeza ou desligamento.

## Decisões pendentes

| ID | Decisão | Critério | Responsável / bloqueio |
|---|---|---|---|
| D1 | Recuperação do banco novo | Escopo, retenção, integridade, guarda privada, configuração necessária e restauração com dados sintéticos em alvo separado | Proprietário + operador; #12 |
| D6 | Origem HTTPS definitiva | Domínio final, DNS/TLS e homologação separados; novos QRs não usam URL temporária como definitiva | Proprietário + operador; #13/#15 |
| D7 | Janela/escritas no novo ambiente | Controlar editor/API e scans durante mudanças/retorno, preservando registros posteriores; sem delta legado | Gestor + operador; #15 |
| D8 | Publicação/acompanhamento | Responsáveis, período de observação, limiares de falha e go/no-go | Gestor + plantão; #15 |
| D9 | Retorno/ponto de recuperação | Build compatível com design/tracking, preservação de novas gravações e ensaio completo se trocar banco; definir tempo/perda aceitáveis | Gestor + operador; #15 |

D2–D5 (hashes/provedores antigos, órfãos/mapeamentos, campos legados e contadores históricos) dispensadas por D0. Continuidade dos QRs antigos também dispensada; não é decisão pendente.

## Gates

| Gate | Evidência para concluir | Estado |
|---|---|---|
| G1 — novo ambiente recuperável | Destinos/configuração identificados, migrations e backup do novo banco restaurado separadamente com dados sintéticos conferidos | Ensaio local passou; pendente de A2–A4/D1 no ambiente hospedado |
| G2 — homologação sem legado | Novas contas isoladas, sessões, origem, persistência e QRs/downloads confirmados no ambiente hospedado; sem importação antiga | Pendente de G1, A5/A7 e D6 |
| G3 — ponte | Dispensado por D0; não implementado | Não aplicável |
| G4 — prontidão de publicação | Homologação aprovada, retorno ensaiado com gravações posteriores, alvo de produção sem legado/fixtures confirmado, observabilidade e responsáveis definidos, código revisado/validado pelo humano | Pendente de G2, A9 e D7–D9 |
| G5 — produção acompanhada | Versão no domínio final, novas contas/QRs funcionando, scans/falhas observados pelo período acordado; sem requisito de URLs antigas | Pendente de G4 e publicação |

Nenhum gate aplicável foi concluído. Os comandos de preparação/backup/restauração foram ensaiados em bancos locais descartáveis, com dados sintéticos e destino separado. O banco Neon de homologação está inicializado. Guarda e retenção de backups, restauração hospedada, implantação do aplicativo e operação de produção permanecem pendentes.

## Evidências privadas

Registrar ticket, alias do ambiente, papel do operador, data/hora com fuso, código/schema, referência privada, resultado agregado e próximo gate. Relatórios públicos não contêm linhas de banco, e-mails, IPs, cookies, conexões ou hashes de credenciais. Preservar gravações novas no retorno: iniciar vazio não torna descartáveis os futuros dados de produção.
