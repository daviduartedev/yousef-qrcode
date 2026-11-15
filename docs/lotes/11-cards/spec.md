# Lote 11 — Cartões digitais (Cards)

Base: `main` em `8cc4bf3` (Lote 10, [PR #31](https://github.com/daviduartedev/yousef-qrcode/pull/31)). Branch: `feat/lote-11-cards`. Escopo do roteiro: R5, itens P17–P19 da [auditoria](../../referencias/auditoria-paridade-uniqode.md). Migração aditiva `0009`: `cards`, `card_events` e `card_contacts`, com RLS. Eventos de feira e CRM ficam nos Lotes 17 e 20, conforme o roteiro.

## Contrato

| Área | Comportamento |
|---|---|
| Cartão | Nome, sobrenome, cargo, empresa, sobre, foto e capa da biblioteca; até 3 telefones e 3 e-mails com tipo, site e endereço; até 8 redes sociais; tema e formato de botão (mesmas predefinições das Linkpages); troca de contato com texto de finalidade. Validação no servidor; links só HTTP/HTTPS. |
| Lista e estilos | Lista com status, visitas e salvamentos de 30 dias e contatos recebidos; cinco estilos para começar. Criação idempotente por chave do cliente; limite de 20 cartões por conta. |
| Editor | Abas Perfil, Contato, Redes, Estilo, Troca de contato e Configurações, prévia de celular, autosave como nas Linkpages. "Importar vCard (.vcf)" lê o arquivo no navegador (vCard 2.1/3.0/4.0, até 64 KB) e preenche nome, cargo, empresa, nota, telefones, e-mails, site e endereço; URLs inseguras são ignoradas. |
| Publicação e endereço | Rascunho privado e cópia publicada em `/c/<slug>`. O endereço fica fixo após publicar ou criar o QR e nunca é liberado para outra conta. Excluir o cartão apaga contatos e métricas e desativa o QR. |
| Cartão público | Sem sessão. "Salvar contato" baixa um vCard 3.0 UTF-8 (nome em árabe preservado, linhas dobradas sem quebrar caracteres, foto PNG/JPEG até 512 KB embutida). Ligar, e-mail, site, mapa e redes passam por `/c/<slug>/go/<ação>`, que conta e redireciona ao destino publicado. |
| Troca de contato | Formulário opcional: nome e e-mail ou telefone obrigatórios, empresa e mensagem opcionais. A pessoa precisa marcar o consentimento, que mostra o texto de finalidade do dono; esse texto é gravado com o contato. Campo-armadilha para robôs, origem do próprio site, limites móveis por cartão de 20 por minuto, 60 por hora e 200 por dia, 5 por hora por endereço confiável e no máximo 5.000 contatos guardados por cartão. Empresa e mensagem recusam caracteres de controle. |
| Contatos | `/cards/contacts`: busca, filtro por cartão, exclusão, CSV com proteção contra fórmulas. Só o dono vê os contatos dos próprios cartões. |
| Métricas | Visitas (com únicos pela regra do Lote 7), salvamentos de vCard, ações por destino e contatos recebidos, com período, comparação, dispositivo, série diária, países e CSV. Robôs, prévias de link, requisições embutidas ou entre sites e repetições de 10 s não contam. |

## Tickets

| Ticket | Entrega | Estado |
|---|---|---|
| 11.1 | Esquema, migração `0009`, contrato do cartão, vCard (gerar e importar). | Entregue e verificado |
| 11.2 | API privada de cartões, QR, analytics e CSV; contatos (lista, exclusão, CSV). | Entregue e verificado |
| 11.3 | Cartão público, vCard, ações contadas, mídia restrita, troca de contato com consentimento. | Entregue e verificado |
| 11.4 | Telas: lista, editor com importação de vCard, analytics, contatos; navegação; EN/AR. | Entregue e verificado |

## Verificação

| Verificação | Comando ou evidência | Resultado |
|---|---|---|
| Credenciais, lint, tipos, build | `node scripts/check-secrets.mjs --history`, `npm run lint`, `npm run typecheck`, `npm run build` | passou |
| Unitários: vCard UTF-8 com árabe, escape de `;` `,` e quebras, dobra ≤ 75 bytes sem caractere quebrado, ida e volta, importação 4.0 com URL insegura ignorada, ações seguras, consentimento e forma de resposta obrigatórios; paridade EN/AR ; endereço com quebra de linha recusado, URL com árabe codificada, vCard sem propriedade injetada | `npm run test:unit` | 18/18 |
| HTTP: criação idempotente, URL insegura recusada, rascunho privado, seis rotas com outra conta (404), publicação, vCard com nome árabe e URL do cartão, `tel:` e mapa, ação inexistente 404, robô ignorado, totais e CSV, republicação no mesmo endereço, QR, exclusão desativando o QR; troca de contato sem consentimento, sem forma de resposta, de outra origem e com armadilha preenchida, consentimento gravado, isolamento, CSV neutralizado, busca, limite por minuto (429), exclusão e troca desligada (404) | `npm run test:api` | 41/41 |
| Navegador (build de produção local) | `docs/lotes/11-cards/verificacao/e2e.mjs` · capturas em `docs/evidence/lote-11/` | 22/22 |

O roteiro de navegador cria o cartão por estilo com duplo clique (um só cartão) e importa um vCard em árabe. Em seguida completa contato, rede e finalidade, verifica o bloqueio de campo incompleto e publica. No celular sem sessão, confere o perfil, que a página cabe na tela, o download do vCard UTF-8, a ligação contada e a troca de contato com consentimento. Por fim confere o contato no gerenciador, as métricas (2 visitas, 1 salvamento, 1 ação, 1 contato), a lista em árabe RTL e a recusa a outra conta.

## Segurança

Revisão independente sem achados críticos ou altos. Corrigidos: injeção de propriedades no vCard por endereços com quebra de linha (endereços recusam quebras e são normalizados; o vCard remove quebras de qualquer valor, o que também protege as Linkpages), spam na troca de contato sem proxy confiável (limites móveis por hora e dia), caracteres de controle em empresa e mensagem, CSV de contatos limitado a 500 linhas, acessibilidade do formulário (campos obrigatórios, erro anunciado e focado) e rolagem da prévia. Registrados: retenção e anonimização de IP e user agent em eventos e contatos (decisão do proprietário, junto com a retenção do Lote 7) e QR órfão se a criação falhar no meio.

## Referência e lacunas

A auditoria registrou a área Cards com galeria, editor em etapas, perfil público com troca de contato, analytics com visualizações, salvamentos e contatos, e Contact Manager. A Uniqode não publicou cartão durante a varredura, então o fluxo público foi comparado pelos vídeos. Ficaram fora: carteira Apple/Google, cartões de equipe em massa (depende do Lote 13), eventos de feira e sincronização com CRM (Lotes 17 e 20), cidade e mapa de localização.
