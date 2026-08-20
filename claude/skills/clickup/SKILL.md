---
name: clickup
description: Mostra a fila de tarefas do produto deste repositório no ClickUp — o que está pronto pra pegar, em que ordem, e por quê. NÃO executa nada, NÃO altera nada no ClickUp. Use quando o Eric perguntar "o que tem pra fazer", "qual a fila", "tem tarefa no ClickUp", "o que tá pronto", ou no início de uma sessão sem tarefa definida. Para executar uma tarefa específica use clickup-executar; para rodar a fila inteira use clickup-fila.
---

# clickup — fila do produto

## Quando usar

Sempre que o Eric quiser ver o que tem pra fazer antes de decidir o que
rodar — sem que nada mude no ClickUp. Também vale abrir isso sozinho, sem
ele pedir, no começo de uma sessão em que ele não trouxe uma tarefa
específica.

> **Este skill é só leitura.** Nunca chama `clickup_update_task`,
> `clickup_create_comment`, `clickup_move_task` ou qualquer outra
> ferramenta que grave algo no ClickUp — nem para testar. Se o Eric quiser
> agir sobre uma tarefa da lista, isso é `clickup-executar` ou
> `clickup-fila`, não este skill.

## Regras invioláveis

Valem para os três skills desta família (`clickup`, `clickup-executar`,
`clickup-fila`) — aqui elas travam sobretudo a tentação de "já que estou
olhando, eu ajeito":

- NUNCA mover tarefa para "deploy" nem "concluído"
- NUNCA executar tarefa sem critério de aceite
- NUNCA decidir sozinho quando há pergunta em aberto
- NUNCA acionar `agent-browser` ou `chrome-devtools` sem autorização explícita
- NUNCA pegar tarefa de produto diferente do deste repositório
- NUNCA alterar tarefa diferente da que está sendo executada
- Limite de 3 tentativas no teste de interface, sempre
- NUNCA fazer merge

## Referência do ClickUp

Guarde este bloco — evita ter que redescobrir a estrutura do workspace a
cada vez.

**Espaço e listas**
- Espaço "Tecnologia": `901313948266`
- Pasta "Desenvolvimento": `901318693241`
- Lista "Backlog & Roadmap": `901328038710` — status (minúsculo):
  `backlog`, `próximo`, `em desenvolvimento`, `homologação`, `deploy`,
  `concluído`
- Lista "Bugs & Suporte": `901328041316` — status (minúsculo): `aberto`,
  `triagem`, `em correção`, `homologação`, `descartado`, `não
  reproduzível`, `resolvido`

Os nomes de status são sempre minúsculos no ClickUp. Comparar com a
primeira letra maiúscula não bate com nada.

**Campo "Produto"** (id `15edd37b-894a-49bc-89d0-d0ebe80976d8`) — é este
campo, e só ele, que decide se uma tarefa é deste repositório:
- Skale CRM → `b915325c-c137-4903-b905-8345705c7c85`
- Skale Insights → `df36f13f-9842-491f-9b6b-3631323961ad`
- Skale Finance Personal → `e3df9189-c1c7-418f-b3ff-1a27eec15acc`
- Skale Finance Business → `22708727-b354-4bce-a46c-b401c74a9ed9`

O valor real que a API devolve é `"value"` como **índice numérico** da
opção (ex.: `"value": 1` corresponde a "Skale Insights") — não é o id
acima. Quando a tarefa não tem produto definido, a chave `value` **não
aparece** no objeto do campo — não vem `null`, não vem string vazia.
Trate como ausente, nunca procure por valor vazio.

**Campo "Item"** (id `f2dd83c5-040f-4b9d-ac4c-13ff7d7d8b85` — o nome é
"Item", sem acento): Feature, Melhoria, Tarefa Técnica, Spike, Bug,
Suporte.

**Campo "Severidade"** (id `8764fb55-3f25-42c2-aecc-ebd299665603`) — só
existe em Bugs & Suporte: S1 Crítico, S2 Alto, S3 Médio, S4 Baixo.

**Prioridade** é campo nativo do ClickUp, não personalizado: `urgent`,
`high`, `normal`, `low`, ou `null` quando ninguém definiu.

**Não confundir com produto:** o campo "Projeto" (id
`520278f3-eb70-4bf7-b63a-0cfc9bb967d6`) tem opções como Automações |
Chatbot, Análise de Atendimento (IA), Prontuário, Rastreamento CTWA — isso
é uma classificação interna do time, não corresponde aos quatro produtos.
Filtrar por "Projeto" pensando que é o produto vai devolver a fila errada.
Outros campos existentes mas não usados aqui: Componente (id
`f9102a72-c027-4efd-a937-dd584ceea46d`), Origem (id
`3bd00527-a6dd-4b49-a805-f3fed62f78d3`).

## Ferramentas MCP

Elas são carregadas sob demanda — antes de chamar qualquer uma, rode
`ToolSearch` com `select:mcp__claude_ai_ClickUp__clickup_filter_tasks,mcp__claude_ai_ClickUp__clickup_get_task,mcp__claude_ai_ClickUp__clickup_get_task_comments,mcp__claude_ai_ClickUp__clickup_get_threaded_comments`.

- `clickup_filter_tasks` — lista tarefas de uma lista por status. Não traz
  campo personalizado nem descrição — só status, prioridade, prazo,
  responsável, etiqueta.
- `clickup_get_task` — para ler o campo "Produto" e o campo "Item" de cada
  tarefa é obrigatório passar `include: ["custom_fields"]`; uma tarefa por
  vez.
