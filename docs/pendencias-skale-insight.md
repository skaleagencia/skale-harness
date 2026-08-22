# Pendências no skale-insight

> Aberto em 2026-08-20. **Os itens 1, 2 e 3 foram executados no mesmo dia** — ver "O que foi feito"
> no fim. Sobrou uma pendência menor, descrita na seção "O que ainda falta".

Origem: auditoria de consumo com `/cost` mostrou 15% dos tokens indo para o agente genérico
(`general-purpose`) e 3% para um `database-architect` que não existia. A investigação achou a causa
e mais coisa junto.

---

## 1. Seis agentes fantasmas — é isto que derruba os 15%

A tabela de roteamento do `CLAUDE.md` do skale-insight aponta para seis agentes que **não têm
arquivo**. Quem cita um nome sem arquivo cai no genérico: sem prompt especializado, sem model e sem
effort forçados. Cada chamada dessas roda mais cara e pior.

**A causa foi a limpeza de 2026-08-19**: nove agentes locais foram apagados (faziam o mesmo que um
global, em tier pior) e ninguém conferiu quem os citava.

| Fantasma no CLAUDE.md | Trocar por | Por quê |
|---|---|---|
| `database-architect` | `database-architect` | Passou a existir no global em 2026-08-20 (opus/xhigh) — este já resolve sozinho |
| `explorer-agent` | `code-explorer` | Foi renomeado ao ser promovido, para não confundir com o `explorer` em haiku |
| `test-engineer` | `test-writer` | Mesmo escopo, agora com effort declarado |
| `qa-automation-engineer` | `test-writer` | O global cobre unitário, integração e E2E |
| `security-auditor` | `security-reviewer` | Mesma função, hoje em opus/max |
| `penetration-tester` | `security-reviewer` | Mesma função, hoje em opus/max |

**Como fazer:** editar a tabela de roteamento do `CLAUDE.md` do projeto, trocando os nomes. Depois,
varrer o projeto inteiro atrás de outras citações órfãs:

```bash
cd "/Users/ericsoarese/Projetos Vibing Code/Cloude code/skale-insight"
for a in $(ls ~/.claude/agents/*.md .claude/agents/*.md | xargs -n1 basename | sed 's/.md$//' | sort -u); do :; done
# e conferir cada nome citado no CLAUDE.md contra os arquivos que existem de fato
```

---

## 2. Os 5 agentes locais não declaram `effort`

| Agente | model | effort |
|---|---|---|
| `orchestrator` | sonnet | não declara |
| `product-manager` | sonnet | não declara |
| `product-owner` | sonnet | não declara |
| `project-planner` | sonnet | não declara |
| `seo-specialist` | sonnet | não declara |

Sem `effort` declarado, todos herdam o nível da sessão — hoje `xhigh`. Não está errado, mas
significa que planejar uma história e revisar metadado de SEO gastam o mesmo esforço de um trabalho
crítico. Vale calibrar: provavelmente `medium` para a maioria.

---

## 3. O `orchestrator` é candidato a sair

A sessão principal já orquestra — o hook `orchestration-mode.mjs` injeta essa instrução em toda
mensagem, em todo projeto. Um agente que orquestra, chamado por uma sessão que já orquestra, é um
nível a mais de indireção, e cada subagente custa de 25 a 35 mil tokens só para iniciar.

**Antes de apagar:** ler o arquivo e confirmar que ele não tem regra de negócio do projeto dentro.
Se tiver, a regra vai para o `CLAUDE.md` do projeto e só então o agente sai.

---

## Como verificar que funcionou

Depois de executar, e com uma sessão nova aberta no skale-insight:

```bash
# nenhum nome citado sem arquivo correspondente
/agents          # deve listar 22: 17 globais + 5 locais
```

E o teste que de fato importa, alguns dias depois:

```bash
/cost            # general-purpose bem abaixo dos 15%
```

---

## O que ainda falta

**O corpo de três agentes locais cita nomes que não existem mais.** O frontmatter foi corrigido,
mas dentro do texto de `orchestrator.md`, `project-planner.md` e `product-manager.md` ainda há
referência a `test-engineer`, `security-auditor`, `penetration-tester`, `explorer-agent` e até a
`mobile-developer` e `game-developer` — que nunca existiram neste projeto.

É conteúdo vindo pronto do kit `ag-kit`, nunca adaptado. Não quebra nada hoje (essas citações estão
no corpo, não no roteamento), mas é o mesmo tipo de armadilha: um dia alguém segue a instrução e cai
no agente genérico.

**Decisão pendente sobre o `orchestrator`.** A avaliação confirmou: é template genérico do ag-kit,
sem uma linha sobre Skale, `company_id`, RLS ou ClickUp. A tabela interna dele lista agentes que
nunca existiram aqui. O hook global `orchestration-mode.mjs` já faz esse papel em toda sessão de
todo projeto, e cada subagente custa de 25 a 35 mil tokens só para iniciar.

Recomendação: apagar. Mas é decisão do Eric, e ninguém apagou nada.

---

## O que foi feito

**2026-08-20, na mesma sessão em que foi aberto:**

- Os 6 fantasmas foram trocados pelos globais corretos, nas duas tabelas de roteamento do
  `CLAUDE.md` — e numa terceira citação, fora das tabelas, na seção de regras de engenharia.
  Linhas duplicadas foram fundidas (as duas de teste viraram `test-writer`; as duas de segurança
  viraram `security-reviewer`).
- Foram acrescentados à tabela os globais que faltavam: `architect`, `migration-specialist`,
  `explorer` e `doc-updater`, mais quatro linhas de desambiguação para os pares que mais causam
  roteamento errado.
- `"model": "opusplan"` removido do `settings.json`. Era ele que fazia o projeto planejar em opus e
  **executar em sonnet**, enquanto o Eric via `opus[1m]` selecionado e achava que rodava em opus.
  Configuração de projeto vence a global — e isso não aparece em lugar nenhum da tela.
- `CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING` removido do `env`, pelo mesmo motivo: reduzia capacidade
  só naquele projeto, em silêncio.
- Os 5 agentes locais passaram a declarar `effort` (`medium`, exceto `project-planner` em `high`).
  Antes herdavam o nível da sessão, então revisar metadado de SEO gastava como trabalho crítico.
- Varredura final: zero nomes de agente citados sem arquivo correspondente.

## Já executado antes, não refazer

- **2026-08-19** — 9 agentes locais removidos, 9 promovidos ao global, 35 skills, 9 comandos e
  11 regras genéricas apagadas, 11 hooks removidos e 4 promovidos. O `.claude/` do projeto saiu
  de 4,5 MB para 120 KB.
- **2026-08-20** — `produto: Skale Insights` acrescentado ao `CLAUDE.md` do projeto, para as skills
  do ClickUp não precisarem perguntar.
- O prompt em [prompt-limpeza-skale-insight.md](prompt-limpeza-skale-insight.md) **já foi
  executado** e está defasado — não usar de novo.
