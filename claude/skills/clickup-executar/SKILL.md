---
name: clickup-executar
description: Executa UMA tarefa do ClickUp do início ao fim — lê a especificação nos comentários, implementa, valida, e deixa em homologação pro Eric aprovar. Use quando o Eric disser "executa a tarefa [id]", "roda essa tarefa do ClickUp", "pega essa daqui" com um número ou link de tarefa, ou pedir pra tocar um item específico da fila. Para ver a fila antes de escolher, use clickup; para rodar todas em sequência, use clickup-fila.
---

# clickup-executar [id] — ciclo completo de uma tarefa

## Quando usar

Quando o Eric aponta uma tarefa específica do ClickUp (id, link, ou nome
claro o bastante pra achar uma só) e pede pra tocar. Este skill cobre o
ciclo inteiro: entender a tarefa, decidir se ela pode ser feita, codar,
validar, e deixar pronta pra ele homologar — nunca além disso.

> **Regra de ouro deste skill:** cada portão do Passo 3 é bloqueante de
> verdade. Achar a especificação "meio incompleta mas dá pra adivinhar o
> resto" não é achar a especificação — é RECUSAR ou PARAR, dependendo do
> caso, e nunca preencher a lacuna com uma suposição própria.

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

**Campo "Item"** (id `f2dd83c5-040f-4b9d-ac4c-13ff7d7d8b85`, sem acento no
nome): Feature, Melhoria, Tarefa Técnica, Spike, Bug, Suporte.

**Campo "Severidade"** (id `8764fb55-3f25-42c2-aecc-ebd299665603`, só em
Bugs & Suporte): S1 Crítico, S2 Alto, S3 Médio, S4 Baixo.

O campo "Projeto" (id `520278f3-eb70-4bf7-b63a-0cfc9bb967d6`) **não é o
produto** — são categorias internas (Automações | Chatbot, Análise de
Atendimento (IA), Prontuário, Rastreamento CTWA). Nunca use "Projeto" pra
decidir se a tarefa é deste repositório; use sempre "Produto".

## Ferramentas MCP

Carregue com `ToolSearch` antes de chamar:
`select:mcp__claude_ai_ClickUp__clickup_get_task,mcp__claude_ai_ClickUp__clickup_get_task_comments,mcp__claude_ai_ClickUp__clickup_get_threaded_comments,mcp__claude_ai_ClickUp__clickup_update_task,mcp__claude_ai_ClickUp__clickup_create_comment,mcp__claude_ai_ClickUp__clickup_search`

- `clickup_get_task` com `include: ["custom_fields", "description"]` —
  esse é o par que funciona pra leitura completa da tarefa (nome,
  descrição, campos, subtarefas); só `["custom_fields"]` não traz a
  descrição.
- `clickup_get_task_comments` — a especificação e o prompt vivem em
  comentários **separados**, nunca na descrição. `comment_text` vem
  inteiro numa string com `\n`; `date` é timestamp em milissegundos, como
  string. Se `reply_count > 0`, busque as respostas em
  `clickup_get_threaded_comments` — não ignore.
- `clickup_update_task` — muda o **status**. Parâmetros: `task_id` e
  `status` (nome exato, minúsculo). Não confundir com
  `clickup_move_task`, que muda a tarefa de **lista**, não de status —
  não use `clickup_move_task` neste ciclo.
- `clickup_create_comment` — pra comentar, use esta (não a
  `clickup_create_task_comment`, que está obsoleta). Parâmetros:
  `entity_type: "task"`, `entity_id`, `comment_text`.
- `clickup_search` — pra tentar achar o Doc "Mapa do Repositório" no
  Passo 2.

**Bug conhecido do ClickUp:** comentário não renderiza tabela markdown —
vira "undefined" e o conteúdo some. Em qualquer comentário que este skill
escrever, use lista com **negrito**, nunca tabela. Bloco de código muito
longo também pode se perder; prefira texto corrido com separador visual
(ex.: uma linha de `---`).

