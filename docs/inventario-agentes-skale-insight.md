# Inventário dos agentes do skale-insight — recomendação, não mudança

**NADA foi alterado dentro de `skale-insight/.claude/agents/`.** Este arquivo só lê o que já existe
lá e recomenda o que fazer. Quem decide e aplica é o Eric.

## Aviso importante: 4 nomes colidem com o elenco global

`backend-specialist`, `code-reviewer`, `frontend-specialist` e `security-reviewer` existem **com o
mesmo nome** dentro do projeto skale-insight e no elenco global novo (`claude/agents/` deste
harness). Agente de projeto tem precedência sobre agente global de mesmo nome — então, hoje, dentro
do skale-insight, essas 4 versões locais (todas em `sonnet`, sem `effort` declarado) continuam
valendo e o global fica inerte, mesmo que o global rode em tier mais alto (`opus`/`xhigh` no caso de
security-reviewer, por exemplo). Se o Eric quiser que o skale-insight passe a usar o elenco global
nesses 4 casos, precisa apagar (ou renomear) os 4 arquivos locais.

## Tabela

| Agente | model hoje | effort hoje | O que faz | Recomendação |
|---|---|---|---|---|
| backend-specialist | sonnet | — | Implementa/revisa endpoint de API, lógica server-side, auth, integração de banco | SUBSTITUIR PELO GLOBAL — mesmo nome e escopo do global, que roda em opus/high; hoje o local (sonnet, sem effort) é quem vale por precedência de nome. |
| code-archaeologist | sonnet | — | Reconstitui a intenção de código legado/não documentado, mapeia dependência escondida | PROMOVER AO GLOBAL — não depende de conhecimento de negócio do skale-insight, útil em qualquer projeto com código legado. |
| code-reviewer | sonnet | — | Revisão geral pós-edição: bug, segurança básica, tratamento de erro, cobertura de teste | SUBSTITUIR PELO GLOBAL — mesmo nome, mesmo tier (sonnet), mas o global já declara effort medium explícito; hoje o local vale por precedência de nome. |
| database-architect | sonnet | — | Desenha schema, migração, índice, estratégia de query | SUBSTITUIR PELO GLOBAL — cobre o mesmo escopo de migration-specialist (opus/xhigh), e schema/migração num banco sem backup é trabalho de alto risco demais para sonnet sem effort declarado. |
| debugger | sonnet | — | Investigação sistemática de causa raiz de bug/crash/comportamento instável | PROMOVER AO GLOBAL — investigação de causa raiz é genérica, não depende de nada específico do skale-insight. |
| devops-engineer | sonnet | — | Deploy, pipeline de CI/CD, configuração de infraestrutura, operação de produção | PROMOVER AO GLOBAL — os quatro produtos Skale compartilham a mesma stack (Supabase + Vercel), então o conhecimento de deploy é reaproveitável. |
| documentation-writer | sonnet | — | Escreve README, doc de API, runbook, guia — conteúdo substancial, não só sincronização | PROMOVER AO GLOBAL — o doc-updater global só cobre documentação mecânica/trivial; escrever doc nova e substancial é um degrau de julgamento que falta no elenco atual. |
| explorer-agent | sonnet | — | Mapeia arquitetura, padrão e dependência de um codebase desconhecido para embasar planejamento | PROMOVER AO GLOBAL (em tier mais alto que haiku) — o explorer global deste elenco é deliberadamente mecânico (localizar, não interpretar); este faz leitura com julgamento, papel diferente e genérico. |
| frontend-specialist | sonnet | — | Projeta/implementa componente de UI, layout, estilo, performance de frontend | SUBSTITUIR PELO GLOBAL — mesmo nome e escopo do global (sonnet/high); hoje o local vale por precedência de nome. |
| orchestrator | sonnet | — | Coordena tarefa multi-agente, subdelega para agentes especializados | MANTER SÓ NO PROJETO — está amarrado aos hooks específicos do skale-insight (ex.: subagent-model-guard.mjs); vale notar que a sessão principal já cumpre esse papel de orquestrar, então pode ser redundante mesmo localmente. |
| penetration-tester | sonnet | — | Simula técnica de invasor (PTES/OWASP) para achar vulnerabilidade explorável | SUBSTITUIR PELO GLOBAL — mesma função de fundo do security-reviewer global (OWASP, cenário de exploração), que roda em opus/xhigh; aqui está em sonnet sem effort. |
| performance-optimizer | sonnet | — | Perfila e corrige gargalo de performance — endpoint lento, memória, Core Web Vitals, query | PROMOVER AO GLOBAL — nenhum dos 9 globais cobre performance, e o problema é genérico a qualquer projeto. |
| product-manager | sonnet | — | Esclarece requisito ambíguo, prioriza roadmap | MANTER SÓ NO PROJETO — decisão depende do roadmap e das prioridades de negócio específicas do skale-insight. |
| product-owner | sonnet | — | Traduz objetivo de negócio em spec técnica, define critério de aceite | MANTER SÓ NO PROJETO — depende do backlog e das histórias específicas do skale-insight. |
| project-planner | sonnet | — | Quebra feature/epic em tarefas ordenadas com critério de aceite | MANTER SÓ NO PROJETO — depende de como o skale-insight organiza sprint/história; no nível do harness esse papel já é coberto pela skill `brainstorm-para-plano`. |
| qa-automation-engineer | sonnet | — | Escreve/mantém teste E2E (Playwright/Cypress) e quality gate de CI/CD | SUBSTITUIR PELO GLOBAL — o test-writer global já cobre unitário/integração/E2E explicitamente, com effort medium declarado; aqui está em sonnet sem effort. |
| react-build-resolver | sonnet | — | Diagnostica e corrige build React quebrado (Vite, webpack, Next.js, CRA, Bun) | PROMOVER AO GLOBAL — problema de build de bundler é genérico a qualquer projeto React/TS, os quatro produtos Skale usam a mesma stack. |
| react-reviewer | sonnet | — | Revisa React/Next para regra de hooks, fronteira Server/Client, acessibilidade, performance de render | PROMOVER AO GLOBAL — lente específica de React que nem code-reviewer (geral) nem frontend-specialist (constrói, não audita) cobrem hoje; genérica aos quatro produtos, todos React/TS. |
| security-auditor | sonnet | — | Revisão SAST defensiva, modelagem de ameaça, recomendação de hardening (defesa em profundidade) | SUBSTITUIR PELO GLOBAL — mesma função de fundo do security-reviewer global, em tier mais baixo (sonnet sem effort vs. opus/xhigh). |
| security-reviewer | sonnet | — | OWASP Top 10, segredo hardcoded, auth quebrada, CVE de dependência | SUBSTITUIR PELO GLOBAL — mesmo nome do global; hoje o local (sonnet, sem effort) é quem vale por precedência, mesmo cobrindo dado de cliente e RLS, que é exatamente o tipo de decisão que este harness quer em opus/xhigh. |
| seo-specialist | sonnet | — | Otimiza metadado, dado estruturado, rastreabilidade e visibilidade em busca (tradicional e IA) | MANTER SÓ NO PROJETO — relevância depende de quais páginas do skale-insight são públicas; não é necessidade universal dos quatro produtos. |
| test-engineer | sonnet | — | Escreve teste unitário/integração com disciplina de TDD, analisa cobertura | SUBSTITUIR PELO GLOBAL — mesmo escopo do test-writer global (sonnet/medium); aqui sem effort declarado. |
| typescript-reviewer | sonnet | — | Revisa TS/JS (fora de JSX) para segurança de tipo, correção assíncrona, risco de injeção, prototype pollution | PROMOVER AO GLOBAL — lente de tipagem/segurança de TS que nem code-reviewer (geral) cobre com essa profundidade; genérica a qualquer projeto TypeScript. |

## Resumo do critério usado
- **SUBSTITUIR PELO GLOBAL**: o agente do projeto faz basicamente o mesmo trabalho que um dos 9
  globais, só que num tier mais fraco (sonnet sem effort onde o global pede opus/xhigh, ou sonnet
  sem effort onde o global já declara effort explícito).
- **MANTER SÓ NO PROJETO**: o valor do agente depende de conhecimento específico do skale-insight
  (roadmap, backlog, páginas públicas, hooks do próprio projeto) que não generaliza para Skale CRM,
  Finance Personal ou Finance Business.
- **PROMOVER AO GLOBAL**: o agente cobre uma lacuna que nenhum dos 9 globais cobre hoje, e o
  trabalho não depende de nada específico do skale-insight — serviria igualmente aos outros três
  produtos. (Promover aqui é recomendação para o Eric decidir depois; nenhum desses agentes foi
  criado no elenco global por este passo.)
