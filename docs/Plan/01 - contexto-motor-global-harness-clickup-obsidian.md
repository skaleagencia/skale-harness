# skale-harness — Motor Global: Harness + ClickUp + Obsidian

> Repositório que versiona a configuração global do Claude Code e distribui o harness para todos os projetos — velhos e novos.
>
> Este documento é o briefing para abrir a primeira sessão do `skale-harness`. Reúne todas as decisões tomadas até aqui sobre a automação do fluxo de desenvolvimento.
>
> ⚠️ **Estado atual:** o repositório é novo, mas o `~/.claude/` **não está vazio** — já existem 18 plugins, 10 skills, 2 hooks e 5 MCPs instalados em sessões anteriores. O trabalho é **importar e organizar**, não começar do zero. Ver a seção "O que já existe" abaixo.
>
> `CLAUDE_CODE_SUBAGENT_MODEL` verificada e vazia — o roteamento de modelo vai funcionar.

---

## ⚠️ ANTES DE TUDO — dois ajustes no plano

### 1. O harness é uma tomada, não um interruptor geral

A intenção está certa: você não deve ficar chamando skill na mão. Mas **"todas as ferramentas acionadas automaticamente"** não é a mesma coisa que **"tudo ligado o tempo todo"**.

> 🔌 **A analogia:** sua casa tem tomada em todo cômodo. Nem por isso o liquidificador, o aspirador e o chuveiro ficam ligados juntos "por precaução". Você pluga o que precisa, quando precisa.

| | O que acontece |
|---|---|
| ❌ Tudo ligado sempre | 18 plugins + 5 MCPs entram no contexto de toda sessão. Lento, caro, contexto acaba cedo |
| ✅ Roteamento por intenção | O agente **identifica** o que a situação pede e pluga só aquilo |

Você mesmo já anotou essa ressalva no seu setup: *"3 MCPs novos carregam ferramentas no contexto. Se as respostas ficarem lentas, desligar o chrome-devtools primeiro."*

**O resultado esperado é o mesmo que você quer:** você manda o pedido, o harness resolve o que acionar. A diferença é que ele aciona **o certo**, não **tudo**.

### 2. Configuração global não mora em repositório

O global fica em `~/.claude/` — fora de qualquer projeto. Um "repositório do motor" não vira global sozinho.

**O padrão correto** é um repositório no estilo *dotfiles* — batizado de **`skale-harness`**:

```
skale-harness/
├── claude/                 ← espelho versionado de ~/.claude/
│   ├── settings.json
│   ├── CLAUDE.md           ← o CLAUDE.md GLOBAL
│   ├── MANIFEST.md         ← catálogo de TUDO que compõe o setup
│   ├── agents/             ← subagentes, com model por tier
│   ├── skills/             ← inclui o impeccable
│   └── hooks/
├── templates/              ← backup Supabase, e o que mais for reutilizável
├── install.sh              ← sincroniza + instala + reporta o que falta
├── backup.sh               ← captura o estado atual
├── SETUP.md
└── README.md
```

Ganhos: versionado no Git, reversível, replicável em outra máquina, e o Claude Code pode editar os arquivos normalmente porque estão dentro do repo.

### O `MANIFEST.md` é o que impede o esquecimento

Existem **duas categorias** de coisa no setup:

| | O quê | Como volta |
|---|---|---|
| **A — arquivos** | Skills, agentes, hooks, CLAUDE.md | O `install.sh` **copia** |
| **B — instaláveis** | Plugins de marketplace, CLIs, MCPs | O `install.sh` **roda o comando** |

A categoria B não pode viver no repositório — mas a **lista e o comando de instalar cada um**, sim. É isso que o `MANIFEST.md` guarda.

> Sem ele, o setup vira conhecimento tácito que só existe na sua cabeça. Você troca de máquina, instala metade, e descobre o que faltou semanas depois.
>
> **Regra:** ferramenta nova → entra no MANIFEST no mesmo dia.

### O `skale-harness` é a caixa de ferramentas do setor de Dev

Dois usos no dia a dia:

**Trocar de máquina**
```bash
git clone [skale-harness] && cd skale-harness && ./install.sh
```
Skills, agentes, hooks, `CLAUDE.md` global e roteamento de modelo voltam de uma vez.

**Melhorar a automação depois**
Abre o `skale-harness`, implementa, roda `install.sh`, e a melhoria vale em todos os projetos. Um lugar só.

> ⚠️ **O que o Git não traz de volta:** login do Claude Code, credenciais dos MCPs, CLIs de sistema (graphify, agent-browser) e o vault do Obsidian. Credencial não vai para o repositório — e não deve mesmo.
>
> Por isso o `install.sh` **verifica o que falta e te diz na tela** ao terminar, com o comando de resolver cada item. Sem isso, você clona numa máquina nova e passa uma hora descobrindo por que o ClickUp não conecta.

### 3. Nem tudo herda sozinho — e é aí que mora o trabalho

**O objetivo:** abrir qualquer projeto — velho ou novo — e o harness já estar valendo, sem configurar nada.

Boa parte disso funciona de graça. Mas uma parte **não**, e é a parte que dá trabalho.

**Herda sozinho ✅** — vale em qualquer pasta, sem fazer nada

| O quê | Por quê |
|---|---|
| `~/.claude/CLAUDE.md` global | Lido em toda sessão, em qualquer projeto |
| Plugins habilitados | `~/.claude/settings.json` é global |
| Skills globais | `~/.claude/skills/` |
| Hooks globais | `~/.claude/hooks/` |
| CLIs (graphify, agent-browser) | Binários no PATH |
| O roteador de intenção | Se implementado como instrução no CLAUDE.md global |

**NÃO herda ❌** — precisa existir dentro de cada projeto

| O quê | Por quê |
|---|---|
| `graphify-out/graph.json` | O mapa é do código daquele repo |
| `.mcp.json` | Credenciais e servidores por projeto |
| `CLAUDE.md` do projeto | Stack, arquitetura e convenções daquele código |
| Regras do caveman (`.cursor/rules/`, `.windsurf/rules/`) | Arquivos por repositório, por natureza |
| Doc "Mapa do Repositório" no ClickUp e Obsidian | Um por produto |
| `PRODUCT.md` / `DESIGN.md` | Contexto do produto |

> 💡 **A distinção que importa:** o global carrega **como trabalhar**. O projeto carrega **o que existe ali**. Nenhum dos dois substitui o outro — e nenhuma configuração global consegue adivinhar o conteúdo de um repositório que ela nunca leu.

**A solução: bootstrap automático.**

Ao abrir um projeto pela primeira vez, o harness detecta o que falta e **oferece** criar. Não pergunta a cada sessão — só na primeira, e registra que já perguntou.

