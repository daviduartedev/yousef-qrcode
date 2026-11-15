# Lote 13 — Organizações, membros, papéis e convites

Base: `main` em `156cb6a` (Lote 12, [PR #33](https://github.com/daviduartedev/yousef-qrcode/pull/33)). Branch: `feat/lote-13-organizacoes`. Escopo do roteiro: R6, item P22 e base de P29 da [auditoria](../../referencias/auditoria-paridade-uniqode.md). Migração `0011`.

## Modelo

| Conceito | Regra |
|---|---|
| Espaço de trabalho | Todo conteúdo pertence a um espaço de trabalho. Cada conta tem um espaço pessoal com o **mesmo id da conta**, então todo QR, arquivo, Linkpage, cartão e formulário existente continua com o mesmo dono sem reescrever dados. Organizações são espaços com membros. |
| Migração `0011` | Cria `workspaces`, `workspace_members` e `workspace_invitations` (RLS), cria primeiro os gatilhos e depois o espaço pessoal e a participação de dono para cada conta existente (nenhum cadastro feito durante a migração fica sem espaço); os gatilhos criam o espaço pessoal junto com uma conta nova (funciona com qualquer versão do código durante o deploy) e o apagam junto com a conta — se a conta apagada era a única dona de uma organização, o membro mais antigo vira dono, e a organização sem membros é removida —, e troca as chaves estrangeiras de `user_id` das tabelas de conteúdo para `workspaces`. Nenhum dado é apagado ou reescrito. |
| Espaço ativo | Escolhido no seletor da barra lateral e guardado no cookie `qrc_workspace` (HttpOnly, SameSite=Lax, Secure em HTTPS). O servidor confere a participação a cada requisição; cookie de espaço alheio volta ao espaço pessoal. Remoção de membro vale na requisição seguinte. Cada aba envia o espaço que está mostrando (`x-workspace-id`); depois de trocar de espaço em outra aba, as gravações dessa aba são recusadas com aviso para recarregar. |
| Papéis | Leitor: lê tudo (listas, editores, analytics, respostas e contatos). Editor: também cria, altera, publica e apaga conteúdo. Administrador: também convida, muda papéis entre editor e leitor e remove editores e leitores. Dono: também nomeia ou apaga a organização e gerencia administradores e donos. Toda organização mantém pelo menos um dono. Nas APIs, leitura exige `read` e qualquer outra operação exige `write`; os editores (`/app`, Linkpage, cartão, formulário) exigem `write`, então leitores não abrem editores. O papel de quem age é relido dentro da trava antes de mudar ou remover membros e apagar a organização. |
| Convites | Por e-mail e papel, válidos por 7 dias, de uso único, só o hash do token é guardado. O link é mostrado a quem convidou (funciona sem provedor de e-mail) e também enviado por e-mail quando há provedor. Aceitar exige sessão com o mesmo e-mail convidado e, quando há provedor de e-mail, endereço confirmado; o limite de membros é conferido de novo no aceite. Novo convite para o mesmo endereço substitui o anterior; convites podem ser revogados. |
| Organização | Até 10 organizações como dono por conta e 50 membros por organização. Apagar exige digitar o nome e apaga todo o conteúdo dela; os membros mantêm seus espaços pessoais. QRs publicados de espaços existentes continuam funcionando. |

## Tickets

| Ticket | Entrega | Estado |
|---|---|---|
| 13.1 | Esquema, migração `0011` com preenchimento e gatilhos, compatível com a versão anterior durante o deploy. | Entregue e verificado |
| 13.2 | Resolução do espaço ativo e matriz de papéis aplicada a todas as rotas e páginas dos módulos já integrados (QR, analytics, biblioteca, Linkpages, Cards, Forms). | Entregue e verificado |
| 13.3 | API de organizações, membros, papéis e convites. | Entregue e verificado |
| 13.4 | Seletor de espaço, tela de organização, página de convite, EN/AR. | Entregue e verificado |

## Verificação

| Verificação | Comando ou evidência | Resultado |
|---|---|---|
| Credenciais, lint, tipos, build | `node scripts/check-secrets.mjs --history`, `npm run lint`, `npm run typecheck`, `npm run build` | passou |
| Atualização de banco com dados (0010 → 0011) | banco local com contas, formulários e respostas: mesmas contagens, um espaço e um dono por conta, gatilhos de criação e exclusão | ok |
| Unitários e paridade EN/AR | `npm run test:unit` | 21/21 |
| HTTP: os 43 testes anteriores sem mudança (agora no espaço pessoal) e dois novos — conteúdo compartilhado, espaço pessoal separado, editor cria, leitor só lê (403 ao criar, apagar e convidar), editor não convida, cookie forjado volta ao pessoal, último dono não sai, administrador não cria dono, remoção imediata, QR público continua, exclusão só pelo dono com nome; convite preso ao e-mail, link de uso único, revogado, página de convite pede login, token inválido sem detalhes, membro não convidado de novo ; aba desatualizada recusada (409), leitor sem editor (404), endereço não confirmado não aceita convite | `npm run test:api` | 45/45 |
| Operações | `npm run test:ops` | 4/4 |
| Navegador (build de produção local) | `docs/lotes/13-organizacoes/verificacao/e2e.mjs` · capturas em `docs/evidence/lote-13/` | 18/18 |

## Segurança

Revisão independente sem achados críticos ou altos. Corrigidos: convite aceito por endereço não confirmado (com provedor de e-mail), papel desatualizado do administrador, gravação na organização errada por aba desatualizada, editor liberado para leitores, corrida da migração com cadastros, organização sem dono ao apagar a conta, limite de membros no aceite e envio do convite fora da resposta. Registrados: sem provedor de e-mail, o link do convite é a credencial (a tela e o e-mail tratam como segredo); limites de armazenamento e quantidade valem por espaço, então quem cria várias organizações soma limites até haver planos (Lote 19); donos podem rebaixar outros donos, desde que reste um.

## Referência e lacunas

A auditoria registrou organizações, membros e papéis atrás de plano comercial; o trial não permitiu exercitar convites. SSO, grupos, papéis por módulo, transferência formal de propriedade e trilha de auditoria ficam fora. Limites por plano entram no Lote 19.
