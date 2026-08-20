# skale-harness

> Configuração global do Claude Code + motor de automação de desenvolvimento.
> Versiona `~/.claude/`, distribui o harness para todos os projetos e conecta o fluxo ClickUp → Claude Code → Obsidian.

---

# PARTE 1 — O sistema em uma olhada

## O fluxo completo

```
1. Alguém cria uma solicitação no ClickUp
        ↓
2. Automação distribui para a lista certa (Backlog & Roadmap ou Bugs & Suporte)
        ↓
3. Autopilot Agent (nativo do ClickUp) lê o Mapa do Repositório e REFINA:
   descrição estruturada + campos preenchidos + prompt pronto em comentário
        ↓
4. Você confere e move de Backlog → Próximo
        ↓
5. No Claude Code, dentro do repositório do produto: /clickup-fila
        ↓
6. A skill identifica o produto, puxa as tarefas em "Próximo", executa em ordem
   de prioridade, testa com agent-browser
        ↓
7. Move para HOMOLOGAÇÃO e para. Comenta o que fez.
        ↓
8. VOCÊ valida → Deploy → Concluído
```

## Quem faz o quê

| Peça | Papel | Onde roda |
|---|---|---|
| **Autopilot Agent** | Refina solicitação crua em tarefa executável | ClickUp (nativo) |
| **Mapa do Repositório** | Diz o que existe no código | Doc ClickUp + Obsidian |
| **Skills `/clickup-*`** | Executa as tarefas | Claude Code, em qualquer projeto |
| **Harness invisível** | Decide qual ferramenta usar em cada pedido | `~/.claude/` global |
| **Você** | Prioriza e valida | ClickUp |

> **A divisão que sustenta tudo:** o ClickUp decide **o que** fazer. O Claude Code decide **como** fazer. Você decide **se está certo**.

---

# PARTE 2 — As regras de operação

Estas foram decididas e não são negociáveis na implementação.

## 🔴 Regra 1 — Para em Homologação

O Claude Code **nunca** move tarefa para Deploy ou Concluído.

**Por quê:** o agent-browser confirma que a tela funciona. Não confirma que é o que você queria. Sem validação humana, ele pode implementar a coisa errada, testar com sucesso e fechar a tarefa.

## Regra 2 — Só executa o que está em "Próximo"

Tarefa em **Backlog** não entra na fila automaticamente. Você promove o que quer que seja feito.

**Por quê:** o Backlog é a fila de tudo; "Próximo" é o compromisso. Sem essa separação, ele começaria a executar ideia solta.

## Regra 3 — Ordem por Prioridade

`Urgente → Alta → Normal → Baixa`. Empate, resolve pela mais antiga.

## Regra 4 — Limite de 3 tentativas no teste

Falhou 3 vezes: **para**, deixa em *Em Desenvolvimento*, comenta o que tentou e chama você.

**Por quê:** sem limite, ele entra em corrige-testa-corrige e queima token sem sair do lugar.

## Regra 5 — Pergunta em aberto trava e chama

Se a tarefa tem "Perguntas em aberto" preenchidas, ele **para e pergunta na hora**. Não decide sozinho, não pula.

**Por quê:** pergunta em aberto significa que o Agent não conseguiu inferir algo. Chutar ali é como errar a especificação inteira.

## Regra 6 — Sem critério de aceite, recusa

Tarefa sem "Critério de aceite" no comentário: recusa, comenta o que falta, não implementa.

## Regra 7 — Identificação do produto

A skill lê o campo `produto:` no `CLAUDE.md` do projeto. Não achou: pergunta uma vez e grava.

---

# PARTE 3 — As skills do ClickUp

| Comando | Faz |
|---|---|
| `/clickup` | Mostra a fila deste produto — o que está em Próximo, ordenado |
| `/clickup-executar [id]` | Executa uma tarefa específica |
| `/clickup-fila` | Executa a fila inteira, uma por vez, parando em Homologação |

### O ciclo de cada tarefa

```
Lê tarefa (descrição + TODOS os comentários)
      ↓
Tem critério de aceite?      não → recusa e comenta
      ↓ sim
Tem pergunta em aberto?      sim → para e pergunta
      ↓ não
Move para Em Desenvolvimento
      ↓
Cria branch tarefa/{id}-{slug}
      ↓
Implementa (harness ativo: ponytail, graphify, context7 conforme o caso)
      ↓
Lint + build + testes
      ↓
Testa com agent-browser (pede autorização)  ── falhou → corrige (máx 3×)
      ↓ passou
Move para Homologação + comenta o que fez
      ↓
PARA. Próxima tarefa da fila.
```

