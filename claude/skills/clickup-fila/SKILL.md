---
name: clickup-fila
description: Executa a fila inteira de tarefas prontas do produto deste repositório, uma por vez, com o mesmo ciclo do clickup-executar — reportando o resultado entre uma tarefa e outra. Use quando o Eric disser "roda a fila", "executa tudo que tá pronto", "processa o backlog", ou pedir pra tocar várias tarefas do ClickUp em sequência sem escolher uma por uma. Para uma tarefa só, use clickup-executar; para só olhar sem mexer, use clickup.
---

# clickup-fila — a fila inteira, uma tarefa por vez

## Quando usar

Quando o Eric quer que várias tarefas prontas sejam tocadas em sequência,
sem ele escolher uma por uma. Este skill não reinventa o ciclo — ele monta
a fila do jeito que `clickup/SKILL.md` monta, e roda cada item pelo mesmo
ciclo de `clickup-executar/SKILL.md`. Leia os dois antes de começar, se
ainda não estiverem carregados nesta sessão.

> **Diferença central pros outros dois:** aqui uma recusa (falta critério
> de aceite) não trava a fila — pula pra próxima. Já uma pergunta em
> aberto, ou qualquer outro "PARE" que o ciclo levantar, trava **a fila
> inteira**, não só a tarefa. A fila nunca decide por conta própria uma
> coisa que o ciclo manda perguntar ao Eric.

## Regras invioláveis

- NUNCA mover tarefa para "deploy" nem "concluído"
- NUNCA executar tarefa sem critério de aceite
- NUNCA decidir sozinho quando há pergunta em aberto
- NUNCA acionar `agent-browser` ou `chrome-devtools` sem autorização explícita
- NUNCA pegar tarefa de produto diferente do deste repositório
- NUNCA alterar tarefa diferente da que está sendo executada
- Limite de 3 tentativas no teste de interface, sempre
- NUNCA fazer merge

## Referência do ClickUp

**Espaço e listas**
- Espaço "Tecnologia": `901313948266`
- Pasta "Desenvolvimento": `901318693241`
- Lista "Backlog & Roadmap": `901328038710` — status (minúsculo):
  `backlog`, `próximo`, `em desenvolvimento`, `homologação`, `deploy`,
  `concluído`
- Lista "Bugs & Suporte": `901328041316` — status (minúsculo): `aberto`,
  `triagem`, `em correção`, `homologação`, `descartado`, `não
  reproduzível`, `resolvido`

Status são sempre minúsculos. Comparar com inicial maiúscula não funciona.

**Campo "Produto"** (id `15edd37b-894a-49bc-89d0-d0ebe80976d8`):
Skale CRM `b915325c-c137-4903-b905-8345705c7c85` · Skale Insights
`df36f13f-9842-491f-9b6b-3631323961ad` · Skale Finance Personal
`e3df9189-c1c7-418f-b3ff-1a27eec15acc` · Skale Finance Business
`22708727-b354-4bce-a46c-b401c74a9ed9`.

O valor que a API devolve é `"value"` como **índice numérico** da opção
(ex.: `"value": 1` corresponde a "Skale Insights") — não é o id acima.
Quando a tarefa não tem produto definido, a chave `value` **não aparece**
no objeto do campo (não vem `null`, não vem string vazia) — trate a
ausência da chave, não procure por valor vazio.

**Campo "Item"** (id `f2dd83c5-040f-4b9d-ac4c-13ff7d7d8b85`, sem acento):
Feature, Melhoria, Tarefa Técnica, Spike, Bug, Suporte. O campo "Projeto"
(id `520278f3-eb70-4bf7-b63a-0cfc9bb967d6`) **não é o produto** — nunca
filtre a fila por ele.

## Ferramentas MCP

As mesmas do ciclo de execução — carregue com `ToolSearch`:
`select:mcp__claude_ai_ClickUp__clickup_filter_tasks,mcp__claude_ai_ClickUp__clickup_get_task,mcp__claude_ai_ClickUp__clickup_get_task_comments,mcp__claude_ai_ClickUp__clickup_get_threaded_comments,mcp__claude_ai_ClickUp__clickup_update_task,mcp__claude_ai_ClickUp__clickup_create_comment,mcp__claude_ai_ClickUp__clickup_search`

Lembre do bug conhecido do ClickUp: comentário não renderiza tabela
markdown (vira "undefined"); use sempre lista com **negrito**.

## Como funciona

### 1. Identificar o produto — uma vez só

Passo 1 do ciclo (`clickup-executar/SKILL.md`): ler `produto:` no
`CLAUDE.md` do projeto, perguntar e gravar se faltar. Roda **uma vez**, no
início da fila inteira — não repita isso a cada tarefa.

