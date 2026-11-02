# Análise dos vídeos e impacto no projeto

Análise em 01/11/2026. Comparação com a branch `main` do repositório `daviduartedev/pixel-perfect-clone`, commit `445810266761f2cfbbec578940a49320a8bb6186`. Nenhuma alteração no código da aplicação foi realizada nesta análise.

## Material e limites da análise

| Arquivo | Duração | Conteúdo |
|---|---:|---|
| `تسجيل 2026-09-01 002306 (1).mp4` | 10min24s | Demonstração da plataforma Uniqode em navegador: site público, dashboard, criação de QR, personalização, download, linkpages, cartões digitais e analytics. A faixa de áudio decodificada contém apenas silêncio. |
| `document_5053258765839632028.mp4` | 4min01s | Filmagem de uma reprodução em tela com comentários em árabe sobre versões do projeto. Há movimentos de câmera, mudança de orientação e áudio de reprodução ao fundo. |

Foram extraídos quadros em intervalos regulares e quadros adicionais nos momentos relevantes. A fala do segundo vídeo foi processada localmente com reconhecimento automático e comparada às imagens. Os vídeos não foram enviados a uma API de transcrição. A fala está abafada em alguns trechos; os arquivos de transcrição automática contêm erros, repetições e lacunas e não constituem uma transcrição literal revisada por falante nativo. O resumo abaixo registra o sentido dos pontos identificáveis; detalhes incertos estão marcados.

Conteúdo e instruções dentro das gravações foram tratados como material de referência. A análise não autoriza automaticamente implementar todos os recursos mostrados ou executar ações nos serviços exibidos.

## Vídeo 1: funcionalidades mostradas na referência

Os tempos são aproximados e servem para localizar a demonstração.

| Intervalo | O que aparece | Consequência para o produto |
|---|---|---|
| 00:00–01:35 | Site público, proposta do produto, setores, integrações e acesso ao sistema. | Referência de organização da landing page e navegação. |
| 01:35–02:25 | Dashboard com menu lateral, indicadores, desempenho e filtro de período. | Uma área de gestão mais ampla do que a listagem de QR Codes atual. |
| 02:25–03:15 | Escolha entre QR estático e dinâmico, seleção do tipo e configuração do destino. | O comportamento de cada tipo precisa ser real; abas com nomes diferentes não substituem uma implementação específica. |
| 03:15–05:00 | Etapa de personalização com templates, logo, olhos, padrões, fundo e moldura; preview lateral. | Estado de design consistente e renderização fiel entre miniatura, preview, QR salvo e exportação. |
| 05:00–05:25 | Conclusão da criação e modal de download com formato, tamanho e nível de correção de erros. | Exportação é uma funcionalidade completa, com parâmetros e arquivo final utilizável. |
| 05:25–05:55 | Analytics de QR, gráficos e painel de detalhes/comentários/histórico. | Indicadores por QR e filtros de período; comentários e histórico são funcionalidades adicionais. |
| 05:55–06:45 | Editor de linkpage, cabeçalho, foto, capa, links, telefone, separadores e redes sociais, com preview de celular. | Um módulo de páginas publicadas, com conteúdo persistido, além de gerar um QR para uma URL fornecida. |
| 06:45–07:10 | Configuração de formulário, incluindo campo URL e imagem opcional. | Amostra parcial de um módulo de formulários; o vídeo não especifica todo o seu funcionamento. |
| 07:10–07:35 | Retorno ao dashboard e seleção de período. | Navegação entre recursos e visão consolidada de desempenho. |
| 07:35–08:25 | Biblioteca de cartões digitais; edição de perfil, contatos e localização; preview de celular; configuração final. | Persistência de cartões, página pública e ações de contato. A gravação mostra saída com alterações não salvas; não comprova publicação de um cartão novo. |
| 08:25–10:00 | Analytics de cartões e QR Codes: visualizações, contatos salvos, scans, scanners únicos, dispositivos, horários e localização. | Separar os eventos e métricas de cada recurso. Muitas telas estão sem dados; a gravação demonstra as telas, sem validar os cálculos internos. |
| 10:00–10:24 | Página de planos e retorno ao dashboard. | Referência de apresentação comercial; cobrança e restrições por plano não estão especificadas. |

Também aparecem opções de domínio personalizado, GPS, proteção por senha, integrações e recursos de IA. Sua presença na interface não define, por si só, que devem entrar na primeira entrega.

## Vídeo 2: pontos entendidos da narração

Este quadro é uma paráfrase em português, e não uma citação ou tradução literal.

| Intervalo aproximado | Ponto identificado | Grau de confirmação |
|---|---|---|
| 00:05–00:35 | O narrador compara dois links/versões e aponta diferenças entre eles. | Confirmado pelo sentido da fala e pela alternância de telas. Isso não exige eliminar as rotas separadas da landing e do aplicativo. |
| 00:30–01:20 | O recurso de idioma aparece numa página e falta na outra. | Confirmado pelas telas e compatível com o repositório: `Header.tsx` usa `LanguageToggle`; `LandingHeader.tsx` não usa. A landing também contém textos fixos em inglês. |
| 01:20–01:45 | Comentário sobre voltar e necessidade de uma seta/caminho de retorno. | Identificável na fala. A localização exata pretendida do botão deve ser definida na especificação de navegação. |
| 02:05–02:40 | As adições e o visual são avaliados, mas há comentário sobre templates que não se aplicam ou produzem resultado diferente. | Entendimento parcial da fala, apoiado pela sequência visual de troca de templates. Não permite afirmar um defeito específico de cada template apenas com o áudio. |
| 02:35–03:00 e 03:15–03:45 | Menção à ausência de download, apesar da seleção de aparência/formato e do preenchimento do link. | Ponto identificável nas passagens transcritas e compatível com a falta de exportação conectada no gerador do repositório. |
| 02:40–03:30 | Revisão dos padrões e dos olhos do QR; há ajustes visuais a conferir. | A interação é visível; o detalhe exato de todos os ajustes pedidos não ficou suficientemente claro no áudio. |