```
Projeto sem CLAUDE.md?          → oferece rodar aia-harness:init
Projeto sem graphify-out/?      → oferece rodar graphify update .
Projeto sem regras do caveman?  → oferece rodar /caveman-init
Projeto sem .mcp.json?          → avisa que ClickUp e Obsidian não vão funcionar ali
```

É isso que faz "abrir projeto velho e já estar valendo" ser verdade.

---

## PARTE 1 — O que já foi decidido sobre o fluxo

### O objetivo final

```
Time ou cliente solicita no ClickUp
        ↓ automação distribui para a lista certa
Autopilot Agent (ClickUp) refina: descrição estruturada + campos + prompt pronto
        ↓
Você confere no ClickUp
        ↓
Claude Code: /planejar → /executar-tarefa [id]
        ↓
Tarefa move para Homologação com comentário do que foi feito
```

**Você não escreve prompt em nenhum ponto.**

### Estrutura no ClickUp — já criada ✅

**Espaço Tecnologia → Pasta Desenvolvimento → 2 listas**

| Lista | Conteúdo | Fluxo |
|---|---|---|
| **Backlog & Roadmap** | Feature · Melhoria · Tarefa Técnica · Spike | Planejado, entra por ciclo |
| **Bugs & Suporte** | Bug · Suporte · Incidente | Reativo, entra por SLA |

**Status — Backlog & Roadmap:**
`Backlog → Próximo → Em Desenvolvimento → Homologação → Deploy → Concluído`

**Status — Bugs & Suporte:**
`Aberto → Triagem → Em Correção → Homologação → Resolvido` *(+ Não Reproduzível · Descartado)*

**Metodologia:** Kanban, não Scrum. Dev solo com Claude Code — capacity planning não faz sentido. Controle por **limite de WIP = 3** em *Em Desenvolvimento* e *Homologação*.

**Campos personalizados:**

| Campo | Opções |
|---|---|
| **Ítem** | Feature · Melhoria · Bug · Suporte · Tarefa Técnica · Spike |
| **Projeto** | Automações \| Chatbot · Análise de Atendimento (IA) · Prontuário · Rastreamento CTWA |
| **Componente** | Frontend · Backend · Data Base · Integrações · Segurança · UI/UX · Infra |
| **Produto** | Skale Insights · Skale CRM · Skale Finance Personal · Skale Finance Business |
| **Origem** | Cliente · Time · Roadmap · Incidente |
| **Prioridade** | nativa do ClickUp (Urgente · Alta · Normal · Baixa) |

> **Severidade foi removida.** Duas escalas era overhead para dev solo. O SLA passou a ser por Prioridade: Urgente = mesmo dia · Alta = 48h · Normal = semana · Baixa = backlog.

### Padrão de tarefa

Toda tarefa tem **dois comentários separados**:

1. **Contexto** — o porquê, decisões tomadas, dependências, critério de aceite
2. **Prompt** — o texto pronto para o Claude Code executar, em bloco de código

> 🐛 **Bug conhecido do ClickUp:** comentário **não renderiza tabela markdown** — vira `undefined` e o conteúdo se perde. Use listas com negrito. Bloco de código longo também pode se perder; texto corrido com separadores visuais é mais seguro.

### As 3 Skills

| Skill | Faz |
|---|---|
| `/executar-tarefa [id]` | Puxa a tarefa do ClickUp → implementa → move para Homologação → comenta o resultado |
| `/planejar` | Lê as duas listas, ordena por prioridade e dependência, imprime checklist **no chat** (sem criar documento) |
| `/atualizar-mapa` | Regenera o Mapa do Repositório em **dois destinos** |

**Regra crítica do `/executar-tarefa`:** se a tarefa não tiver critério de aceite claro, ele **recusa**, comenta o que falta e para. Não implementa em cima de especificação vaga.

### O Mapa do Repositório — dois destinos

```
Claude Code roda /atualizar-mapa
        ├─→ Obsidian  (grafo, exploração visual, notas ligadas)
        └─→ ClickUp   (leitura do Claude no chat e do Autopilot Agent)
```

**Por que os dois:**

| | Obsidian | ClickUp |
|---|---|---|
| Grafo visual | ✅ | ❌ |
| Claude Code lê | ✅ | ✅ |
| **Claude no chat lê** | ❌ *(vault é local)* | ✅ |
| Autopilot Agent usa como conhecimento | ❌ | ✅ |

> ⚠️ **O mapa nunca vai para o GitHub.** Ele lista tabela sem RLS, dívida técnica e pontos frágeis — é relatório de reconhecimento pronto para atacante. Repo privado a IA não lê; repo público é risco. O ClickUp resolve os dois problemas.

**Estrutura do mapa — 13 seções.** A mais importante é a **seção 10 — "O que está incompleto"**: é ela que evita criar tarefa para algo que já existe.

### Obsidian — decisões

**Vault único:** `~/ObsidianVault-Skale`, estrutura PARA. Todos os produtos no mesmo vault.

**Motivo:** conhecimento transversal ("Nunca use db push", "Lições de engenharia de prompt") liga os projetos no grafo. Vault separado por produto quebraria essas conexões e duplicaria notas que divergem com o tempo.

```
01-projetos/
├── Skale Insight/            ← notas do produto + Mapa-do-Repositorio.md
└── Skale Finance Business/

02-areas/                     ← responsabilidade contínua
03-conhecimento/              ← lições que atravessam produtos
04-referencia/                ← material de consulta
```

**Acesso somente via MCP do Obsidian.** Nunca escrever arquivo cru no vault.

**Wikilinks são por nome de arquivo, sem caminho** — mover pasta não quebra link. Só renomear quebra.

### O Autopilot Agent refinador (ClickUp)

Recurso **nativo** do ClickUp. Substituiu a ideia de construir um serviço próprio.

- **Roda em:** listas Backlog & Roadmap e Bugs & Suporte
- **Gatilho:** `Task or subtask created`
- **Conhecimento:** Doc "Mapa do Repositório" + docs de processo
- **Faz:** reescreve a descrição em formato estruturado, preenche os campos, cria o comentário com o prompt e marca "Refinada?"

> É o Mapa como fonte de conhecimento que faz o refino ser bom. Sem ele, sai genérico — e nenhuma IA de projeto genérica alcança isso.

---

## PARTE 2 — O que JÁ EXISTE hoje

> Levantado em 18/08/2026 com checagem real em disco, durante a sessão de trabalho no `skale-insight`.
> **Nada aqui precisa ser recriado.** O trabalho é importar, versionar e organizar.

### Plugins do vibe-coding-toolkit — globais ✅

Habilitados em `~/.claude/settings.json`:

`superpowers` · `ponytail` · `caveman` · `aia-harness` · `hookify` · `pr-review-toolkit` · `commit-commands` · `claude-code-setup` · `feature-dev` · `code-review` · `claude-md-management` · `ui-ux-pro-max`

