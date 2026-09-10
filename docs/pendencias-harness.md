# Pendências do harness — três decisões paradas

> Aberto em 2026-08-27. O Eric interrompeu para tratar o chatbot do skale-insight, que era urgente.
> **Nada foi executado.** As três estão levantadas e prontas para decisão.

---

## 1. `database-architect` — manter ou fundir?

**Ele já existe**, criado em 2026-08-20, em `opus/xhigh`. A pergunta não é criar — é se continua.

A fronteira que está escrita nele:

| Agente | Responde |
|---|---|
| `database-architect` | Quais tabelas, índices e políticas de acesso devem existir |
| `migration-specialist` | Como chegar lá sem quebrar o que está em produção |
| `backend-specialist` | Que código lê e escreve nessas tabelas |

**A dúvida real:** o `backend-specialist` consome 28% do uso, e parte disso pode ser trabalho de
banco. Não dá para saber se é *desenho* de schema ou só *uso* — e é exatamente essa a linha que
separa os dois agentes.

**Recomendação: manter e medir.** Na medição de 29/08, ver se ele foi usado. Se ficar em 0% e o
`migration-specialist` estiver desenhando junto com aplicar, os dois viram um.

---

## 2. `orchestrator` do skale-insight — apagar?

Verificado, não presumido. O hook global `orchestration-mode.mjs` cobre o núcleo: rodar como
orquestrador, decompor, delegar, definir model por despacho, paralelizar o independente.

**O que o agente tem a mais existe — e é o problema.** Ele exige um arquivo de plano antes de
qualquer despacho (regra que nenhuma outra parte do setup pede), integra com `.agents/memory/`
(que não é o sistema de memória usado), e traz uma tabela de roteamento citando `mobile-developer`,
`game-developer` e `test-engineer` — agentes que nunca existiram no projeto. Seguindo o próprio
manual, ele chamaria fantasmas.

**Pior, estruturalmente:** ele não restringe ferramentas no frontmatter, então herda acesso à
ferramenta de despachar agentes. O protocolo dele instrui um subagente a despachar outros
subagentes — sessão principal (já orquestrando) → `orchestrator` (mais 25 a 35 mil tokens) →
especialistas. Uma camada inteira paga para repetir o que a sessão já faz de graça.

**Recomendação: apagar.** Com uma condição obrigatória — as linhas 60 e 104 do `CLAUDE.md` do
skale-insight citam ele por nome. Apagar o arquivo sem corrigir essas duas linhas recria
exatamente o problema dos agentes fantasmas que acabou de ser resolvido.

---

## 3. Revisores e exploradores de plugin — desativar?

O levantamento derrubou a premissa inicial e trouxe um achado.

**O `pr-review-toolkit:code-reviewer` é cópia quase literal do `feature-dev:code-reviewer`** —
mesma seção de responsabilidades, mesmo formato de saída. A única diferença é uma seção "quando
invocar". Nenhuma capacidade de análise que o outro não tenha.

| | Global | feature-dev | pr-review-toolkit |
|---|---|---|---|
| Tier | **opus/xhigh fixo** | sonnet, **herda a sessão** | opus, **herda a sessão** |
| Checklist da stack real (React, TS, Supabase/Deno, RLS) | Sim | Não | Não |
| Separa segurança e delega | Sim | Não | Não |
| Nota de confiança 0-100 | Não | Sim | Sim |

**O ponto que não estava previsto:** os de plugin não declaram `effort`, então herdam o da sessão.
Hoje empatam com o global porque a sessão está em `xhigh`. Se a sessão cair, eles caem junto, sem
avisar. O risco não é "cair no caro" — é cair num com tier indefinido.

**Sobre desativar:** o `settings.json` só tem liga/desliga por plugin inteiro, não por agente.
Desligar o `pr-review-toolkit` levaria junto `silent-failure-hunter`, `pr-test-analyzer`,
`code-simplifier`, `comment-analyzer`, `type-design-analyzer` e o comando `/review-pr` — cinco
revisores sem equivalente global.

**Recomendação: não desativar nada.** A regra do CLAUDE.md já governa o roteamento automático, e o
plugin continua disponível quando a skill `revisao-multi-agente` o chamar de propósito — que é o
cenário onde ele se paga.

Na exploração, mesma conclusão: manter a dupla `explorer` (haiku, acha) + `code-explorer` (sonnet,
entende). O do plugin faz os dois papéis sempre em sonnet, e nunca cai para o barato quando a
pergunta é só "onde fica X".

---

## Já executado nesta leva

- **MANIFEST**: histórico da correção de 22/08, os dois aprendizados permanentes, a pendência de
  medição de 29/08, e o elenco real (17 globais + 5 locais do skale-insight)
- **Nomes mortos**: `orchestrator.md`, `product-manager.md` e `project-planner.md` do skale-insight
  tinham 6 nomes de agente inexistentes citados no corpo, repetidos cerca de 30 vezes. Todos
  substituídos ou removidos. Varredura final: zero
- **Caveman desligado** (global e no skale-insight) e regra nova de tamanho de relatório no
  CLAUDE.md — 2026-08-27

---

## O que está construído mas ainda não foi provado

Movido do README em 2026-09-10. São itens de backlog: vão sair desta lista conforme cada um rodar
de verdade pela primeira vez.

| O quê | Estado | O que falta para sair daqui |
|---|---|---|
| As 3 skills do ClickUp | Escritas, instaladas, leitura testada contra as tarefas reais | Executar uma tarefa ponta a ponta, do "próximo" até "homologação" |
| Template de backup do Supabase | Pronto, nunca rodou | Conta no R2, os 6 secrets no GitHub, e um teste de restauração |
| Hook de bootstrap | Testado em pasta de teste | Abrir um projeto de verdade pela primeira vez |
| Checkpoint automático | Testado em repositório de teste | Salvar um trabalho real antes de uma operação destrutiva |
| Doc "Mapa do Repositório" no ClickUp | Não existe | Criar — sem ele o refino automático das tarefas sai genérico |
| `rclone` | Não instalado | Necessário para a etapa de envio ao R2 |
| `supabase` CLI | v2.84.2, existe v2.115.0 | Atualizar |

**O item mais antigo e mais grave desta lista:** os bancos de produção dos quatro produtos seguem
**sem backup**. O template está pronto desde 2026-08-20 e não foi aplicado.

## Achados do levantamento de 2026-09-10

Apurados ao mapear a configuração `.claude/` dos projetos. Nenhum foi corrigido.

- **Dois projetos rodam com toda confirmação desligada** — `Skale CRM` e `LP Arden` têm
  `defaultMode: bypassPermissions` no `settings.local.json`. Contraria a regra 8 do CLAUDE.md.
- **Uma chave do Supabase gravada em texto** no `settings.json` do `Skale Finance Personal`,
  dentro de uma regra de permissão que guardou um `curl` inteiro. É a chave publishable (pública,
  feita para rodar no navegador), então o risco é baixo — mas é o efeito exato descrito na seção 3
  do CLAUDE.md.
- **Três projetos dependem do `~/.gitignore_global`** para ignorar o `.claude/` — arquivo que não
  acompanha o repositório. Em outra máquina, essa configuração passa a aparecer para commit.
- **O `.claude/` do skale-insight tem 5,4 MB, e 5,2 MB são backups gerados** por automação. 96% do
  peso é arquivo descartável.
- **O `CLAUDE.md` do skale-insight aponta para `.claude/skills/graphify/SKILL.md`**, e essa pasta
  está vazia.
