# Lote 3.1 — Novo ambiente e recuperação comprovada

## Parent

Part of #11 — Publicação inicial com banco novo.

## What to build

Preparar o novo ambiente, aplicar migrations e comprovar backup/restauração do novo banco em alvo separado antes de homologar/publicar. O proprietário dispensou legado; não há exportação da origem ou compatibilidade com dados antigos.

## Estado da implementação

Comandos de inspeção/preparação/backup/restauração implementados e ensaiados com dados sintéticos em bancos locais separados. Ambiente escolhido: Supabase + Vercel. G1 e critérios de infraestrutura hospedada/guarda/retenção permanecem pendentes; não fechar o ticket nem tratar o ensaio local como homologação externa.

## Acceptance criteria

- [ ] Confirmar novo Postgres e alvos separados de homologação/produção, hospedagem, responsáveis/permissões, configuração privada, TLS e schema privado sem expor valores.
- [ ] Aplicar migrations apenas no destino novo confirmado, sem dados legados; não apagar bancos automaticamente nem copiar ambientes/histórico antigos.
- [ ] Definir cobertura, integridade, retenção e guarda privada do backup, incluindo schema de aplicação e histórico de migrations; inventariar configuração/dependências de recuperação.
- [ ] Ensaiar backup/restauração com dados sintéticos representativos em alvo isolado, sem e-mails reais; conferir integridade/registros, sem restaurar snapshot sobre produção.
- [ ] Verificar pelo ponto de comandos aprovado alvo incorreto recusado e falha sem revelar credenciais; não repetir verificações antigas sem mudança relevante.
- [ ] Entregar G1 ou bloqueios explícitos; revisão, dvd-tests aplicável e validação humana antes de commit/push. Documento não equivale a restauração executada.

## Blocked by

Nenhum ticket. Pré-condições externas: A2–A4 e D1. Acesso/exportação do Supabase antigo não bloqueiam esta entrega.