### Skills globais ✅

Em `~/.claude/skills/` — 7 em português, mais as oficiais e o **impeccable**:

`brainstorm-para-plano` · `memoria-do-projeto` · `configurar-lint` · `ondas-paralelas` · `revisao-multi-agente` · `zerar-avisos-lint` · `limpar-projeto` · **`impeccable`** · `document-skills` · `example-skills` · `claude-academy-guide` · `discernment-nudge`

> 🎨 **Sobre o `impeccable`:** é a skill de design de produto — existe para o resultado não ter cara de IA e ter design de verdade. Como todo produto seu tem interface e vai para cliente pagante, ela é **central**, não acessória.
>
> Deve ser acionada **sozinha** em qualquer trabalho visual: tela, componente, landing page, identidade, layout, tipografia. Sem você chamar.
>
> ⚠️ Existe uma cópia duplicada em `skale-insight/.claude/skills/impeccable`, idêntica à global. Remover — a global já cobre.
>
> Os `PRODUCT.md` e `DESIGN.md` que ela consome são **por projeto**. Entram no bootstrap.

### Hooks globais ✅

| Hook | Quando dispara | O que faz |
|---|---|---|
| `rtk-proxy.mjs` | `PreToolUse [Bash]` | Compacta comando de leitura antes de rodar. Nunca toca escrita. Falha aberto |
| `lint-gate.mjs` | `PostToolUse [Write\|Edit]` | Roda ESLint no arquivo editado. **Não bloqueia de propósito** — o skale-insight tem 155 erros acumulados, e gate bloqueante trava o trabalho |
| `orchestration-mode.mjs` | — | Movido do skale-insight para o global em sessão anterior |

### CLIs de sistema ✅

| CLI | Onde | Escopo |
|---|---|---|
| `graphify` | `~/.local/bin/graphify` | Roda em qualquer pasta |
| `agent-browser` | `/opt/homebrew/bin/agent-browser` (v0.34.0) | Homebrew, global |

### MCPs conectados ✅

5 no total: `obsidian`, `context7`, `chrome-devtools`, entre outros.

### Obsidian ✅

Vault `~/ObsidianVault-Skale`, estrutura PARA. Produtos em `01-projetos/`. Wikilinks por nome de arquivo — mover pasta não quebra link.

**Números atuais:** 18 plugins · 7 marketplaces · 10 skills globais · 2 hooks globais · 5 MCPs

### ✅ Já funciona — evidência prática

Em teste no `skale-insight`, com um pedido comum e **sem citar ferramenta nenhuma**:

> **Pedido:** *"2 atualizações de design que vão fazer muita diferença"*
>
> **Resposta:** *"Isso é feature de UI no editor de fluxo — vou mandar pro especialista de frontend, ele que mexe nisso. Não seguro aqui."*
>
> **Delegou para:** `frontend-specialist` · **sonnet**

Isso confirma duas coisas:

1. **A delegação automática já acontece** — ele identifica o tipo de trabalho e escolhe o especialista sozinho
2. **Existem subagentes criados pelo `aia-harness:init`** dentro de `skale-insight/.claude/agents/`, incluindo pelo menos `frontend-specialist`

> ⚠️ **Consequência para a implementação:** esses agentes precisam ser **importados e promovidos ao global**, não recriados do zero. Recriar geraria dois elencos divergentes — um no projeto, outro global — e o do projeto tem precedência, então o global ficaria inerte.
>
> Antes de criar qualquer subagente novo, inventarie o que já existe em `skale-insight/.claude/agents/` e decida item por item: promove ao global, mantém local, ou substitui.

---

## O que AINDA NÃO existe — é o que vamos construir

- O repositório `skale-harness`
- **`CLAUDE.md` GLOBAL** *(existe por projeto, não global)*
- **Subagentes com roteamento de modelo** (`~/.claude/agents/`)
- **O harness invisível** — o roteador intenção → ferramenta
- **Bootstrap automático** por projeto
- **As skills do ClickUp**
- `install.sh` · `backup.sh` · `README.md` · `SETUP.md`

---

## Pendências já mapeadas

1. **Aviso automático do graphify → global?** Hoje são 2 hooks apenas no `.claude/settings.json` do skale-insight. Virando global, deve disparar **só se** o projeto tiver `graphify-out/graph.json`. Sem mapa, fica calado.
2. **`/caveman-init` é por projeto por natureza** — escreve em `.cursor/rules/`, `.windsurf/rules/`. Só rodou no skale-insight. Candidato a entrar no bootstrap.
3. **Cópia duplicada do impeccable** em `skale-insight/.claude/skills/impeccable` — idêntica à global, pode ser removida.

---

## PARTE 3 — Global × Por projeto

### Herda sozinho ✅

| O quê | Onde |
|---|---|
| `CLAUDE.md` global | `~/.claude/CLAUDE.md` |
| Plugins habilitados | `~/.claude/settings.json` |
| Skills globais | `~/.claude/skills/` |
| Hooks globais | `~/.claude/hooks/` |
| Subagentes | `~/.claude/agents/` |
| CLIs | PATH do sistema |
| O harness invisível | Instrução no CLAUDE.md global |

### NÃO herda — precisa de bootstrap ❌

| O quê | Por quê |
|---|---|
| `graphify-out/graph.json` | O mapa é do código daquele repo |
| `.mcp.json` | Credenciais por projeto |
| `CLAUDE.md` do projeto | Stack e arquitetura daquele código |
| Regras do caveman | `.cursor/rules/` — por repositório, sempre |
| Doc "Mapa do Repositório" | Um por produto |
| `PRODUCT.md` / `DESIGN.md` | Contexto do produto |

> 💡 O global carrega **como trabalhar**. O projeto carrega **o que existe ali**.

---

## Model × Effort × Ultracode — três coisas diferentes

Confundir esses três é o erro mais comum, e custa caro:

| | O que controla | Onde se define |
|---|---|---|
| **Model** | Quanto o agente **sabe** | frontmatter do subagente |
| **Effort** | Quanto ele **se esforça** antes de agir | frontmatter do subagente |
| **Ultracode** | **Quantos** agentes rodam ao mesmo tempo | só na sessão, manualmente |

### O elenco

| Agente | model | effort | Faz |
|---|---|---|---|
| planner / architect | `fable` | `max` | Decisões que não se refazem |
| security-reviewer | `opus` | `xhigh` | RLS, OWASP, autenticação |
| migration-specialist | `opus` | `xhigh` | Migração de banco |
| backend-specialist | `opus` | `high` | Lógica de negócio |
| frontend-specialist | `sonnet` | `high` | UI, componente, tela |
| code-reviewer | `sonnet` | `medium` | Revisão |
| test-writer | `sonnet` | `medium` | Testes |
| doc-updater | `haiku` | — | Documentação trivial |
| explorer / file-finder | `haiku` | — | Buscar, listar, grep |

