# Lote 12 — Formulários (Forms)

Base: `main` em `106cfa6` (Lote 11, [PR #32](https://github.com/daviduartedev/yousef-qrcode/pull/32)). Branch: `feat/lote-12-forms`. Escopo do roteiro: R6, item P20 da [auditoria](../../referencias/auditoria-paridade-uniqode.md). Migração aditiva `0010`: `forms`, `form_responses` e `form_events`, com RLS.

## Contrato

| Área | Comportamento |
|---|---|
| Formulário | Título, descrição, capa da biblioteca, até 30 perguntas e tema. Tipos: texto curto, texto longo, e-mail, telefone, número (mínimo e máximo), escolha (2–20 opções distintas), caixa de seleção e data. Cada pergunta tem texto de ajuda e pode ser obrigatória. Texto do botão, mensagem após o envio e consentimento opcional com texto próprio. |
| Lista e modelos | Lista com status, respostas, visitas de 30 dias e indicação de fechado; modelos Em branco, Fale conosco, Opinião, Inscrição em evento e Captação de contatos. Criação idempotente, até 30 formulários por conta. |
| Editor | Abas Perguntas, Estilo e Configurações, prévia ao lado, mover e remover perguntas, autosave com bloqueio de campos incompletos. "Aceitar novas respostas" fecha e reabre o formulário sem despublicar. Endereço e QR seguem as regras das Linkpages (fixo após publicar ou criar QR, nunca liberado para outra conta). |
| Formulário público | `/f/<slug>` sem conta. Mostra só a versão publicada; fechado mostra aviso. Envio validado no servidor contra as perguntas publicadas: tipos, obrigatórios, opções, faixas numéricas, datas reais e limites de tamanho (300 caracteres; 2.000 no texto longo). Chaves desconhecidas são descartadas. Erros voltam por pergunta, com `aria-invalid`, mensagem ligada ao campo e foco na primeira pergunta inválida. |
| Abuso | Origem do próprio site; token assinado gerado com a página, que precisa ter pelo menos 2 s e no máximo 24 h; corpo até 32 KB; campo-armadilha e robôs aceitos sem gravar; limites móveis por formulário (30 por minuto, 300 por hora, 1.000 por dia), 10 por hora por endereço confiável, até 10.000 respostas por formulário e 50.000 por conta. |
| Respostas | Só o dono vê. Tabela paginada (50), exclusão, CSV com uma coluna por pergunta atual mais colunas "(removida)" para respostas a perguntas apagadas depois; cada resposta guarda os rótulos e o texto de consentimento da época, e a coluna recebe "(editada)" quando a pergunta mudou depois de respostas recebidas. Visitas e taxa de conclusão de 30 dias. |

## Tickets

| Ticket | Entrega | Estado |
|---|---|---|
| 12.1 | Esquema, migração `0010`, contrato, modelos e validação de respostas. | Entregue e verificado |
| 12.2 | API privada (CRUD, publicação, fechar, QR, respostas, CSV) e rotas públicas (página, visita, envio, capa). | Entregue e verificado |
| 12.3 | Telas: lista com modelos, editor, respostas; navegação; EN/AR. | Entregue e verificado |

## Verificação

| Verificação | Comando ou evidência | Resultado |
|---|---|---|
| Credenciais, lint, tipos, build | `node scripts/check-secrets.mjs --history`, `npm run lint`, `npm run typecheck`, `npm run build` | passou |
| Unitários: todos os modelos válidos, tipos, opções aparadas, número fora da faixa, data inexistente, objeto no lugar de texto, perguntas e opções obrigatórias, consentimento sem texto | `npm run test:unit` | 21/21 |
| HTTP: criação idempotente, rascunho sem receber respostas, seis rotas com outra conta (404), erros por pergunta, consentimento obrigatório, origem externa 403, armadilha, chave desconhecida descartada, consentimento gravado, CSV neutralizado e com quebra de linha, pergunta removida exportada, formulário fechado (410 e aviso), QR e exclusão; token falso ou recente demais (400), pergunta editada sinalizada; corpo de 40 KB (413), limite por minuto (429), visitas e envios | `npm run test:api` | 43/43 |
| Navegador (build de produção local) | `docs/lotes/12-forms/verificacao/e2e.mjs` · capturas em `docs/evidence/lote-12/` | 21/21 |

O roteiro de navegador cria pelo modelo com duplo clique (um só formulário), adiciona uma pergunta de escolha, edita, move, bloqueia pergunta vazia, configura consentimento e publica. No celular sem conta, confere erros por pergunta e o foco, preenche e envia sem rolagem horizontal. Depois confere a resposta e o CSV do dono, o formulário fechado avisando o visitante, a lista em árabe RTL e a recusa a outra conta.

## Segurança

Revisão independente sem achados críticos ou altos. Corrigidos: envio em massa sem proxy confiável (token assinado com idade mínima, robôs ignorados, teto por conta), data malformada causando erro 500, identificador de pergunta herdado de `Object.prototype`, respostas antigas sob rótulos novos (coluna sinalizada), publicação copiando rascunho desatualizado (agora copia o rascunho gravado no banco, também em Linkpages e Cards) e foco no erro de consentimento. Registrados: limite por endereço de rede na borda e retenção de IP e user agent (decisões de operação já listadas).

## Referência e lacunas

A auditoria registrou Forms com modelos, publicação e respostas; os estados com dados não puderam ser exercitados no trial. Ficaram fora: lógica condicional, upload de arquivo pelo visitante, pagamentos, notificações por e-mail de nova resposta (dependem do provedor do Lote 8), integrações (Lote 17) e geração por IA (Lote 18). Os textos dos modelos são exemplos em inglês e podem ser editados.