- `clickup_get_task_comments` — para checar se a tarefa tem critério de
  aceite e pergunta em aberto. Se `reply_count > 0` numa tarefa, as
  respostas estão em `clickup_get_threaded_comments`, chamada à parte.

## Como montar a fila

**1. Identificar o produto deste repositório.** Procure uma linha
`produto: <nome>` no `CLAUDE.md` da raiz deste projeto (o do repositório,
não o global do usuário). Se não existir, pergunte ao Eric uma vez qual
dos quatro produtos (Skale CRM, Skale Insights, Skale Finance Personal,
Skale Finance Business) este repositório atende, e grave a resposta numa
seção `## ClickUp` no fim do `CLAUDE.md` do projeto — assim nunca mais
precisa perguntar.

**2. Buscar candidatas.** Chame `clickup_filter_tasks` duas vezes: lista
`901328038710` com status `próximo`, e lista `901328041316` com status
`triagem`. Se uma lista devolver zero tarefas (hoje é o caso normal de
Bugs & Suporte, que está vazia), simplesmente não há nada a detalhar dela
— não é erro, é estado real.

**3. Filtrar pelo produto.** Para cada tarefa candidata, chame
`clickup_get_task` com `include: ["custom_fields"]`. Três resultados
possíveis:
- Campo "Produto" igual ao produto deste repositório → mantém, segue pro
  próximo passo.
- Campo "Produto" com outro valor definido → descarta, sem tocar na
  tarefa.
- Chave `value` ausente no campo "Produto" (tarefa sem produto definido)
  → **não descarta e não mistura com a fila normal** — guarde à parte,
  pra aparecer na seção "Sem produto definido" do resultado final (passo
  6). Sumir com ela em silêncio é exatamente o que esta regra evita.

**4. Checar se está "pronta".** Nas tarefas que sobraram, leia todos os
comentários (`clickup_get_task_comments`, e as respostas em thread se
`reply_count > 0`).

Os cabeçalhos nos comentários reais **não vêm como texto exato** — vêm
com emoji na frente e às vezes um sufixo depois, por exemplo `"✅
Critério de aceite"` ou `"✅ Critério de aceite da tarefa-mãe"`. Procure
por **substring**, ignorando maiúscula/minúscula, acento e emoji — ou
seja, "criterio de aceite" precisa bater **dentro** da linha, nunca
comparação com a linha inteira igual. Comparação exata faz a tarefa
parecer sem critério mesmo quando ele existe.

Uma tarefa está **pronta** quando as três condições valem:
- existe um comentário cujo cabeçalho contém "critério de aceite",
  preenchido (não só o título vazio);
- a seção "Perguntas em aberto" **não existe** (caso comum hoje — segue
  normal), ou existe mas diz "Nenhuma"/equivalente (também segue normal).
  Só conta contra a tarefa quando a seção existe **e** tem conteúdo real
  além disso;
- existe especificação suficiente pra implementar: um comentário com
  "PROMPT PARA O CLAUDE CODE" (mesma busca por substring, ignorando emoji
  e maiúscula) ou, na falta dele, um comentário com passo a passo ou
  decisão técnica concreta o bastante pra agir. Critério de aceite diz
  **como saber que ficou pronto**; o prompt diz **o que fazer** — ter só
  um dos dois não basta.

Quando faltar qualquer uma das três condições, a tarefa aparece na lista
mesmo assim, marcada como não pronta, com o motivo.

Se o texto tiver uma frase solta pedindo decisão do Eric — padrões como
"pergunte", "me pergunte", "na dúvida", "confirmar com" — isso **não**
conta contra a tarefa (não é a seção formal), mas vale citar a frase
junto do motivo, entre parênteses, pra ele ver de uma vez o que o autor
da tarefa queria confirmar.

**5. Ordenar.** Critério, nesta ordem:
1. Prioridade: Urgente → Alta → Normal → Baixa → sem prioridade definida.
2. Empate de prioridade: tarefa do tipo Bug (campo "Item") vem antes de
   qualquer outro tipo — bug urgente tem SLA (prazo de atendimento
   combinado) de mesmo dia, então mesmo empatando em prioridade ele fura a
   fila.
3. Empate ainda restante: a tarefa mais antiga primeiro.

**6. Mostrar o resultado**, uma linha por tarefa, em português direto —
sem termo interno do ClickUp que o Eric precisaria traduzir na cabeça:

```
[id] nome da tarefa — prioridade — tipo — pronta pra executar? sim/não (motivo se não)
```

Exemplo:

```
[86812345] Exportar relatório em CSV — Alta — Feature — pronta: sim
[86812399] Login trava no Safari — Urgente — Bug — pronta: não (falta
critério de aceite nos comentários)
[86812410] Ajustar filtro de data no dashboard — Normal — Melhoria —
pronta: não (tem pergunta em aberto sem resposta: "qual fuso horário usar
no filtro?")
```

Se sobrou alguma tarefa guardada à parte no passo 3 (produto sem valor
definido), mostre-a numa seção separada, sempre — nunca deixe ela sumir
da resposta:

```
Sem produto definido — precisa de revisão:
[id] nome da tarefa
```

## Se a fila estiver vazia

Diga isso com todas as letras — "não tem nada em 'próximo' nem em
'triagem' pro produto [nome]" — e sugira o próximo passo óbvio: olhar o
que está em `backlog` e promover algo pra `próximo`, ou olhar `aberto` em
Bugs & Suporte e mover pra `triagem`. Não invente tarefa nem finja que a
fila tem algo pra não devolver uma lista vazia.
