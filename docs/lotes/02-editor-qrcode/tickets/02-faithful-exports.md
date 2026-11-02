# Lote 2.2 — Preview e downloads fiéis ao design

## Parent

Part of #6.

## What to build

O usuário escolhe um template, personaliza padrões, cores, olhos, logo e moldura e baixa um PNG ou SVG fiel ao preview, contendo o destino correto. Recursos sem efeito deixam de prometer funcionalidades inexistentes.

## Acceptance criteria

- [ ] Configuração versionada única preserva todas as propriedades dos templates e ajustes manuais.
- [ ] Miniatura, preview e arquivo usam a mesma composição de QR, logo e moldura.
- [ ] Padrões especiais existentes mantêm a intenção visual; exportação contém margem livre e correção de erros apropriadas.
- [ ] Catálogo existente de logos e controles reais de moldura funcionam e integram o arquivo final.
- [ ] PNG e SVG baixam arquivos utilizáveis e independentes de recursos externos.
- [ ] SVG não aceita marcação arbitrária nem recursos remotos fornecidos pelo usuário.
- [ ] Download vazio, inválido ou desatualizado é impedido com mensagem clara; erros preservam o rascunho.
- [ ] Destino direto e URL rastreável refletem a escolha de tracking, sem baixar conteúdo antigo após mudar a entrada.
- [ ] PDF/EPS, Update Later, GPS e upload de logo sem função não são oferecidos.
- [ ] Decodificador independente lê arquivos representativos, incluindo gradiente, logo e moldura; câmera real permanece na checklist humana.

## Blocked by

None (can start immediately).