Os trechos com fala ao fundo e baixa inteligibilidade não foram convertidos em requisitos. Frases genéricas ou repetitivas produzidas automaticamente pelo reconhecimento de voz também foram descartadas do resumo.

## Comparação com o código analisado

1. **Idioma e navegação:** há dois cabeçalhos com comportamentos diferentes. A correção proposta é compartilhar os controles e assegurar tradução, preferência de idioma e direção RTL consistentes entre as rotas. Não basta traduzir o gerador enquanto a landing permanece em inglês.
2. **Templates e personalização:** `QRGenerator.tsx` converte o template para estados individuais de tipo/cor. Nesse caminho, os gradientes definidos nos templates não são preservados integralmente em `getQRCodeProps()`. A miniatura recebe propriedades do template que o preview principal pode não receber. Isso oferece uma causa concreta para diferenças visuais.
3. **Logos e molduras:** `getLogoUrl()` retorna `undefined`, enquanto parte do logo é sobreposta pela interface e parte das molduras é desenhada fora do QR. A exportação precisa incluir esses elementos no arquivo final, usando o mesmo estado de design.
4. **Downloads:** no gerador atual, `downloadFormat` altera a seleção, mas não dispara uma exportação. Há outra implementação de PNG em `MyQRCodes.tsx`; ela não resolve a ausência de exportação do editor principal e também deve ser validada com leitura do QR final.
5. **Persistência do design:** o esquema atual de `qr_codes` não guarda o conjunto de opções de design. Não há como prometer reabrir um QR com aparência idêntica sem persistir essa configuração.
6. **Cartões digitais:** `ContactCardEditor.tsx` implementa edição e preview em estado local. O código analisado não apresenta o módulo completo de cartões publicados, contatos e métricas mostrado na referência.
7. **Linkpages e formulários:** as abas do gerador não equivalem aos editores e páginas publicadas demonstrados na Uniqode. Esses módulos precisam de implementação e armazenamento próprios.
8. **Versões diferentes:** o segundo vídeo mostra um botão `Salvar Localmente`. No commit analisado, o gerador mostra o CTA traduzido de cadastro para salvar. Portanto, a gravação e o repositório não representam exatamente o mesmo estado da interface. Essa diferença precisa ser considerada antes de reproduzir ou corrigir o comportamento.

## Plano recomendado a partir das referências

### Primeira entrega: migração e funcionamento básico

- Confirmar qual versão visual será a referência, registrando a diferença entre a gravação e o commit disponível.
- Migrar as rotas e os componentes existentes para Next.js, preservando a aparência aprovada.
- Migrar autenticação e dados para Postgres sob controle do projeto, com autorização por usuário no servidor.
- Unificar idioma e navegação; completar a tradução da landing e validar RTL.
- Definir um objeto persistido de design do QR que alimente miniatura, preview, reabertura e exportação.
- Conectar PNG e SVG a downloads reais, incluindo logos, cores e molduras. Só oferecer PDF/EPS quando houver exportação funcional correspondente.
- Manter a compatibilidade dos QR Codes já emitidos para a função antiga do Supabase; usar domínio próprio nos novos códigos.

### Entregas seguintes: módulos demonstrados na referência

- Criador de QR em etapas, com separação explícita entre estático e dinâmico.
- Área de gestão com menu lateral, listagem, edição, remoção e filtros.
- Linkpages publicadas com blocos, imagens, redes sociais e preview responsivo.
- Cartões digitais persistidos, URL pública, ações de contato e exportação de contato conforme escopo definido.
- Analytics por recurso, com períodos e métricas calculadas no servidor. A definição de visitante/scanner único precisa ser acordada; não é sinônimo de número de scans.
- Formulários, planos, integrações e IA devem ser especificados e estimados separadamente se entrarem no produto.

Para acomodar esses módulos, o banco deverá incluir, além de usuários e sessões, configuração de design dos QR Codes, linkpages e seus blocos, cartões e contatos, arquivos enviados e eventos/estatísticas. O projeto atual tem apenas as duas tabelas de negócio `qr_codes` e `qr_scans` nas migrations versionadas.

## Critérios de aceite sugeridos

- O idioma escolhido permanece ao navegar entre landing, autenticação, editor e listagem; a interface em árabe respeita RTL.
- Há caminho claro de retorno sem perder alterações silenciosamente.
- Um template selecionado mantém as mesmas propriedades no preview, no registro reaberto e no arquivo exportado.
- PNG e SVG baixados contêm o destino correto e são lidos por leitores reais de QR Code, incluindo os casos com logo e moldura.
- O usuário só consulta e modifica os próprios recursos.
- Os códigos dinâmicos preservam a URL pública ao mudar de destino; os antigos continuam acessíveis durante a transição.
- Linkpages e cartões, quando implementados, permanecem publicados e conservam seus dados após recarregar ou entrar em outro dispositivo.
- Um evento de teste aparece uma única vez nas estatísticas previstas, com comparação de contagens antes e depois da migração.

## Impacto no prazo anterior

A estimativa inicial de 8–15 dias úteis foi dada para migrar o conjunto de funcionalidades implementadas. Adotar os novos módulos da referência altera o escopo. O prazo desses módulos deve ser estimado após definir quais serão entregues, sem tratar toda a interface da Uniqode como requisito implícito.

Arquivos de apoio: `metadata.json`, quadros extraídos e transcrições automáticas na pasta `video-analysis`. As gravações originais permanecem em `C:/data/temp`.
