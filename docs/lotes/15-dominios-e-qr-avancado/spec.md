# Lote 15 — Domínios e opções avançadas de QR

Base: `main` em `15cdd1a` (Lote 14, [PR #35](https://github.com/daviduartedev/yousef-qrcode/pull/35)). Branch: `feat/lote-15-dominios-e-qr-avancado`. Escopo do roteiro: R6, item P23 e tipos com regras de P09 da [auditoria](../../referencias/auditoria-paridade-uniqode.md). **O número deste lote não corresponde à issue #15**, que trata de produção e segue adiada. Migração aditiva `0013`.

## Contrato

| Área | Comportamento |
|---|---|
| Endereço curto | Além de `/qr?code=…`, todo QR rastreável abre em `/r/<código>`. |
| Aliases | Até 10 códigos legíveis por QR (`/r/menu-lisboa`), minúsculas, números e hífen. São permanentes: continuam funcionando, não podem ser removidos e nunca passam a outro QR — se o QR for apagado, o alias responde 410 e continua reservado; não podem coincidir com um código curto existente. O código original continua valendo. |
| Senha | Opcional, mínimo de 6 caracteres e indisponível em QRs vinculados (a página pública abriria sem ela). Guardada só como hash scrypt com sal; nunca volta nas respostas. Quem lê o QR passa por `/qr/gate`, digita a senha e só então o scan é contado. Erros: no máximo 5 por endereço confiável e 50 por código a cada 10 minutos (429), contados sob trava por código. Sem proxy confiável, o limite por código pode pausar o QR para todos por alguns minutos — troca aceita contra adivinhação. A agenda é conferida antes da senha. |
| Agenda | Fuso horário IANA, início e fim (data e hora locais), dias da semana e janela diária, inclusive cruzando a meia-noite. Fora da janela, o leitor vai para o endereço alternativo (HTTP/HTTPS) ou vê por que o QR está fechado ("ainda não ativo", "encerrado", "fechado agora"), sem contar scan. |
| Localização | Opcional. A página intermediária explica e pede consentimento; a localização vem do navegador só se a pessoa aceitar, é arredondada para cerca de 1 km e gravada com o scan. "Abrir sem compartilhar" sempre funciona. |
| Domínios | Por espaço de trabalho, até 10. A posse é provada por um registro TXT `_qrconnect.<domínio>` com valor `qrconnect-verify=<token>`. Só domínios verificados podem ser escolhidos para um QR, que passa a ser impresso como `https://<domínio>/r/<código>`. O domínio só atende códigos do seu espaço; trocar de domínio não quebra códigos impressos com o endereço do app ou com domínios anteriores do mesmo espaço. Só domínio verificado é exclusivo: um pedido pendente de outro espaço não bloqueia o dono real. Um domínio que já foi usado em algum QR nunca pode ser removido, porque pode estar impresso. Adicionar, verificar, remover e ver o valor TXT exigem papel de administrador. |
| TLS e roteamento | O app atende o domínio pelo cabeçalho `Host`. Apontar o CNAME e emitir o certificado dependem de adicionar o domínio no projeto da Vercel, o que exige domínio real e acesso de conta (fora desta execução). |

## Tickets

| Ticket | Entrega | Estado |
|---|---|---|
| 15.1 | Migração `0013`, contrato de regras, agenda com fuso, aliases e domínios. | Entregue e verificado |
| 15.2 | Redirecionamento com alias, domínio, agenda, alternativo e página intermediária de senha e localização. | Entregue e verificado |
| 15.3 | Painel avançado no editor do QR e tela de domínios. | Entregue e verificado |
| 15.4 | TLS e roteamento do domínio na hospedagem. | **Bloqueado**: precisa de domínio real autorizado e acesso à conta da Vercel |

## Verificação

| Verificação | Comando ou evidência | Resultado |
|---|---|---|
| Credenciais, lint, tipos, build | `node scripts/check-secrets.mjs --history`, `npm run lint`, `npm run typecheck`, `npm run build` | passou |
| Unitários: fuso de Riade e São Paulo, dia da semana local, início, fim exclusivo, janela pela meia-noite, agendas inválidas, aliases, arredondamento, normalização de domínio, TXT em partes | `npm run test:unit` | 24/24 |
| HTTP: senha curta recusada, hash fora das respostas, página intermediária, senha errada 403, origem externa 403, senha certa conta um scan, limite de tentativas (429), outra conta 404, QR direto sem regras (409); agenda encerrada (410), alternativo inseguro recusado, alternativo, ainda não ativo, fuso inválido; localização arredondada só quando compartilhada; aliases em `/r` e `/qr`, alias duplicado 409, outra conta 404; domínio inválido, dono único, uso antes da verificação 409, verificação por TXT, QR impresso no domínio, domínio não atende código de outro espaço nem host não verificado, endereço do app continua, remoção bloqueada em uso, domínio anterior continua ; senha em QR vinculado recusada, alias de QR apagado 410 e reservado, pedido pendente não bloqueia, domínio usado não removível | `npm run test:api` | 54/54 |
| Navegador (build de produção local) | `docs/lotes/15-dominios-e-qr-avancado/verificacao/e2e.mjs` · capturas em `docs/evidence/lote-15/` | 14/14 |

## Segurança

Revisão independente sem achados críticos. Corrigido o achado alto: aliases de QR apagado eram liberados e podiam ser tomados por outro espaço, recebendo os scans de códigos impressos; agora ficam reservados e respondem 410. Corrigidos os médios e baixos: tentativas de senha contadas sob trava e senha mínima de 6, senha recusada em QRs vinculados, ocupação de domínio por pedido pendente, remoção de domínio impresso, HTML de erro escapado, agenda conferida antes da senha, valor TXT só para administradores, busca por imagem entendendo `/r/<código>`, limpeza das tentativas antigas e acessibilidade do erro na página intermediária. Registrado: domínios verificados não são reverificados periodicamente.

## Referência e lacunas

A auditoria registrou na Uniqode slug editável, GPS condicionado à permissão, senha, agenda com fuso e tela de domínios. Ficam sem prova: TLS e roteamento em domínio real (bloqueado acima), regras por país ou dispositivo e metadados extras do QR.