### 2. Montar a fila

Mesmo critério de `clickup/SKILL.md`: tarefas em `próximo` (Backlog &
Roadmap) e `triagem` (Bugs & Suporte), filtradas pelo campo "Produto",
ordenadas por prioridade (Urgente → Alta → Normal → Baixa → sem
prioridade), com Bug furando empate de prioridade sobre outros tipos, e
empate final pela mais antiga.

Tarefa com a chave `value` ausente no campo "Produto" (produto não
definido) **não entra na fila automática** — não dá pra saber se ela é
deste repositório. Guarde essas à parte e reporte ao Eric junto do
resumo da fila (id e nome), perguntando qual produto é cada uma. Elas só
voltam a ser candidatas se ele responder confirmando o produto — aí
rodam avulsas por `clickup-executar`, não dentro deste loop. Sumir com
elas em silêncio é o bug que esta regra evita.

Se a fila sair vazia, diga isso e pare — não há nada pra processar.

### 3. Rodar cada tarefa, em ordem, uma de cada vez

Para cada id da fila, execute o ciclo completo de
`clickup-executar/SKILL.md` — Passo 2 (carregar contexto) até Passo 8
(fechar) — com estas regras de fila por cima dos portões do Passo 3:

- **Sem critério de aceite (portão a)** → recuse aquela tarefa (comente o
  que falta, não implemente) e **siga pra próxima** da fila. Isso não
  trava a fila — cada tarefa recusada é reportada, mas não impede as
  outras.
- **Pergunta em aberto com conteúdo real (portão b), ou qualquer outro
  "PARE" que o ciclo levantar mais à frente** (especificação que se
  mostra errada no Passo 5, limite de 3 tentativas estourado no Passo 7)
  **→ PARE A FILA INTEIRA** e chame o Eric. Seção "Perguntas em aberto"
  ausente, ou presente dizendo "Nenhuma", não é motivo de parada — segue
  normal, é o caso comum hoje. Não pule pra próxima tarefa fingindo que
  essa não travou — o motivo de travar é sempre algo que só o Eric
  decide, e processar a próxima tarefa por cima disso seria decidir por
  ele.
- **Tarefa de outro produto definido (portão c)** não deveria aparecer,
  já que o Passo 2 filtrou por produto — se aparecer mesmo assim, ignore
  e siga.
- **Sem especificação suficiente pra implementar (portão d)** — falta o
  comentário "PROMPT PARA O CLAUDE CODE" e não há passo a passo/decisão
  técnica que substitua — **→ recuse** aquela tarefa (comente o que
  falta, não implemente) e **siga pra próxima**, igual ao portão a.

Frases soltas pedindo decisão do Eric (fora da seção formal de "Perguntas
em aberto") não param a fila — mas junte-as no relato da tarefa (item 4
abaixo), do jeito que `clickup-executar/SKILL.md` já pede no Passo 3.

### 4. Reportar entre uma tarefa e outra

Antes de passar pra próxima da fila, relate ao Eric o resultado da que
acabou de rodar — em português, pelo efeito, curto: "tarefa [id] em
homologação, mudou X no produto" ou "tarefa [id] recusada, faltava
critério de aceite" ou "tarefa [id] recusada, faltava o prompt de
implementação" ou "fila parada na tarefa [id]: pergunta em aberto — [a
pergunta]". Se durante a leitura apareceu alguma frase pedindo decisão do
Eric (fora da seção formal — ver Passo 3 de `clickup-executar/SKILL.md`),
liste-as junto desse relato, mesmo quando a tarefa seguiu normal. Não
acumule os relatos pra despejar tudo só no final; o ponto de reportar
entre uma e outra é o Eric conseguir interromper se quiser, não só saber
depois que já rodou tudo.

### 5. Fim de fila

Quando não sobrar mais tarefa pronta (ou a fila parar por pergunta em
aberto), feche com um resumo: quantas foram pra homologação, quantas
foram recusadas e por quê, e se a fila parou no meio ou terminou inteira.

## Dicas

- Uma tarefa recusada não é erro do skill — é o portão a ou o portão d
  funcionando. Reporte e siga, sem tentar "ajudar" preenchendo o critério
  ou o prompt que falta.
- O gatilho de PARAR A FILA é sempre algo que precisa da cabeça do Eric,
  não só da tarefa atual — por isso ele encerra a fila toda, não pula pra
  frente. Continuar processando as tarefas seguintes com uma pergunta
  pendente lá atrás é decidir por ele por omissão.
- Nunca rode duas tarefas ao mesmo tempo aqui — é sequencial, uma de cada
  vez, porque cada uma pode mexer em arquivo e branch que a próxima
  também tocaria.