## O ciclo

### Passo 1 — Identificar o produto

Procure uma linha `produto: <nome>` no `CLAUDE.md` da raiz deste
repositório. Se não existir, pergunte ao Eric uma vez qual dos quatro
produtos este repositório atende, e grave a resposta numa seção `##
ClickUp` no fim do `CLAUDE.md` do projeto — pra nunca mais precisar
perguntar.

### Passo 2 — Carregar contexto

Leia o `CLAUDE.md` do projeto inteiro. Tente achar e ler o Doc "Mapa do
Repositório" no ClickUp (`clickup_search` por esse nome, dentro do espaço
Tecnologia). **Hoje ele não existe** — só há uma subtarefa dizendo que
precisa ser criado. Se não achar, não trave: siga em frente avisando **em
uma linha**, algo como "não achei o Mapa do Repositório no ClickUp — o
refino desta tarefa vai ficar mais genérico até ele existir." Não tente
criar o Doc.

Leia a tarefa inteira: nome, descrição, **todos** os comentários (a
especificação e o prompt ficam em comentários separados, não na
descrição — pule isso e você implementa sem saber o que fazer de
verdade), campos personalizados, e subtarefas.

### Passo 3 — Portões de entrada, nesta ordem

Antes de tudo: os cabeçalhos nos comentários reais **não vêm como texto
exato**. Vêm com emoji na frente e às vezes um sufixo depois — por
exemplo `"✅ Critério de aceite"` ou `"✅ Critério de aceite da
tarefa-mãe"`. Procure por **substring**, ignorando maiúscula/minúscula,
acento e emoji: "criterio de aceite" precisa bater **dentro** da linha,
nunca comparação com a linha inteira. O mesmo vale pro cabeçalho do
portão d, mais abaixo.

**a) Sem "Critério de aceite" nos comentários → RECUSAR.** Comente na
tarefa, em português, exatamente o que falta pra ela poder ser
implementada. Não implemente nada. Pare aqui.

**b) Seção "Perguntas em aberto".** As tarefas reais hoje não têm essa
seção — nem preenchida, nem escrita como "Nenhuma". Por isso:
- **Seção ausente → segue normalmente.** É o caso comum, não trava.
- **Seção presente e com conteúdo real → PARE e pergunte ao Eric na
  hora**, antes de continuar. Não decida sozinho, não pule a pergunta,
  não tente adivinhar a resposta mais provável.
- **Seção presente dizendo "Nenhuma" (ou equivalente) → segue
  normalmente.**

Separado disso: quem escreve a tarefa costuma deixar frases soltas no
meio do texto pedindo decisão do Eric — padrões como "pergunte", "me
pergunte", "na dúvida", "confirmar com". Isso **não é** a seção formal e
**não trava** este portão sozinho — travar em toda frase dessas seria
falso positivo. Mas junte as que encontrar numa lista curta e avise o
Eric **antes de começar o Passo 5** (pode ser junto do Passo 4), pra ele
ver de uma vez o que o autor da tarefa queria confirmar. Ignorá-las de
vez perderia a intenção de quem escreveu.

**c) Produto da tarefa.**
- **Tarefa de outro produto (definido) → ignore**, sem alterar nada nela
  (nem comentário, nem status).
- **Chave `value` ausente no campo "Produto" (produto não definido) →
  NÃO execute automaticamente.** Comente perguntando ao Eric qual produto
  é a tarefa, e só prossiga pro Passo 4 se ele responder confirmando que
  é o produto deste repositório. Executar tarefa de produto desconhecido
  dentro do repositório errado é pior do que não executar.

**d) Sem especificação suficiente pra implementar → RECUSAR.** Procure,
nesta ordem: um comentário cujo cabeçalho contém "PROMPT PARA O CLAUDE
CODE" (mesma busca por substring, ignorando emoji e maiúscula); se não
houver, um comentário com passo a passo ou decisões técnicas concretas o
bastante pra agir. Critério de aceite (portão a) diz **como saber que
ficou pronto**; o prompt diz **o que fazer** — ter um não substitui o
outro. Se não houver nem um nem outro: comente na tarefa que falta o
prompt ou o passo a passo, não implemente, pare aqui.

