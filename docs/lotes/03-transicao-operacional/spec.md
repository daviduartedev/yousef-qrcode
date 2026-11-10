# Lote 3 — Publicação inicial com banco novo

Preparação em 02/11/2026 na branch `feat/lote-3-transicao-operacional`, criada de `main`/`origin/main` em `ba13e603d208ab0296030739ee18a7ff9daecb5e`. Especificação #11. A decisão posterior do proprietário de começar do zero substitui o escopo anterior de migração de dados e ponte legada. Lote 3 não inicia o roadmap R3.

## Problem Statement

A base e o editor dos Lotes 1 e 2 estão integrados e validados localmente. Ainda é necessário preparar o novo ambiente, comprovar recuperação, homologar a configuração real e publicar com acompanhamento e retorno. O proprietário confirmou que os dados antigos são descartáveis e escolheu começar sem importar usuários, QR Codes ou histórico, aceitando a perda de funcionamento dos QRs dependentes do serviço antigo quando ele for desligado.

## Solution

Publicar o produto em um novo Postgres vazio, com novas contas Better Auth, domínio definitivo e operação recuperável. Manter três fatias ativas: ambiente/backup/restauração (#12), homologação sem legado (#13, depende de #12), publicação/retorno (#15, depende de #13). A ponte (#14) foi retirada por decisão do proprietário. Não apagar nem desligar o serviço antigo como parte desta preparação.

## User Stories

1. Como gestor, quero começar com um banco novo para dispensar dados e dependências operacionais antigas.
2. Como novo usuário, quero criar minha conta para acessar o produto sem credenciais migradas.
3. Como usuário, quero que minha sessão e meus QRs sejam isolados de outras contas.
4. Como usuário, quero que novos QRs rastreáveis usem a origem HTTPS definitiva para poder distribuí-los.
5. Como gestor, quero preservar visual, idiomas, skills e proteções para não refazer entregas validadas.
6. Como operador, quero identificar homologação e produção separadamente para configurar o alvo correto.
7. Como proprietário, quero configurar conexões e segredos de forma privada para não divulgá-los.
8. Como operador, quero restaurar um backup do novo ambiente em alvo separado para comprovar recuperação.
9. Como operador, quero comprovar cadastro, sessão, isolamento e tracking hospedados para detectar problemas de configuração.
10. Como gestor, quero decidir a publicação com responsáveis, evidências de prontidão e observabilidade.
11. Como operador, quero ensaiar retorno preservando gravações novas para recuperar sem perder dados posteriores.
12. Como gestor, quero registrar a dispensa de contas e QRs antigos para evitar uma migração não desejada.

## Implementation Decisions

- Preservar Next.js, Drizzle, Better Auth e schema privado server-only. O novo Supabase hospeda Postgres; Supabase Auth não é adotado. Preservar visual, inglês/árabe, RTL, skills, lock, hooks e checks de credenciais.
- Hospedagem escolhida pelo proprietário: Vercel, inicialmente com origem estável `vercel.app` ainda não alocada, sem domínio próprio definido. Separar homologação e produção e validar pool/conexões no ambiente serverless antes de G2; não executar migrations automaticamente em todo build.
- Não importar usuários, hashes, sessões, QRs, scans, coordenadas, IDs ou short codes antigos. Não implementar importador, reset para contas migradas, reconciliação de legado ou ponte antiga. Novas contas usam o cadastro existente, sem perfil ou senha padrão.
- A escolha aceita descontinuidade dos QRs dependentes da URL antiga quando aquele serviço for desligado. Não afirma que desligá-lo já ocorreu nem autoriza sua exclusão nesta preparação. Acesso à origem deixou de ser pré-condição.
- Manter os identificadores: #12 infraestrutura/recuperação, #13 homologação sem importação, #14 cancelado, #15 publicação/retorno. Sequência ativa: #12 → #13 → #15; retirar bloqueios ligados à ponte.
- O proprietário prepara o novo projeto; conferir se já existe antes de criar novamente. Homologação e produção usam bancos/configurações separados. Aplicar migrations exclusivamente no destino confirmado com TLS verificado; inventariar hospedagem, domínio, permissões e responsáveis do novo ambiente.
- O destino inicia sem legado. Antes de liberar produção, confirmar ausência de contas/fixtures de homologação; não esvaziar bancos automaticamente para obter esse estado. Dados sintéticos pertencem somente a alvos de teste identificados.
- Definir escopo, integridade, retenção e backup do novo banco, incluindo schema de aplicação e histórico de migrations, e inventariar configuração/arquivos necessários à recuperação. Restaurar em alvo isolado com dados sintéticos representativos, sem e-mails reais. Backup de banco não substitui a guarda privada das configurações de retorno.
- Homologação comprova configuração de sessões/origem, banco, isolamento, redirecionamentos e persistência hospedados. Verificar o necessário nesse contexto, sem reexecutar toda a validação visual/editorial ou setup dos Lotes 1/2.
- Usar origem HTTPS definitiva antes de distribuir novos QRs. Não distribuir endereços temporários como definitivos. Conferir proxy confiável antes de habilitar headers de IP/localização; GPS permanece fora de escopo.
- Publicação exige revisão, checks pertinentes, dvd-tests, validação humana antes de commit/push/PR/merge, código integrado e go/no-go operacional. Aprovação do início do zero não substitui validação da entrega ou gates de produção.
- Definir janela, responsáveis, observabilidade, limiares de falha, duração do acompanhamento e retorno. Não há delta entre legado e destino; conservar todas as escritas do novo ambiente, inclusive scans públicos, durante publicação, manutenção e retorno.
- Ensaiar retorno em homologação com gravações posteriores ao marco do exercício. Preferir build compatível com design/tracking, manter colunas/migrations e preservar dados novos. Restaurar snapshot antigo sobre dados novos exige reconciliação explícita antes de reabrir escritas. Se trocar banco, testar a sequência completa. Não usar o Supabase antigo como destino de retorno.
- Evidências públicas contêm resultados agregados e referências sanitizadas. Conexões, backups, hashes, cookies, e-mails, IPs e dados identificáveis ficam privados. A execução autorizada acrescenta comandos de inspeção/preparação/backup/restauração e testes de CLI/SQL em bancos locais descartáveis; isso não comprova provisionamento ou recuperação no novo Supabase, homologação hospedada ou deploy.

## Testing Decisions

- Reutilizar os pontos aprovados: comandos de migrations/backup/restauração isolados, HTTP de auth/redirecionamentos e navegador/celular em homologação. Casos exclusivos de importação, contas migradas e ponte foram dispensados pela decisão do início do zero.
- Comandos: verificar alvo confirmado, migrations e recuperação com dados sintéticos; recusar alvo incorreto e ocultar valores em falhas. Não usar produção no runner automático ou funções internas como oráculo.
- HTTP no ambiente novo: cadastro/login/sessão/logout, isolamento entre duas contas autorizadas, origem indevida recusada, QR novo com 302 sem cache, HEAD sem evento e código inválido sem redirecionamento. Confirmar scans sem introduzir analytics novos ou scanner único.
- Navegador/celular: nova conta, QR criado no destino hospedado, salvar/reabrir e arquivo com origem definitiva, incluindo leitura real. Verificar a configuração nova não reabre os critérios locais já aceitos dos Lotes 1/2.
- Recuperação/retorno: comprovar preservação de usuários, QRs, design, modo e scans posteriores ao marco do exercício. Reverter código não restaura banco com segurança.
- Na preparação documental: links, consistência entre roadmap/spec/tickets, credenciais e revisão Standards/Spec incluindo arquivos não commitados. Sem UI nova para Drive, rebuild ou repetição de testes antigos.
- Após implementação executável: TDD nos novos comportamentos acordados, checks pertinentes, revisão e dvd-tests com checklist humana desmarcada. Acesso externo ausente é bloqueio registrado, não resultado aprovado.

## Out of Scope

- Migração/restauração da origem antiga, compatibilidade de usuários/hashes, ponte legada e continuidade dos QRs antigos.
- Apagar o projeto/banco antigo ou desligar serviços automaticamente.
- R3–R6, redesign, nova gestão/analytics, edição de destino, linkpages/cartões publicados e demais módulos futuros.
- Refazer Lotes 1/2, suas validações ou setup de skills.
- Pedir segredos pelo chat, divulgar dados privados ou usar senhas padrão.
- Commit/push/PR/merge antes da validação humana; deploy sem alvo e gates operacionais.

## Further Notes

Decisão explícita do proprietário em 02/11/2026: “Sim, começar do zero”, em resposta à pergunta que dispensava usuários, QRs e histórico e explicava a perda de funcionamento dos QRs dependentes do serviço antigo quando desligado. Substitui o planejamento de preservação de legado, sem representar operação executada. Pais #1/#6 permanecem abertos e suas entregas não são refeitas. O procedimento do Lote 2 continua como histórico, aplicável somente onde compatível com esta decisão.
