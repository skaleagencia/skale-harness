# Pendências no skale-insight — esperando o bug fechar

> Aberto em 2026-08-20. Adiado a pedido do Eric: há correção de bug em andamento naquele projeto.
> **Nada aqui foi executado.** O projeto está exatamente como estava.

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

## Já executado, não refazer

- **2026-08-19** — 9 agentes locais removidos, 9 promovidos ao global, 35 skills, 9 comandos e
  11 regras genéricas apagadas, 11 hooks removidos e 4 promovidos. O `.claude/` do projeto saiu
  de 4,5 MB para 120 KB.
- **2026-08-20** — `produto: Skale Insights` acrescentado ao `CLAUDE.md` do projeto, para as skills
  do ClickUp não precisarem perguntar.
- O prompt em [prompt-limpeza-skale-insight.md](prompt-limpeza-skale-insight.md) **já foi
  executado** e está defasado — não usar de novo.