> ⚠️ **Detalhe do ClickUp:** a especificação e o prompt vivem em **comentários separados**, não na descrição. A skill precisa ler todos os comentários, não só a descrição.

---

# PARTE 4 — O README do repositório

O `skale-harness` deve ter um README no padrão do `vibe-coding-toolkit`: explicado, com links, e dizendo **o que cada peça resolve** — não só o que ela é.

## Estrutura do README

**1. O que é este repositório** — em 5 linhas
**2. O problema que resolve** — antes × depois
**3. Instalação** — clonar, rodar `install.sh`, o que ele faz
**4. O harness invisível** — o princípio da tomada, a tabela intenção → ferramenta
**5. Ferramentas instaladas** — tabela com nome, o que faz em uma linha, quando usar, e link
**6. Roteamento de modelos** — a divisão fable/opus/sonnet/haiku e o porquê
**7. Automação ClickUp** — o fluxo, as regras de operação, as skills
**8. Obsidian** — vault único, estrutura PARA, onde o mapa mora
**9. Global × por projeto** — o que herda e o que precisa de bootstrap
**10. Glossário** — linter, hook, MCP, subagente, contexto, token, YAGNI, WIP
**11. Ressalvas honestas** — o que é gambiarra, o que pode quebrar, o que não foi testado

> A seção 11 é a mais valiosa. O README do Matheus abre justamente reclamando de gente instalando MCP sem saber por quê. Ser honesto sobre limitação é o que separa documentação útil de propaganda.

## Regra do tom

Cada ferramenta listada responde três coisas, em uma linha cada:
- **O que faz**
- **Quando usar**
- **O que acontece se eu não usar**

Sem jargão sem tradução. Se aparecer "linter", explica na primeira vez.

---

# PARTE 5 — Prompt para o Claude Code

> Cole na sessão do `skale-harness`, junto do documento de contexto do harness.
> **Tudo vive no mesmo repositório** — as skills do ClickUp são configuração global, como o resto.