Só passe pro Passo 4 se a tarefa sobreviveu aos quatro.

### Passo 4 — Preparar

Mova a tarefa: `em desenvolvimento` se ela é da lista Backlog & Roadmap,
`em correção` se é da lista Bugs & Suporte (`clickup_update_task`). Crie a
branch `tarefa/{id}-{slug-do-nome}`.

### Passo 5 — Implementar

Use o prompt do comentário como especificação — não a descrição, não o
título. O harness invisível continua valendo aqui: `graphify` pra achar o
impacto real no código, `context7` sempre que envolver biblioteca externa,
`ponytail` (YAGNI) sempre ativo, e delegar aos especialistas certos pelo
critério de tier do `CLAUDE.md` global (julgamento → sobe de tier;
mecânico → fica em tier baixo).

Se durante a implementação a especificação se mostrar errada ou
incompleta, **PARE e avise** — nunca decida o escopo sozinho pra não
travar.

### Passo 6 — Validar

Rode lint, build e testes do projeto (os comandos reais, tirados do
`package.json`/`CLAUDE.md` do projeto — nunca "deveria passar"). Não
avance com erro.

### Passo 7 — Testar a interface (condicional)

O teste com `agent-browser` abre navegador logado nas contas reais do
Eric. Regra do harness: **pedir autorização antes**, nunca disparar
sozinho.

- Se a tarefa mexe em interface: **pergunte** se pode testar. Se ele
  autorizar, teste contra o critério de aceite, com **limite de 3
  tentativas**. Estourou as 3: **PARE**, deixe a tarefa em "em
  desenvolvimento" (ou "em correção"), comente o que foi tentado e por que
  falhou, e chame o Eric.
- Se ele não autorizar, ou se a tarefa não mexe em interface: siga com a
  validação do Passo 6 e registre **explicitamente**, no comentário do
  Passo 8, que não houve teste de interface e o que precisa ser conferido
  na mão.

### Passo 8 — Fechar

Mova a tarefa pra `homologação` (`clickup_update_task`). **Nunca** pra
`deploy` nem `concluído` — quem valida é o Eric.

Comente na tarefa (`clickup_create_comment`), em português, em lista com
itens em **negrito** (nunca tabela):
- **O que foi feito** — pelo efeito no produto, não pelo nome do arquivo.
- **Arquivos alterados** e o que mudou em cada um.
- **Branch**: nome exato.
- **Teste**: resultado do teste de interface, ou o aviso de que não
  houve teste e o que checar na mão.
- **Atenção**: o que merece cuidado ao homologar.
- **Como testar na mão**: passo a passo, na língua do produto.

### Passo 9 — Reportar

Diga ao Eric, na conversa, o resumo do que foi feito e que a tarefa está
em homologação esperando ele. (Quando este ciclo roda dentro de
`clickup-fila`, é esse relato que a fila usa antes de seguir pra próxima
tarefa — ver `clickup-fila/SKILL.md`.)

## Dicas

- Recusar por falta de critério de aceite (Passo 3a) não é uma falha —é o
  skill funcionando. Não force uma implementação em cima de um critério
  que você mesmo teve que inventar.
- Recusar por falta de prompt ou passo a passo (Passo 3d) também não é
  falha: ter só o critério de aceite, sem saber o que fazer, obrigaria a
  inventar o escopo — é exatamente isso que este portão evita.
- "Pergunta em aberto" (Passo 3b) para tudo, mesmo no meio da
  implementação se ela só aparecer depois — não é só uma checagem do
  início.
- O comentário do Passo 8 é o que o Eric vai ler pra decidir se homologa.
  Escreva pra ele, não pra outro agente: efeito primeiro, termo técnico
  só quando não dá pra evitar, e explicado na primeira vez que aparece.
