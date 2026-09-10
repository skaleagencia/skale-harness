# Prompt — terminar a limpeza do `.claude/` do skale-insight

> Para colar numa sessão do Claude Code aberta **dentro do projeto skale-insight**.
> Gerado em 2026-08-20, ao fim da fase 1 do skale-harness.

---

```
Preciso terminar uma limpeza que começou em outro projeto. Leia tudo antes de agir.

CONTEXTO — o que mudou fora daqui

Existe agora um repositório chamado skale-harness, em
"/Users/ericsoarese/Projetos Vibing Code/Cloude code/Skale Harness", que versiona a
configuração GLOBAL do Claude Code (~/.claude/) e a reinstala em qualquer máquina.

A regra que organiza tudo: o que serve a QUALQUER projeto mora no global. O que depende
deste código, deste schema ou deste domínio mora aqui. Configuração global dentro do
repositório de um projeto é ruim por dois motivos: fica invisível para os outros três
produtos (Skale CRM, Finance Personal, Finance Business), e some junto com a máquina,
porque .claude/ não vai para o Git.

Hoje o global já tem: 18 agentes especialistas, 8 hooks, 11 skills, um CLAUDE.md global
com roteador de intenção, e permissões (123 liberadas, 101 que perguntam, 24 bloqueadas).

PLUGINS JÁ INSTALADOS GLOBALMENTE — é contra esta lista que se decide o que é redundante:
superpowers, ponytail, caveman, aia-harness, hookify, pr-review-toolkit, commit-commands,
claude-code-setup, feature-dev, code-review, claude-md-management, ui-ux-pro-max, vercel,
document-skills, example-skills, claude-academy-guide, discernment-nudge

SKILLS JÁ GLOBAIS: brainstorm-para-plano, configurar-lint, design-pro, frontend-design,
impeccable, limpar-projeto, memoria-do-projeto, ondas-paralelas, revisao-multi-agente,
theme-factory, zerar-avisos-lint

HOOKS JÁ GLOBAIS: rtk-proxy.mjs, lint-gate.mjs, orchestration-mode.mjs,
bootstrap-projeto.mjs, secret-scan.mjs, guard-main-branch.mjs,
validate-settings-schema.mjs, arquivo-grande-ao-editar.mjs

O QUE JÁ FOI FEITO AQUI — não refaça, não desfaça

- Dos 23 agentes: 9 foram promovidos ao global, 9 apagados (faziam o mesmo que um global,
  em tier mais fraco), 5 ficaram: orchestrator, product-manager, product-owner,
  project-planner, seo-specialist.
- 4 hooks foram promovidos ao global e removidos daqui, junto com o registro deles no
  settings.json: secret-scan, guard-main-branch, validate-settings-schema,
  arquivo-grande-ao-editar.
- Foram apagados: skills/impeccable (duplicata exata da global), skills/memory-system e
  commands/remember.md (gravavam em .agents/memory/, pasta que não existe aqui),
  skills/react-performance (o plugin vercel já entrega isso atualizado), rules/testing.md,
  rules/verification.md, commands/verify.md, commands/debug.md,
  hooks/orchestration-mode.mjs (arquivo morto) e settings.json.graphify-bak.
- Do settings.json foram removidas duas coisas que anulavam o harness aqui dentro:
  a variável de ambiente CLAUDE_CODE_EFFORT_LEVEL fixada em "max" (sobrescrevia em
  silêncio o esforço declarado por cada especialista) e o defaultMode "bypassPermissions"
  (dispensava toda aprovação neste projeto).
- Foram removidas da raiz as pastas de outras ferramentas de IA que replicavam a mesma
  regra: .agents, .clinerules, .codex, .cursor, .opencode, .windsurf, .github e AGENTS.md.

A TAREFA

Sobrou dentro de .claude/ um conjunto grande que ninguém classificou ainda:
37 skills, 19 hooks, 14 regras e 9 comandos. Decida item por item o que é global, o que é
deste projeto, e o que é lixo — e execute.

INVENTÁRIO

skills/ (37):
agent-browser, api-design, app-builder, architecture, bash-linux, batch-operations,
behavioral-modes, claude-code-worktrees, clean-code, context-compression,
coordinator-mode, database-design, deployment-procedures, documentation-templates,
error-handling, git-workflow, goal-builder, graphify, i18n-localization,
intelligent-routing, lint-and-validate, lint-fix, performance-profiling,
powershell-windows, pre-commit-verify, react-patterns, react-testing, red-team-tactics,
run-tests, server-management, setup-testing, tailwind-patterns, test-triage,
testing-patterns, uncle-bob-craft, vulnerability-scanner, web-design-guidelines

hooks/ (19):
check-deps-on-start.mjs, format-on-edit.mjs, gh-scope-guard.mjs, graphify-orient.mjs,
hook-io.mjs, memory-stop.mjs, rtk-hook.mjs, session-scratch.mjs, set-files-changed.mjs,
sql-idempotent-review.mjs, subagent-model-guard.mjs, verify-on-stop.mjs,
worktree-create.mjs, worktree-prompt-ctx.mjs, worktree-remove.mjs, worktree-seed.mjs,
worktree-session-ctx.mjs, worktree-subagent-ctx.mjs, worktree-write-guard.mjs

rules/ (14):
01-ddd.md, 02-design-patterns.md, 03-coding-principles.md, 04-code-quality.md,
05-testing.md, 06-security.md, 07-subagent-dispatch.md,
08-parallel-subagent-driven-development.md, ecc/ (pasta com 18 arquivos),
hooks-cross-platform.md, hooks-cwd-resolution.md, javascript.md,
react/coding-standards.md, typescript/coding-standards.md

commands/ (9):
brainstorm.md, coordinate.md, create.md, deploy.md, enhance.md, orchestrate.md, plan.md,
preview.md, test.md

CLASSIFIQUE cada item em um destes:

- MANTER AQUI — depende do código, do schema, do domínio ou do histórico do skale-insight
- PROMOVER AO GLOBAL — genérico E cobre uma lacuna que NENHUM plugin da lista acima cobre
- APAGAR — duplicata, quebrado, órfão, ou coberto por plugin já instalado

CRITÉRIO QUE DECIDE, e é o mais importante deste trabalho:

Promover NÃO é o caminho padrão. Quase tudo aqui é material genérico copiado de dois kits
externos (ag-kit e ECC) e sobrepõe plugin que já está instalado. Levar tudo para o global
significa carregar a descrição de 50 skills em toda sessão de todo projeto — o oposto do
que o harness quer, que é ter a ferramenta certa entrando sozinha, não todas ligadas
sempre.

Então: só promova o que passar nos DOIS testes ao mesmo tempo:
  1. Nenhum plugin instalado já cobre isso
  2. Eu usaria isso em pelo menos dois dos quatro produtos

Na dúvida entre PROMOVER e APAGAR, escolha APAGAR — o backup existe, e recuperar um
arquivo é mais barato que carregar peso morto em toda sessão pelos próximos meses.

ARMADILHAS JÁ VERIFICADAS — trate cada uma

1. HOOK NÃO REGISTRADO NÃO RODA. Um arquivo em hooks/ só dispara se estiver escrito no
   settings.json ou settings.local.json. Antes de classificar qualquer hook, verifique se
   ele está registrado e em qual evento. Hook no disco e fora do settings é arquivo morto —
   classifique como APAGAR, não como "manter por precaução".

2. hook-io.mjs e session-scratch.mjs NÃO são hooks — são bibliotecas que os outros
   importam. Não estão registrados de propósito. Se promover ou apagar um hook que importa
   deles, resolva a dependência: ou leva junto, ou embute o código dentro do arquivo.

3. worktree-create.mjs SUBSTITUI o mecanismo nativo do Claude Code de criar cópia paralela
   do projeto. Não é um observador: é o próprio mecanismo. Se quebrar, a função inteira
   quebra, sem plano B. Os 7 arquivos worktree-* andam juntos — decida sobre o conjunto,
   nunca item por item.

4. check-deps-on-start.mjs tem um bug real: a linha `const cwd = event.cwd ?? process.cwd()`
   acessa `event.cwd` sem checar se `event` veio nulo. Se vier, o script quebra em vez de
   simplesmente não fazer nada — o que contradiz o comentário do próprio arquivo, que
   promete nunca bloquear. Corrija antes de promover, ou apague.

5. rtk-hook.mjs faz a mesma coisa que o rtk-proxy.mjs já global, só que dependendo de um
   programa externo instalado à parte. Mesma missão, implementação pior. Ele ESTÁ
   registrado no settings.json: se apagar, remova o registro junto.

6. verify-on-stop.mjs roda lint no fim da sessão e BLOQUEIA se der erro. A decisão de
   rodar só nos arquivos tocados, e não no repositório inteiro, está justificada no
   comentário do próprio arquivo pela dívida de 155 avisos de lint deste projeto. É
   decisão local, não regra universal.

7. rules/07-subagent-dispatch.md é híbrido: a ideia (consultar a própria tabela de
   roteamento antes de escolher especialista) é genérica, mas o texto aponta para a tabela
   deste projeto. Se for promover, separe o método do ponteiro.

8. rules/08-parallel-subagent-driven-development.md e a skill global ondas-paralelas
   cobrem a mesma ideia de duas formas. Deixar as duas vivas é garantir que uma envelheça.
   Decida por uma.

9. rules/react/coding-standards.md e rules/ecc/react/*.md cobrem terreno parecido, de
   fontes diferentes. Verifique se chegam a se contradizer antes de promover os dois.

10. rules/javascript.md tem nome enganoso: o conteúdo é sobre TypeScript.

11. O settings.json tem duas entradas que chamam um programa por caminho fixo desta
    máquina: /Users/ericsoarese/.local/bin/graphify. Em outro computador isso não existe.
    Verifique se falha aberto (não faz nada) ou se trava, e reporte.

REGRAS DE SEGURANÇA — não negociáveis

- ANTES de apagar qualquer coisa, faça um backup:
  tar -czf ~/Desktop/skale-insight-claude-$(date +%Y%m%d-%H%M%S).tar.gz .claude
- ANTES de apagar cada item, ABRA e confirme que o motivo procede. Se não procede, não
  apague: reporte o que encontrou.
- Ao editar o settings.json, valide com `jq empty` depois e não toque em nenhuma outra
  chave.
- Promover um hook exige: remover caminho absoluto, embutir dependência de arquivo vizinho,
  garantir que falha ABERTO (qualquer erro sai em código 0, sem saída), rodar
  `node --check` e testar `echo '{}' | node <arquivo>` sem explodir. Hook que falha fechado
  trava trabalho em TODOS os projetos, não só neste.
- Hook promovido só funciona depois de ser REGISTRADO no ~/.claude/settings.json. Copiar o
  arquivo não basta.
- Não commite nada. Deixe as mudanças pendentes para eu revisar.

O QUE NÃO TOCAR

- .claude/agents/ — os 5 que sobraram já foram decididos
- .claude/memory/ — é o sistema de memória ativo deste projeto
- CLAUDE.md, PRODUCT.md, .mcp.json, .vercel/, .env — todos precisam ficar como estão
- Qualquer coisa fora de .claude/

ORDEM DE TRABALHO

1. Faça o backup.
2. Levante quais hooks estão de fato REGISTRADOS, e em qual evento. Comece por aqui: é o
   que separa hook vivo de arquivo morto.
3. Me mostre a tabela completa de classificação — item, o que é em uma frase, classificação,
   justificativa — e PARE. Não execute nada antes de eu aprovar.
4. Depois do meu ok, execute na ordem: apagar o que é lixo, promover o que passou nos dois
   testes, deixar o resto.
5. Ao final, confirme que o settings.json continua válido e liste o que mudou.

COMO FALAR COMIGO

Eu não programo. Escreva tudo em português, dizendo o efeito antes do mecanismo, sem nome
interno de arquivo ou função como se fosse português. Uma frase por item, concreta: o que
essa coisa faz por mim e o que eu perco se ela sair.
```