```
Vamos construir a parte de AUTOMAÇÃO COM O CLICKUP do skale-harness.

Este documento define o fluxo ClickUp e as skills. O documento de contexto do
harness (colado junto) define o resto: estrutura do repositório, CLAUDE.md
global, harness invisível, roteamento de modelos e bootstrap.

Tudo vive no MESMO repositório — as skills do ClickUp são configuração global,
igual ao resto. Não crie repositório separado.

---

O SISTEMA QUE ESTAMOS MONTANDO

1. Alguém cria uma solicitação no ClickUp
2. Automação distribui para a lista certa
3. Autopilot Agent (nativo do ClickUp, já definido) lê o Mapa do Repositório e
   refina: descrição estruturada, campos preenchidos e um comentário separado
   com o prompt pronto
4. Eu confiro e movo de Backlog para Próximo
5. No Claude Code, dentro do repositório do produto, rodo /clickup-fila
6. A skill identifica o produto, puxa as tarefas em Próximo, executa em ordem de
   prioridade e testa com agent-browser
7. Move para Homologação e PARA
8. Eu valido, movo para Deploy e Concluído

A divisão: o ClickUp decide O QUE fazer. O Claude Code decide COMO fazer. Eu
decido SE ESTÁ CERTO.

---

ESTRUTURA DO CLICKUP (já existe, não precisa criar)

Espaço Tecnologia > Pasta Desenvolvimento > duas listas:

Backlog & Roadmap
  Status: Backlog, Próximo, Em Desenvolvimento, Homologação, Deploy, Concluído

Bugs & Suporte
  Status: Aberto, Triagem, Em Correção, Homologação, Resolvido,
          Não Reproduzível, Descartado

Campos personalizados:
  Ítem       — Feature, Melhoria, Bug, Suporte, Tarefa Técnica, Spike
  Projeto    — Automações | Chatbot, Análise de Atendimento (IA), Prontuário,
               Rastreamento CTWA
  Componente — Frontend, Backend, Data Base, Integrações, Segurança, UI/UX, Infra
  Produto    — Skale Insights, Skale CRM, Skale Finance Personal,
               Skale Finance Business
  Origem     — Cliente, Time, Roadmap, Incidente
  Prioridade — nativa (Urgente, Alta, Normal, Baixa)

DETALHE CRÍTICO DO CLICKUP
A especificação e o prompt vivem em COMENTÁRIOS SEPARADOS, não na descrição:
- Um comentário com contexto, decisões e critério de aceite
- Outro comentário começando com "PROMPT PARA O CLAUDE CODE"
A skill precisa ler TODOS os comentários, não apenas a descrição.

Outro detalhe: comentário do ClickUp NÃO renderiza tabela markdown — vira
"undefined". Ao comentar, use listas com negrito.

---

CRIAR 3 SKILLS EM claude/skills/

/clickup
  Mostra a fila deste produto: tarefas em "Próximo", ordenadas por prioridade.
  Formato: [id] nome — prioridade — ítem — pronta para executar? (sim/não e por quê)
  Não executa nada. Só mostra.

/clickup-executar [id]
  Executa UMA tarefa específica, seguindo o ciclo abaixo.

/clickup-fila
  Executa a fila inteira, uma tarefa por vez, seguindo o ciclo abaixo.
  Entre uma tarefa e outra, reporta o resultado antes de seguir.

---

O CICLO DE EXECUÇÃO (vale para executar e fila)

PASSO 1 — Identificar o produto
Ler o campo "produto:" no CLAUDE.md do projeto atual.
Se não existir, PERGUNTAR uma vez qual produto este repositório atende e GRAVAR
no CLAUDE.md. Não perguntar de novo nas próximas execuções.

PASSO 2 — Carregar contexto
Ler CLAUDE.md do projeto. Ler o Doc "Mapa do Repositório" no ClickUp.
Buscar a tarefa e ler: nome, descrição, TODOS os comentários, campos
personalizados e subtarefas.

PASSO 3 — Portões de entrada, nesta ordem

a) Sem "Critério de aceite" nos comentários?
   RECUSAR. Comentar na tarefa o que está faltando. Não implementar.
   Na fila: seguir para a próxima.

b) Tem "Perguntas em aberto" preenchidas (diferente de "Nenhuma")?
   PARAR e me perguntar na hora. Não decidir sozinho, não pular.
   Só seguir depois da minha resposta.

c) Filtro de produto: a tarefa é do produto deste repositório?
   Se não for, ignorar.

PASSO 4 — Preparar
Mover status para "Em Desenvolvimento" (ou "Em Correção", se for Bugs & Suporte).
Criar branch: tarefa/{id}-{slug-do-nome}

PASSO 5 — Implementar
Usar o prompt do comentário como especificação.
O harness invisível continua valendo: acionar graphify para localizar impacto,
context7 se envolver biblioteca externa, ponytail sempre ativo, subagentes com o
modelo do tier certo.

Se durante a implementação a especificação se mostrar errada ou incompleta,
PARAR e me avisar. Nunca decidir escopo sozinho.

PASSO 6 — Validar
Rodar lint, build e testes. Não avançar com erro.

PASSO 7 — Testar com agent-browser
PEDIR MINHA AUTORIZAÇÃO antes (regra do harness: agent-browser e chrome-devtools
nunca disparam sozinhos).
Testar o fluxo real na interface, contra o critério de aceite.

Se falhar: corrigir e testar de novo. LIMITE DE 3 TENTATIVAS.
Estourou o limite: PARAR, deixar em Em Desenvolvimento, comentar na tarefa o que
tentou e por que falhou, e me chamar.

PASSO 8 — Fechar
Mover para "Homologação". NUNCA para Deploy nem Concluído — quem valida sou eu.

Comentar na tarefa, em português:
- O que foi feito
- Arquivos alterados e o que mudou em cada um
- Nome da branch
- Resultado do teste com agent-browser
- O que precisa de atenção
- Como testar manualmente

PASSO 9 — Na fila, seguir para a próxima
Reportar o resultado da tarefa antes de começar a próxima.

---

ORDEM DA FILA
Prioridade (Urgente, Alta, Normal, Baixa) e, em caso de empate, a mais antiga.
Só entram tarefas com status "Próximo". Backlog NUNCA entra automaticamente.

---

REGRAS INVIOLÁVEIS DAS SKILLS

- NUNCA mover para Deploy ou Concluído
- NUNCA executar tarefa sem critério de aceite
- NUNCA decidir sozinho quando há pergunta em aberto
- NUNCA acionar agent-browser sem minha autorização
- NUNCA pegar tarefa que não seja do produto deste repositório
- NUNCA alterar tarefa diferente da que está sendo executada
- Limite de 3 tentativas no teste, sempre
- Nunca fazer merge

---

O README DO REPOSITÓRIO

Use como referência o repositório vibe-coding-toolkit do Matheus Gomes
(github.com/soumatheusgomes/vibe-coding-toolkit): explicado, com links, e dizendo
o que cada peça RESOLVE — não só o que ela é.

Seções obrigatórias:
1.  O que é este repositório (5 linhas)
2.  O problema que resolve (antes x depois)
3.  Instalação (clonar, install.sh, o que ele faz)
4.  O harness invisível (princípio da tomada + tabela intenção -> ferramenta)
5.  Ferramentas instaladas (tabela: nome, o que faz, quando usar, link)
6.  Roteamento de modelos (fable/opus/sonnet/haiku e o porquê da divisão)
7.  Automação ClickUp (o fluxo, as regras de operação, as 3 skills)
8.  Obsidian (vault único, estrutura PARA, onde o mapa mora)
9.  Global x por projeto (o que herda, o que precisa de bootstrap)
10. Glossário (linter, hook, MCP, subagente, contexto, token, YAGNI, WIP)
11. Ressalvas honestas (o que é gambiarra, o que pode quebrar, o que não foi
    testado)

REGRA DO TOM
Cada ferramenta listada responde três coisas, em uma linha cada:
- O que faz
- Quando usar
- O que acontece se eu não usar

Sem jargão sem tradução. Se aparecer "linter", explica na primeira vez que
aparece. Eu vou reler isso daqui a dois meses e preciso entender.

A seção 11 é a mais importante. O README do Matheus abre justamente reclamando de
gente instalando MCP sem saber por quê. Ser honesto sobre limitação é o que
separa documentação útil de propaganda.

---

ENTREGA
1. As 3 skills criadas em claude/skills/
2. O README completo
3. Confirmação de que a skill lê comentários, não só descrição
4. Confirmação de que nenhuma skill consegue mover para Deploy ou Concluído
5. Como a identificação de produto funciona e onde fica gravada
6. Decisões que você precisou tomar sozinho

Não rode install.sh sem meu ok explícito.
```

