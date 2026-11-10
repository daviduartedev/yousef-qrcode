# Lote 3.2 — Homologação com novas contas e QRs

## Parent

Part of #11 — Publicação inicial com banco novo.

## What to build

O usuário cria uma conta nova e usa seus QRs no ambiente hospedado de homologação. Comprovar banco, origem, sessões e tracking sem importar usuários, QRs ou histórico. O nome histórico do arquivo não implica importação ativa.

## Acceptance criteria

- [ ] Confirmar ambiente isolado com migrations completas, TLS, schema privado e origem HTTPS; manter Better Auth, sem Supabase Auth ou credenciais padrão.
- [ ] Validar Supabase + Vercel, origem estável `vercel.app`, configuração Preview/Production separada e limite de conexões compatível com runtime serverless. Conexão operacional direta/session permanece separada do pooler de runtime.
- [ ] Usar duas contas novas autorizadas e dados sintéticos isolados, sem copiar hashes, sessões ou registros antigos.
- [ ] Verificar via HTTP cadastro/login/sessão/logout, isolamento, origem indevida recusada, QR novo com 302 sem cache, HEAD sem evento e código inválido sem destino.
- [ ] Validar no navegador/celular nova conta, salvar/reabrir, PNG/SVG e leitura no ambiente hospedado com origem definida; não repetir toda a validação local/editorial dos Lotes 1/2.
- [ ] Confirmar proxy antes de confiar em headers, registrar resultados sanitizados e manter fixtures fora da produção.
- [ ] Concluir G2 com revisão, dvd-tests e validação humana antes de commit/push; homologação não comprova produção.

## Blocked by

#12 — Novo ambiente e recuperação comprovada. Pré-condições adicionais: A5/A7 e D6. Migração/compatibilidade e ponte antigas dispensadas.
