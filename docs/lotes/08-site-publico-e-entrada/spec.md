# Lote 8 — Site público e entrada no produto

Base: `main` em `9706ee1`. Branch: `feat/lote-08-site-publico-e-entrada`. Escopo do roteiro: R2, itens P01 e P02 da [auditoria](../../referencias/auditoria-paridade-uniqode.md). Migração aditiva `0006`: tabela `account_email_dispatches` (com RLS) para limitar envios por conta.

## Contrato

| Área | Comportamento |
|---|---|
| Navegação pública | Cabeçalho fixo com Funcionalidades, Analytics, Soluções, Preços e Perguntas frequentes, todos apontando para seções existentes da landing. No celular, botão de menu com `aria-expanded`, fechamento por Esc e atalhos de login e cadastro. Com sessão ativa, o cabeçalho mostra "Abrir painel". |
| CTAs | "Iniciar teste grátis" abre o cadastro (`/auth?mode=signup`); com sessão, o botão principal cria um QR. "Agendar demonstração" e "Falar com vendas" saíram porque não existe canal comercial; o segundo botão do hero leva às funcionalidades. Os planos de preço levam ao cadastro; cobrança fica no Lote 19. |
| Rodapé | Somente destinos reais: seções da landing e páginas de conta. Links de empresa, jurídico e redes sociais sem conteúdo foram retirados até haver texto aprovado. |
| Cadastro e login | Uma tela com dois modos. O cadastro pede nome, e-mail, senha (8–128 caracteres) e confirmação. Erros aparecem junto ao campo (`aria-invalid` e `aria-describedby`), com foco no primeiro campo inválido. Erros de servidor aparecem em alerta: credenciais incorretas, limite de tentativas (429) e cadastro recusado, este sem confirmar se o e-mail já existe. |
| Retorno | Página privada sem sessão redireciona para `/auth?next=<caminho>`. Depois do login, o usuário volta ao caminho pedido. `next` só aceita caminhos do próprio site, fora de `/auth` e `/api`. Quem já tem sessão e abre `/auth` vai direto ao destino. |
| Recuperação de senha | `/auth/forgot-password` sempre responde da mesma forma, exista ou não a conta. O link vale 1 hora e é de uso único. A troca de senha encerra as outras sessões. `/auth/reset-password` explica quando o link é inválido ou já foi usado e oferece pedir outro. |
| Verificação de e-mail | Com envio configurado, o cadastro manda um link de confirmação válido por 24 horas. A confirmação não é obrigatória para entrar, para não bloquear contas existentes. Abrir o link só confirma o endereço; não inicia sessão. |
| Limites de envio | No máximo 3 e-mails do mesmo tipo por conta em 15 minutos e 10 por dia, contados no banco com trava por conta. A resposta pública não muda quando o limite é atingido. O envio roda depois da resposta (`after()`), para que o tempo não revele se a conta existe. |
| E-mail | Mensagem em inglês e árabe na mesma mensagem, porque o servidor não conhece o idioma do leitor. `EMAIL_TRANSPORT=resend` usa a API da Resend com chave privada. `outbox` grava arquivos locais e só é aceito com `APP_URL` em loopback e fora da Vercel, para testes. Configuração inválida desliga o e-mail sem derrubar o login. Sem configuração, a recuperação aparece como indisponível. |
| SEO | `robots.txt` bloqueia API, `/qr` e áreas privadas. `sitemap.xml` lista só a landing. As telas de entrada têm `noindex`. |

## Tickets

| Ticket | Entrega | Estado |
|---|---|---|
| 8.1 | Cabeçalho, menu mobile, CTAs, preços e rodapé sem links mortos; âncoras nas seções; atalho "Pular para o conteúdo". | Entregue e verificado |
| 8.2 | Tela de entrada com modos, nome, validação por campo, alertas de erro, RTL com propriedades lógicas e namespace `entry` EN/AR. | Entregue e verificado |
| 8.3 | Retorno seguro ao destino (`next`) em todas as páginas privadas. | Entregue e verificado |
| 8.4 | Transporte de e-mail (`outbox` e `resend`), recuperação de senha e verificação de e-mail. | Entregue e verificado com `outbox`; Resend **sem prova** por falta de conta autorizada |
| 8.5 | `robots.txt`, `sitemap.xml` e `noindex` nas telas de entrada. | Entregue e verificado |
| 8.6 | Correção do erro de hidratação React #418 do `/overview` (anterior ao lote): `formatRange` gerava espaços diferentes no Node (U+2009) e no navegador (U+0020). O intervalo agora é montado com o mesmo separador nos dois lados. | Entregue e verificado |

## Verificação

| Verificação | Comando ou evidência | Resultado |
|---|---|---|
| Credenciais, lint, tipos, build | `node scripts/check-secrets.mjs --history`, `npm run lint`, `npm run typecheck`, `npm run build` | passou |
| Unitários: caminhos de retorno (externos, `//`, barra invertida, controle, `/auth`, `/api`), paridade EN/AR de `entry` | `npm run test:unit` | 11/11 |
| HTTP: retorno com `next`, `noindex`, robots e sitemap; verificação de e-mail bilíngue; recuperação com resposta igual para conta inexistente, recusa de `redirectTo` externo (403), senha curta, uso único, sessões antigas encerradas e login com a nova senha; limite de 3 envios com a mesma resposta pública | `npm run test:api` | 30/30 |
| Operações (backup/restauração com a tabela nova) | `npm run test:ops` | 4/4 |
| Navegador (build de produção local, `outbox`) | `docs/lotes/08-site-publico-e-entrada/verificacao/e2e.mjs` · capturas em `docs/evidence/lote-08/` | 30/30, sem nenhum erro de página |
| Hidratação | `/overview`, `/analytics`, `/my-qrcodes`, `/app` em EN e AR no build de produção | sem erros |

O roteiro de navegador confere: nenhum `href="#"`, todas as âncoras com destino, páginas respondendo, CTA do hero até o cadastro, erros por campo e foco, cadastro até o Overview, e-mail de confirmação EN/AR, atalho de painel com sessão, `/auth` com sessão, confirmação do e-mail, logout, retorno a `/analytics?preset=7`, senha errada, recuperação completa e link reutilizado recusado. No celular 390×844, confere menu, Esc, ausência de rolagem horizontal e cadastro em árabe RTL.

## Segurança

Revisão independente sem achados críticos ou altos. Corrigidos: tempo de resposta da recuperação (envio depois da resposta), login automático ao confirmar e-mail (desligado, com aviso no texto), ausência de limite de envios sem proxy confiável (limite por conta no banco), `outbox` bloqueado na Vercel e configuração inválida sem derrubar o login, token removido da barra de endereço com `Referrer-Policy: no-referrer`. Registrado: a API de cadastro do Better Auth ainda responde 422 para e-mail já cadastrado (comportamento anterior); a tela mostra mensagem genérica.

## Referência e lacunas

O trial da Uniqode exige login e já estava autenticado na auditoria. Telas de recuperação, verificação e SSO da referência não foram observadas. A comparação se limita à estrutura pública descrita em P01 (navegação por seção, CTAs de trial e login). Login social/SSO não faz parte do contrato atual.

## Pendências do proprietário

- Conta de envio de e-mail (Resend ou outro) e remetente verificado para ativar recuperação e confirmação em homologação.
- Canal comercial para "Agendar demonstração"/"Falar com vendas".
- Textos de Privacidade, Termos e Cookies, e perfis sociais oficiais.
- Números, logotipos e depoimentos da landing são conteúdo de demonstração herdado e precisam de confirmação ou substituição antes da produção.