---

# PARTE 6 — Como testar o harness depois de pronto

Terminado o `skale-harness` e rodado o `install.sh`, o teste acontece no **`skale-insight`** — projeto real, com meses de código, que é onde tudo precisa funcionar de verdade.

## Teste 1 — O harness é invisível?

Abra o `skale-insight` e escreva um pedido **do jeito que você escreveria antes**, sem citar ferramenta nenhuma:

> *"o CPL do dashboard está errado"*

**Esperado:** ele aciona graphify para localizar o cálculo, lê o código e propõe — dizendo em uma linha o que usou.

**Falhou se:** perguntou qual ferramenta usar, ou saiu lendo arquivo por arquivo.

## Teste 2 — O roteamento de modelo funciona?

Peça algo que gere subagentes:

> *"planeja a implementação do seletor de agendas"*

**Esperado:** planejamento em fable, execução em sonnet ou opus conforme a complexidade.

**Como verificar:** o painel de monitoramento de agentes mostra o modelo de cada subagente.

## Teste 3 — O ponytail está ativo?

Peça algo simples:

> *"adiciona um botão de exportar CSV no relatório"*

**Esperado:** um botão, uma função de export. **Falhou se** ele entregar sistema de plugins de exportação.

## Teste 4 — O bootstrap detecta o que falta?

Abra um projeto **sem** `CLAUDE.md` ou **sem** `graphify-out/`.

**Esperado:** ele lista o que falta, **explicando o papel de cada coisa**, e oferece criar. Uma vez só.

## Teste 5 — O fluxo ClickUp funciona ponta a ponta?

1. Crie uma tarefa de mentira em *Backlog & Roadmap*, com critério de aceite claro
2. Mova para **Próximo**
3. No `skale-insight`, rode `/clickup`
4. Confirme que ela aparece na fila
5. Rode `/clickup-executar [id]`

**Esperado:** move para Em Desenvolvimento → implementa → pede autorização para o agent-browser → move para **Homologação** → comenta o que fez → **para**.

**Falhou se:** moveu para Deploy ou Concluído sozinho.

## Teste 6 — Os portões de entrada funcionam?

Crie duas tarefas de mentira:
- Uma **sem critério de aceite** → ele deve **recusar** e comentar o que falta
- Uma **com pergunta em aberto** → ele deve **parar e perguntar**

> Este é o teste mais importante. O maior risco do fluxo automatizado é ele codar em cima de especificação vaga.

---

# PARTE 7 — O que ainda falta decidir

Nada bloqueante, mas vale registrar:

- [ ] **Múltiplos repositórios por produto?** Se o Skale Insights tiver front e back separados, cada um precisa do próprio `produto:` e a fila pode duplicar
- [ ] **Tarefa que toca dois produtos** — vai para qual repositório?
- [ ] **Bugs & Suporte tem SLA** (Urgente = mesmo dia). A fila deveria priorizar Bugs sobre Backlog automaticamente?
- [ ] **Quem move de Homologação para Deploy** — você na mão, ou uma automação do ClickUp quando o deploy acontecer?