> ⚠️ **Haiku não suporta effort.** Não coloque o campo nesses agentes.

### Por que xhigh na sessão, e não max

Três motivos:

**1. `max` não persiste.** O `effortLevel` do arquivo de configuração aceita apenas `low`, `medium`, `high` e `xhigh`. `max` é só de sessão — você teria que digitar toda vez, o oposto de harness invisível.

**2. A curva satura.** O ganho por token achata depois do xhigh. A recomendação oficial é começar em `xhigh` para código e trabalho agêntico, e reservar `max` para problemas genuinamente difíceis.

**3. `max` não tem teto de tokens e pode superpensar** em passos simples — ler arquivo, decidir a quem delegar, formatar resposta.

> 🎯 **O ponto que decide:** com o elenco bem configurado, a sessão principal faz **roteamento e delegação**. O trabalho pesado vai pros agentes, que têm effort próprio. Subir a sessão pra `max` encarece *decidir a quem delegar*, não melhora a implementação.

**Onde o `max` pertence:** na frontmatter do `architect` — raciocínio único, sem paralelismo, onde errar custa meses. A frontmatter aceita os cinco níveis, inclusive `max`, diferente do arquivo de config.

E pontualmente: `/effort max` quando aparecer um problema difícil específico.

### Por que xhigh como padrão, e não ultracode

O ultracode faz duas coisas: fixa a sessão em `xhigh` **e** liga orquestração automática de workflows — até 16 subagentes simultâneos.

A primeira parte seus agentes já sobrescrevem. A segunda **multiplica a quantidade** de agentes, e cada um custa 25-35k tokens só pra inicializar.

```
Roteamento por agente  →  economiza POR UNIDADE
Ultracode              →  multiplica a QUANTIDADE de unidades
```

**A configuração:** sessão em `xhigh` como padrão *(persiste)*, ultracode **manual**, só quando a tarefa tem partes independentes que se beneficiam de paralelismo real.

> Ligar ultracode por hábito é contratar 20 pessoas pra trocar uma lâmpada.

### 🔴 As duas variáveis que anulam tudo

```
CLAUDE_CODE_SUBAGENT_MODEL  → sobrescreve o model
CLAUDE_CODE_EFFORT_LEVEL    → sobrescreve o effort
```

Precedência: **variável de ambiente > frontmatter > sessão > padrão do modelo**

Se qualquer uma estiver setada, o roteamento é ignorado **em silêncio**. Não dá erro — simplesmente não funciona.

*(A de model já foi verificada e está vazia. A de effort ainda precisa ser conferida.)*

---

## PARTE 4 — Prompt para o novo repositório

> Cole na primeira sessão do repositório `skale-harness`, junto deste documento inteiro.

```
Vamos criar o repositório que versiona e distribui minha configuração global do
Claude Code, e depois montar o harness que dispensa acionar skill manualmente.

NOME DO PROJETO: skale-harness
O repositório que guarda a configuração global e distribui o harness para todos
os outros projetos.

CONTEXTO IMPORTANTE — LEIA COM ATENÇÃO
O repositório skale-harness é novo, mas o ~/.claude/ NÃO ESTÁ VAZIO. Já existe
configuração instalada, feita ao longo de sessões anteriores no projeto
skale-insight. Você vai IMPORTAR e ORGANIZAR o que existe, não começar do zero.

JÁ INSTALADO E GLOBAL (não recriar, não sobrescrever):

Plugins do vibe-coding-toolkit, habilitados em ~/.claude/settings.json:
  superpowers, ponytail, caveman, aia-harness, hookify, pr-review-toolkit,
  commit-commands, claude-code-setup, feature-dev, code-review,
  claude-md-management, ui-ux-pro-max

Skills globais em ~/.claude/skills/ (7 em português + oficiais + impeccable):
  brainstorm-para-plano, memoria-do-projeto, configurar-lint, ondas-paralelas,
  revisao-multi-agente, zerar-avisos-lint, limpar-projeto, impeccable,
  document-skills, example-skills, claude-academy-guide, discernment-nudge

Hooks globais em ~/.claude/hooks/:
  rtk-proxy.mjs          (PreToolUse [Bash] — compacta comando de leitura)
  lint-gate.mjs          (PostToolUse [Write|Edit] — roda ESLint no arquivo
                          editado. NÃO bloqueia de propósito: o skale-insight
                          tem 155 erros acumulados e um gate bloqueante travaria
                          o trabalho)
  orchestration-mode.mjs (movido do skale-insight para o global em sessão
                          anterior)

CLIs de sistema:
  graphify        ~/.local/bin/graphify
  agent-browser   /opt/homebrew/bin/agent-browser (Homebrew, v0.34.0)

MCPs conectados (5): obsidian, context7, chrome-devtools, e outros

Vault do Obsidian: ~/ObsidianVault-Skale, estrutura PARA
  01-projetos/Skale Insight/ e 01-projetos/Skale Finance Business/
  Wikilinks por nome de arquivo, sem caminho — mover pasta não quebra link

Números atuais: 18 plugins · 7 marketplaces · 10 skills globais · 2 hooks
globais · 5 MCPs

O QUE AINDA NÃO EXISTE (é o que vamos construir):
  - O repositório skale-harness em si
  - CLAUDE.md GLOBAL (existe CLAUDE.md por projeto, não global)
  - Subagentes com roteamento de modelo (~/.claude/agents/)
  - O harness invisível (roteador intenção -> ferramenta)
  - Bootstrap automático por projeto
  - As skills do ClickUp
  - install.sh / backup.sh / README / SETUP.md

PENDÊNCIAS JÁ MAPEADAS EM SESSÃO ANTERIOR:
  1. Aviso automático do graphify é global? Hoje são 2 hooks apenas no
     .claude/settings.json do skale-insight. Se virar global, deve disparar
     SOMENTE se o projeto tiver graphify-out/graph.json — sem mapa, fica calado.
  2. /caveman-init é por projeto por natureza (escreve em .cursor/rules/,
     .windsurf/rules/). Só rodou no skale-insight. Pode entrar no bootstrap.
  3. Cópia duplicada do impeccable em skale-insight/.claude/skills/impeccable —
     idêntica à global, pode ser removida.

VERIFICADO: a variável CLAUDE_CODE_SUBAGENT_MODEL está VAZIA. O roteamento de
modelo por subagente vai funcionar.

REGRA CRÍTICA DESTA ETAPA
NÃO sobrescreva nem apague nada do ~/.claude/ atual. Primeiro IMPORTE tudo para
o repositório (backup.sh), me mostre o que encontrou, e só então proponha
mudanças. Se algo que você for criar conflitar com algo existente, PARE e me
pergunte.

LEIA O DOCUMENTO DE CONTEXTO que colei junto antes de propor qualquer coisa.

ETAPA 1 — ESTRUTURA DO REPOSITÓRIO

Crie o repositório skale-harness no padrão dotfiles:

skale-harness/
├── claude/              espelho versionado de ~/.claude/
│   ├── settings.json
│   ├── CLAUDE.md        o CLAUDE.md GLOBAL
│   ├── MANIFEST.md      catálogo de tudo que compõe o setup
│   ├── agents/          subagentes com model roteado por tier
│   ├── skills/          inclui o impeccable (design de produto)
│   └── hooks/
├── templates/           backup Supabase e outros reutilizáveis
├── install.sh           sincroniza, instala e reporta o que falta
├── backup.sh            copia ~/.claude/ -> claude/
├── .gitignore
├── SETUP.md             passo a passo de máquina nova (o que não vem no Git)
└── README.md            o que é, como instalar, o que cada peça faz

Comece rodando backup.sh: importe o que JÁ EXISTE em ~/.claude/ para o
repositório, sem alterar nada. Quero o estado atual versionado antes de qualquer
mudança — é o meu rollback.

install.sh deve fazer backup do ~/.claude/ atual antes de sobrescrever, com
timestamp, e permitir rollback.

RELATÓRIO PÓS-INSTALAÇÃO — IMPORTANTE
Ao terminar, o install.sh deve VERIFICAR o que ainda falta e me dizer na tela.
Não quero abrir um arquivo para descobrir; quero o script me falando.

Ele deve checar e reportar:

  Login do Claude Code            (existe sessão ativa?)
  CLI do graphify                 (which graphify)
  CLI do agent-browser            (which agent-browser)
  MCP do ClickUp configurado      (aparece na config?)
  MCP do Obsidian configurado
  Vault do Obsidian existe        (~/ObsidianVault-Skale)
  Variável CLAUDE_CODE_SUBAGENT_MODEL vazia   (se estiver setada, AVISAR
                                               que o roteamento de modelo
                                               por subagente será ignorado)

Formato da saída — para cada item que falta, dizer O QUE É, POR QUE IMPORTA e
COMO RESOLVER:

  ✅ Instalado: 14 skills, 9 agentes, 3 hooks, CLAUDE.md global

  ⚠️  Faltam 3 coisas para o setup ficar completo:

  1. MCP do ClickUp não configurado
     Sem ele as skills /clickup não funcionam em nenhum projeto.
     Resolver:  claude mcp add --scope user clickup

  2. CLI do graphify não encontrado
     Sem ele eu não respondo "o que quebra se eu mudar isso" numa consulta.
     Resolver:  [comando de instalação]

  3. Vault do Obsidian não existe em ~/ObsidianVault-Skale
     Sem ele o mapa do repositório não é gravado lá, só no ClickUp.
     Resolver:  criar o vault e abrir no Obsidian uma vez

  Rode ./install.sh --check para verificar de novo depois.

Crie também a flag --check, que só verifica e reporta, sem instalar nada.

E crie um SETUP.md com o passo a passo de máquina nova, para o caso de o script
falhar ou eu querer conferir manualmente.

NÃO commite nada com credencial. Verifique settings.json e qualquer .mcp.json
antes. Coloque os padrões de risco no .gitignore.

O README precisa explicar o papel de cada peça em linguagem simples — eu vou
esquecer o que cada coisa faz daqui a dois meses.

ETAPA 2 — O CATÁLOGO COMPLETO DE FERRAMENTAS

O objetivo: em máquina nova, clonar o repositório e ter TUDO de volta sem
lembrar de nada.

Existem duas categorias, e elas se instalam de formas diferentes:

CATEGORIA A — arquivos que vivem no repositório
Skills, agentes, hooks, CLAUDE.md, settings.json. O install.sh copia para
~/.claude/ e pronto.

CATEGORIA B — instaladas por gerenciador externo
Plugins de marketplace, CLIs via Homebrew, MCPs com credencial. O repositório
não pode conter esses binários — mas PODE conter a lista e o comando de
instalar cada um.

O QUE FAZER

1. Crie claude/MANIFEST.md — o catálogo de tudo que compõe o setup.

   Para cada item, registre:
   | Ferramenta | Categoria | O que faz | Comando de instalação | Fonte/link |

   Inclua TUDO que já está instalado hoje:

   Plugins do vibe-coding-toolkit (marketplace):
     superpowers, ponytail, caveman, aia-harness, hookify, pr-review-toolkit,
     commit-commands, claude-code-setup, feature-dev, code-review,
     claude-md-management, ui-ux-pro-max

   Skills (arquivos, vão versionadas no repo):
     brainstorm-para-plano, memoria-do-projeto, configurar-lint,
     ondas-paralelas, revisao-multi-agente, zerar-avisos-lint, limpar-projeto,
     IMPECCABLE, document-skills, example-skills, claude-academy-guide,
     discernment-nudge

   CLIs (Homebrew / instalador próprio):
     graphify, agent-browser

   MCPs (precisam de credencial):
     obsidian, context7, chrome-devtools, clickup, e os demais conectados

   Hooks (arquivos):
     rtk-proxy.mjs, lint-gate.mjs, orchestration-mode.mjs

2. IMPECCABLE — atenção especial
   É a skill de design de produto: existe para o resultado não ter cara de IA e
   ter design de verdade. É central para tudo que tem interface — Skale
   Insights, CRM, landing pages, Finance.

   Estado atual: existe em ~/.claude/skills/impeccable (global) E uma cópia
   duplicada em skale-insight/.claude/skills/impeccable, idêntica.

   Ações:
   - Importar a versão global para o repositório
   - Remover a cópia duplicada do skale-insight (a global já cobre)
   - Registrar no MANIFEST o que ela faz e quando é acionada
   - Amarrá-la ao harness invisível: qualquer trabalho de UI, componente, tela,
     landing page ou identidade visual deve acioná-la SOZINHO, sem eu chamar

   PRODUCT.md e DESIGN.md que ela usa são POR PROJETO — não têm versão global.
   Entram no bootstrap: se o projeto tem interface e não tem esses arquivos,
   oferecer criar.

3. Faça o install.sh instalar as duas categorias
   - Categoria A: copiar arquivos (já previsto)
   - Categoria B: rodar os comandos do MANIFEST, verificando antes se já está
     instalado. Nunca reinstalar o que existe.
   - Ao final, reportar o que instalou, o que já existia e o que falhou

4. Toda ferramenta nova que eu adicionar no futuro entra no MANIFEST.
   Documente essa regra no README. É o que impede o setup de virar
   conhecimento tácito que só existe na minha cabeça.

ETAPA 3 — O CLAUDE.md GLOBAL

Escreva ~/.claude/CLAUDE.md, que vale para TODO projeto que eu abrir.

Conteúdo:
- Regras invioláveis que valem sempre (nunca service_role no client, RLS por
  company_id em tabela nova, nunca commitar segredo, nunca alterar migration
  aplicada, escopo OAuth Google novo só depois de verificado)
- Convenções: commit em português no imperativo, branch nomeada com ID da tarefa
  do ClickUp, nunca merge sem validação humana
- YAGNI: construir o mínimo que resolve. Reusar > stdlib > nativo > 1 linha >
  só então código novo
- Comunicação: objetivo, sem enrolação, em português
- Definição de Pronto

Este arquivo é lido em toda sessão. Mantenha entre 150 e 250 linhas — excesso
desperdiça contexto.

ETAPA 4 — O HARNESS INVISÍVEL (a parte principal)

O QUE EU QUERO, EM UMA FRASE
Eu continuo escrevendo o mesmo prompt que escreveria antes de ter todas essas
ferramentas. Você é que passa a usá-las.

Eu NÃO quero:
- Digitar /skill, /comando ou nome de plugin no chat
- Lembrar qual ferramenta existe para cada situação
- Escrever prompt maior ou mais estruturado do que eu escrevia antes
- Aprender sintaxe nova para usar o que instalei

Eu quero:
- Escrever "arruma o bug do CPL no dashboard" e você resolver — usando graphify
  para localizar, ponytail para não inflar a solução, e oferecendo revisão antes
  do commit
- A ferramenta certa entrando sozinha, no momento certo
- O mesmo esforço meu de antes, com resultado melhor

O harness é INVISÍVEL. Se eu precisar pensar nele, ele falhou.

O PRINCÍPIO — PENSE COMO UMA TOMADA

A casa tem tomada em todo cômodo. Nem por isso todos os aparelhos ficam ligados
o tempo todo. Você pluga o que precisa, no momento em que precisa, e despluga
depois.

O harness funciona assim:
- As ferramentas estão TODAS disponíveis, sempre (as tomadas existem)
- Mas só entram em ação quando a situação pede (você pluga o aparelho)
- Eu não aciono nada — eu mando o pedido e você decide o que plugar

Ligar tudo ao mesmo tempo é o oposto de eficiência: enche o contexto, deixa
lento, encarece e ainda atrapalha o raciocínio. Assim como ninguém deixa
liquidificador, aspirador e chuveiro ligados juntos "por precaução".

COMO ISSO SE PARECE NA PRÁTICA

Eu mando: "o CPL do dashboard está errado"
Você identifica sozinho: é investigação -> graphify query para achar o que toca
o cálculo -> lê o código -> propõe a correção. Sem eu digitar /graphify.

Eu mando: "quero adicionar filtro por período nos relatórios"
Você identifica sozinho: pedido de feature -> brainstorm-para-plano -> plano ->
se tiver 3+ partes independentes, ondas-paralelas -> implementa com ponytail
ativo -> ao final oferece revisao-multi-agente.

Eu mando: "vamos subir isso"
Você identifica sozinho: revisao-multi-agente -> /commit.

Eu mando: "instala o react-query aqui"
Você identifica sozinho: biblioteca externa -> context7 para pegar a doc da
versão certa, em vez de confiar na memória do modelo.

Eu mando: "renomeia essa variável"
Você identifica sozinho: tarefa trivial -> faz direto, sem acionar nada.

ATENÇÃO — O QUE EU NÃO QUERO
Não carregue todas as ferramentas em toda sessão. Já tenho 18 plugins e 5 MCPs;
se todos entrarem sempre, o contexto acaba cedo e as respostas ficam lentas.

Construa um roteador que mapeia INTENÇÃO -> FERRAMENTA:

pedido vago, sem escopo claro       -> brainstorm-para-plano / superpowers
plano aprovado, 3+ tarefas          -> ondas-paralelas (subagentes)
qualquer código sendo escrito       -> ponytail (YAGNI) sempre ativo
QUALQUER TRABALHO VISUAL            -> impeccable + ui-ux-pro-max
  (tela, componente, landing page,
   identidade visual, layout, cor,
   tipografia, design system)
antes de commit / merge             -> revisao-multi-agente
"o que quebra se eu mudar X"        -> graphify query
biblioteca externa envolvida        -> context7 (nunca confiar em memória)
projeto sem lint ou config velha    -> configurar-lint
pilha de avisos acumulada           -> zerar-avisos-lint
fim de fase                         -> limpar-projeto
projeto novo                        -> aia-harness:init + memoria-do-projeto
documentar decisão ou aprendizado   -> Obsidian MCP
tarefa de desenvolvimento           -> ClickUp MCP
teste de interface                  -> agent-browser (PEDIR AUTORIZAÇÃO ANTES)
performance, rede, console          -> chrome-devtools (PEDIR AUTORIZAÇÃO ANTES)

SOBRE O IMPECCABLE — regra reforçada
Todo produto meu tem interface e vai para cliente pagante. Design com cara de
template genérico ou de "feito por IA" é problema comercial, não estético.

Por isso o impeccable é acionado SEMPRE que houver trabalho visual, sem eu
pedir. Se o projeto tiver PRODUCT.md e DESIGN.md, use-os como contexto. Se não
tiver e o projeto tem interface, ofereça criar (via bootstrap).

TRANSPARÊNCIA
Quando acionar uma ferramenta, diga em uma linha o que está usando e por quê.
Ao delegar para um subagente, diga qual agente, qual MODEL e qual EFFORT.
Não precisa pedir permissão (exceto nos dois casos abaixo), mas eu preciso saber
o que está acontecendo — e conseguir perceber se algo rodou no tier errado.
Uma linha basta — não vire narração.

REGRA DE AUTORIZAÇÃO: agent-browser e chrome-devtools abrem navegador de verdade
e interagem com o sistema. NUNCA acione sozinho. Ao chegar no ponto de testar,
PARE, explique o que vai fazer e peça meu ok.

QUANDO NÃO PLUGAR NADA
Se o pedido for simples e direto ("renomeia essa variável", "o que faz esse
arquivo"), responda direto. Acionar ferramenta em tarefa trivial é desperdício —
é o equivalente a ligar o aspirador para tirar uma migalha.

Implemente o roteador da forma mais leve possível. Prefira instrução no CLAUDE.md
global a hook, e hook a MCP carregado sempre. Se precisar de hook, ele deve falhar
aberto — nunca derrubar a sessão.

ETAPA 5 — ROTEAMENTO DE MODELO E EFFORT POR SUBAGENTE

São DOIS eixos independentes, e confundir os dois é erro comum:

  MODEL  = quais pesos respondem (quanto o agente SABE)
  EFFORT = quanto ele raciocina antes de agir (quanto ele SE ESFORÇA)

Ambos são declaráveis na frontmatter do subagente, e ambos SOBRESCREVEM a
sessão. Um agente com effort: medium roda em medium mesmo numa sessão em max.

Formato:

    ---
    name: security-reviewer
    description: Revisões de segurança, RLS, OWASP
    model: opus
    effort: xhigh
    ---

ANTES DE CRIAR QUALQUER AGENTE — INVENTARIE O QUE JÁ EXISTE

O aia-harness:init já rodou no skale-insight e criou subagentes lá, em
skale-insight/.claude/agents/. Já confirmei em teste que pelo menos o
frontend-specialist existe e funciona: pedi uma feature de UI e ele delegou
sozinho, rodando em sonnet.

Faça primeiro:
1. Liste todos os agentes em skale-insight/.claude/agents/
2. Para cada um: nome, model atual, effort atual (se houver), e o que faz
3. Classifique: PROMOVER AO GLOBAL, MANTER SÓ NO PROJETO, ou SUBSTITUIR
4. Me mostre essa tabela antes de criar qualquer coisa

REGRA: agente no projeto tem precedência sobre agente global de mesmo nome.
Se você criar um elenco global sem olhar o que existe no projeto, o global fica
inerte no skale-insight e você vai ter dois elencos divergentes — um funcionando
e outro não.

Prefira PROMOVER o que já funciona a recriar do zero.

---

O ELENCO — model + effort por agente

  planner / architect       fable    max      decisões que não se refazem
  security-reviewer         opus     xhigh    RLS, OWASP, autenticação
  migration-specialist      opus     xhigh    migração de banco
  backend-specialist        opus     high     lógica de negócio
  frontend-specialist       sonnet   high     UI, componente, tela
  code-reviewer             sonnet   medium   revisão de código
  test-writer               sonnet   medium   testes
  doc-updater               haiku    (sem)    documentação trivial
  explorer / file-finder    haiku    (sem)    buscar, listar, grep

A LÓGICA: julgamento roda no topo da linha, trabalho mecânico roda embaixo.
Estágios baratos (buscar, ler, formatar) em effort baixo; verificação e decisão
nos tiers altos.

Ajuste o elenco conforme fizer sentido — o que importa é a lógica da divisão.

---

ARMADILHAS QUE EU JÁ SEI QUE EXISTEM — TRATE CADA UMA

1. DUAS VARIÁVEIS DE AMBIENTE SOBRESCREVEM TUDO
   CLAUDE_CODE_SUBAGENT_MODEL  sobrescreve o campo model
   CLAUDE_CODE_EFFORT_LEVEL    sobrescreve o campo effort

   A ordem de precedência é:
     variável de ambiente > frontmatter > sessão > padrão do modelo

   Se qualquer uma estiver setada, o roteamento que você configurar é ignorado
   SILENCIOSAMENTE — não dá erro, simplesmente não funciona.

   AÇÃO: verifique as DUAS no meu ambiente. Já conferi a de model e está vazia.
   Confirme a de effort. Se alguma estiver setada, me avise e recomende remover.

2. HAIKU NÃO SUPORTA EFFORT
   Haiku 4.5 não é effort-capable. Não coloque o campo effort nesses agentes.
   Fable 5, Opus 5, Sonnet 5 e Opus 4.8 suportam os cinco níveis.

3. ALGUNS NÍVEIS NÃO PERSISTEM
   O effortLevel do arquivo de configuração aceita apenas low, medium, high e
   xhigh. max e ultracode são só de sessão e não podem ser fixados.

   Consequência: não tente configurar ultracode como padrão. Não é possível, e
   nem seria desejável (ver item 6).

4. CADA SUBAGENTE CUSTA DE 25 A 35 MIL TOKENS SÓ PARA INICIALIZAR
   Fragmentar demais anula a economia: 15 micro-agentes gastam mais que 4
   focados. Um agente haiku fazendo 10 buscas numa passada é mais barato que 10
   agentes haiku.
   AÇÃO: prefira agentes com escopo largo o suficiente para batelar trabalho
   relacionado.

5. ROTEAR POR CATEGORIA DE TAREFA É RASO DEMAIS
   "Código = sonnet, doc = haiku" erra. O que define o tier é se a tarefa exige
   JULGAMENTO ou é MECÂNICA. Um doc de arquitetura pode precisar de opus; um
   "código" que só renomeia campo roda em haiku.
   AÇÃO: escreva as descrições dos agentes deixando esse critério claro.

6. ULTRACODE É OUTRA COISA — NÃO CONFUNDA COM EFFORT
   Ultracode não é um nível de effort. É uma configuração de sessão do Claude
   Code que faz DUAS coisas:
     a) fixa a sessão em xhigh  → os agentes SOBRESCREVEM isso, sem problema
     b) liga orquestração automática de workflows → dispara até 16 subagentes
        simultâneos, teto de 1.000 por rodada

   O item (b) é o que multiplica o custo. O roteamento por agente economiza POR
   UNIDADE, mas ultracode multiplica a QUANTIDADE de unidades.

   MINHA CONFIGURAÇÃO PREFERIDA:
   - Sessão padrão em xhigh (persiste, não preciso digitar nada)
   - Ultracode ligado MANUALMENTE, só quando a tarefa tem partes independentes
     que se beneficiam de paralelismo real (migração de muitos arquivos,
     refactor amplo)
   - Nunca ultracode por hábito

   Documente essa distinção no CLAUDE.md global, porque eu vou esquecer.

7. ERRAR PARA BAIXO CUSTA MAIS QUE ERRAR PARA CIMA
   Modelo ou effort fraco em tarefa que exige raciocínio produz resultado
   inutilizável — e aí paga duas vezes, porque refaz.
   AÇÃO: na dúvida entre dois tiers, suba um.

---

CONFIGURAÇÃO DA SESSÃO — xhigh, não max

Deixe effortLevel: xhigh no settings.json global.

Por quê:
- max NÃO pode ser fixado no arquivo de configuração (só low, medium, high,
  xhigh são aceitos). Seria preciso digitar /effort max toda sessão
- A curva de ganho satura depois do xhigh; a recomendação oficial é xhigh para
  código e trabalho agêntico, com max reservado para problemas difíceis
- max não tem teto de tokens e superpensa em passos simples

O ponto que decide: com o elenco configurado, a sessão principal faz ROTEAMENTO
e DELEGAÇÃO. O trabalho pesado vai para os agentes, que têm effort próprio.
Subir a sessão para max encarece decidir a quem delegar, não melhora a
implementação.

Por isso o max fica na frontmatter do architect, onde o raciocínio é único, sem
paralelismo, e errar custa meses. A frontmatter aceita os cinco níveis,
diferente do arquivo de configuração.

ENTREGA DESTA ETAPA
- A tabela do inventário dos agentes que já existem no skale-insight, com model,
  effort e a classificação de cada um (promover / manter local / substituir)
- Os arquivos de agente criados ou promovidos, com model E effort de cada um
- Verificação das DUAS variáveis de ambiente (SUBAGENT_MODEL e EFFORT_LEVEL)
- effortLevel: xhigh configurado no settings.json global
- A lógica da divisão documentada no CLAUDE.md global, incluindo a distinção
  entre effort e ultracode, para eu conseguir revisar quando o elenco crescer

ETAPA 6 — BOOTSTRAP AUTOMÁTICO POR PROJETO

Este é o ponto que faz o harness valer em TODO projeto, velho ou novo.

O PROBLEMA
Parte da configuração herda do global sozinha (CLAUDE.md global, plugins, skills,
hooks, CLIs, o roteador). Mas parte NÃO herda, porque depende do conteúdo do
repositório:

- graphify-out/graph.json  (o mapa é do código daquele repo)
- CLAUDE.md do projeto     (stack e arquitetura daquele código)
- .mcp.json                (credenciais e servidores)
- regras do caveman        (.cursor/rules/, .windsurf/rules/ — por repo, sempre)
- Mapa do Repositório no ClickUp e Obsidian (um por produto)

Nenhuma configuração global consegue adivinhar o conteúdo de um repositório que
ela nunca leu.

O QUE IMPLEMENTAR

Ao abrir um projeto, detecte o que está faltando e OFEREÇA criar. Uma vez só,
não a cada sessão.

Sem CLAUDE.md do projeto     -> oferecer aia-harness:init
Sem graphify-out/            -> oferecer graphify update .
Sem regras do caveman        -> oferecer /caveman-init
Sem .mcp.json                -> avisar que ClickUp e Obsidian não funcionam ali
Sem Mapa no ClickUp/Obsidian -> oferecer /atualizar-mapa

REGRAS DO BOOTSTRAP
- OFERECER, nunca executar sozinho. Rodar aia-harness:init num projeto com meses
  de trabalho é mudança grande — eu preciso aprovar.
- SEMPRE EXPLICAR O PAPEL de cada ferramenta ao oferecer. Eu instalei muita coisa
  e vou esquecer o que cada uma faz. Não escreva só "falta rodar graphify" —
  escreva o que ele resolve, em uma linha, e o que eu ganho.

  Exemplo do formato que eu quero:

  "Este projeto está sem 3 coisas:

   • graphify — mapeia o código como grafo. Com ele eu respondo 'o que quebra se
     eu mudar isso' numa consulta, em vez de vasculhar arquivo por arquivo.
     Rodo agora? (comando: graphify update .)

   • CLAUDE.md do projeto — o contexto permanente: stack, arquitetura e
     convenções deste repo. Sem ele eu recomeço do zero a cada sessão.
     Gero agora? (via aia-harness:init — mudança grande, leia antes de aprovar)

   • .mcp.json — sem ele o ClickUp e o Obsidian não funcionam neste projeto.
     Configuro?"

- Perguntar UMA VEZ e registrar a resposta (ex: .claude/.bootstrap-check).
  Se eu disser não, não perguntar de novo.
- Listar tudo que falta de uma vez, não item por item ao longo da sessão.
- Se o projeto já tiver tudo, ficar calado.
- Bootstrap nunca sobrescreve arquivo existente sem me avisar.

REGRAS DEPENDENTES DE ESTADO
Algumas ferramentas só devem entrar em ação se o projeto tiver o pré-requisito:
- graphify só é sugerido se graphify-out/graph.json existir. Sem mapa, fica calado.
- ClickUp e Obsidian só entram se o .mcp.json daquele projeto os tiver configurado.

VALIDAÇÃO
Ao terminar, quero conseguir:
1. Abrir um projeto ANTIGO qualquer -> o harness vale, e ele me diz o que falta ali
2. Criar um repositório NOVO do zero -> o harness vale desde o primeiro prompt
3. Em ambos, escrever um pedido COMUM, do jeito que eu escreveria antes de ter
   qualquer uma dessas ferramentas, sem citar skill, comando ou plugin — e ver a
   ferramenta certa sendo acionada sozinha

O teste final é este: se eu precisar lembrar que o harness existe para usá-lo,
ele não está pronto.

ETAPA 7 — AS 3 SKILLS DO FLUXO CLICKUP

Crie em claude/skills/:
- executar-tarefa   (puxa tarefa do ClickUp, implementa, move status, comenta)
- planejar          (lê o backlog, ordena, imprime checklist no chat)
- atualizar-mapa    (gera o Mapa do Repositório em Obsidian E ClickUp)

As especificações completas estão no documento de contexto.

REGRA CRÍTICA do executar-tarefa: se a tarefa não tiver critério de aceite claro,
RECUSAR. Comentar na tarefa o que falta e parar. Nunca implementar em cima de
especificação vaga.

ETAPA 8 — PENDÊNCIAS JÁ MAPEADAS

- Tornar global o aviso automático do graphify, mas condicionado: só dispara se o
  projeto tiver graphify-out/graph.json. Sem mapa, fica calado.
- Rodar /caveman-init automaticamente ao abrir projeto novo (é por projeto por
  natureza — escreve em .cursor/rules/, .windsurf/rules/)
- Remover a cópia duplicada do Impeccable em skale-insight/.claude/skills/

ORDEM DE TRABALHO
Faça uma etapa por vez e me mostre antes de passar para a próxima. Não execute
install.sh sem meu ok explícito — ele sobrescreve minha configuração atual.

ENTREGA DA ETAPA 1
- Estrutura criada
- Estado atual do ~/.claude/ importado e versionado
- Confirmação de que nenhuma credencial foi commitada
- O que você encontrou lá que eu talvez não saiba que existe
```

---

## Ordem sugerida

| # | O quê | Onde |
|---|---|---|
| 1 | Repositório `skale-harness` + backup do `~/.claude/` atual | skale-harness |
| 2 | `CLAUDE.md` global | skale-harness |
| 3 | O harness invisível (roteador de intenção) | skale-harness |
| 4 | Subagentes com roteamento de modelo | skale-harness |
| 5 | Bootstrap automático por projeto | skale-harness |
| 6 | As 3 skills do ClickUp | skale-harness |
| 7 | Rodar `install.sh` → vira global | Terminal |
| 8 | Conectar ClickUp MCP | Terminal |
| 9 | Rodar `/atualizar-mapa` no Skale Insight | Projeto |
| 10 | Configurar o Autopilot Agent com o Mapa | ClickUp |
| 11 | Testar ponta a ponta | — |

> **Faça o passo 1 antes de qualquer alteração.** Sem o estado atual versionado, um erro na configuração global te deixa sem rollback — e você perde o setup que levou dias para montar.
