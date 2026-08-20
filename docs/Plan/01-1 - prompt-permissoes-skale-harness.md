# Prompt — Permissões: acabar com as aprovações repetitivas

> Adicionar à fila do `skale-harness`. Entra depois da Etapa 1 (estrutura), porque as permissões vão no `settings.json` global.

---

```
Configure as permissões globais do Claude Code para eu parar de aprovar as
mesmas coisas em todo projeto.

O PROBLEMA
Toda sessão nova, em todo projeto, eu aprovo dezenas de vezes o mesmo tipo de
comando: ler arquivo, rodar lint, git status, npm install. É atrito puro e me
treina a clicar "sim" no automático — o que é justamente o pior efeito
colateral, porque quando aparecer algo que EU DEVERIA ler com atenção, eu já
vou estar clicando sem olhar.

O OBJETIVO
Eliminar a aprovação de tudo que é rotineiro e reversível.
Manter a aprovação apenas onde o erro é IRREVERSÍVEL ou EXPÕE DADO.

Não quero "liberar tudo". Quero liberar tudo que é seguro, e que a lista do que
sobra seja curta o suficiente para eu ler de verdade quando aparecer.

---

ONDE CONFIGURAR
No settings.json global do skale-harness (claude/settings.json), para valer em
todos os projetos. Use o esquema de permissions com allow, ask e deny.

Confirme na documentação atual o formato exato dos campos e da sintaxe de
padrões antes de escrever — não presuma pela memória.

---

LIBERAR SEM PERGUNTAR (allow)

Leitura e navegação — sempre seguro
  ler qualquer arquivo do projeto, listar diretório, buscar, grep, find, cat,
  head, tail, wc, tree

Git de leitura
  status, log, diff, branch, show, blame, remote -v, stash list

Git de escrita local (reversível)
  add, commit, checkout, switch, branch (criar), stash, restore, revert

Pacotes
  npm/pnpm/yarn/bun: install, ci, run, test, lint, build, dev, add, remove
  pip install, pip list
  deno task, deno check

Qualidade e teste
  eslint, biome, prettier, tsc, vitest, jest, playwright

Ferramentas do meu setup
  graphify (qualquer subcomando)
  supabase CLI: comandos de LEITURA e de geração (gen types, db diff, status,
  functions list, projects list, migration list)

MCPs de leitura
  ClickUp: buscar tarefa, ler comentário, listar lista, ler doc
  Obsidian: ler nota, buscar
  context7: qualquer coisa (é só documentação)

Escrita de arquivo dentro do projeto
  criar, editar e apagar arquivo dentro do diretório do projeto atual

---

CONTINUAR PERGUNTANDO (ask) — a lista curta

Estes ficam porque errar aqui não tem volta, ou expõe dado:

1. git push
   Especialmente para main/master. Sobe para o remoto, outras pessoas puxam.

2. git reset --hard, git clean -fd, git rebase, git push --force
   Apagam trabalho não commitado ou reescrevem histórico.

3. Qualquer coisa fora do diretório do projeto
   Escrita em ~, /etc, /usr, ~/.ssh, ~/.aws, ~/.config, ~/.claude
   Exceção: o próprio skale-harness precisa escrever em ~/.claude — trate isso
   como caso explícito, não como regra geral.

4. rm -rf, mv e cp com destino fora do projeto
   Apagam sem lixeira.

5. supabase db push, db reset, migration up/down, functions delete,
   projects delete
   MOTIVO CRÍTICO: meus bancos de produção estão sem backup hoje. Uma migration
   destrutiva não tem recuperação. Isso continua perguntando mesmo depois que o
   backup DIY existir.

6. agent-browser e chrome-devtools
   Abrem navegador logado nas minhas contas reais. Regra já definida no harness.

7. ClickUp e Obsidian — operações de ESCRITA
   Criar, editar, mover status, apagar tarefa ou nota. Afeta o que o time
   inteiro vê. Leitura fica liberada.

8. Qualquer comando que leia ou escreva .env, credencial, chave, token, secret
   Inclui: cat .env, exportar variável de ambiente com valor sensível, gravar
   em arquivo de configuração de credencial.

9. curl e wget com POST, PUT, DELETE, ou enviando dado
   GET para documentação pode liberar. Enviar dado para fora, não.

10. Instalação global no sistema
    npm i -g, brew install, comandos com sudo

---

BLOQUEAR SEMPRE (deny) — nem perguntar

  sudo rm, rm -rf / , dd, mkfs, qualquer coisa em /System ou /Library
  git push --force para main ou master
  leitura de ~/.ssh/id_*, ~/.aws/credentials

---

REGRAS DE COMPORTAMENTO — além da lista

1. NUNCA sugira que eu use --dangerously-skip-permissions ou equivalente.
   Se eu pedir, me lembre desta conversa: com bancos de produção sem backup,
   subagentes editando em auto-aprovação dentro de workflows, e credenciais de
   quatro produtos na mesma máquina, aprovação zero transforma um plano ruim em
   dano irreversível.

2. Quando pedir aprovação, EXPLIQUE em uma linha o que vai fazer e por quê.
   Não me mostre só o nome técnico da ferramenta.
   Ruim:  "Do you want to proceed with mcp__chrome-devtools__new_page?"
   Bom:   "Vou abrir o Skale Insight no Chrome para medir o tempo de
           carregamento. Autoriza?"

3. AGRUPE aprovações. Se vai rodar cinco comandos relacionados, peça uma vez
   explicando o conjunto, não cinco vezes.

4. Se eu negar algo, NÃO tente contornar por outro caminho. Pare e me pergunte.

---

REVISÃO
Depois de configurar, rode uma sessão comigo e anote toda vez que uma aprovação
aparecer. Se algo rotineiro e seguro estiver pedindo, adicione ao allow. Quero
convergir para: só aparece o que eu preciso mesmo ler.

ENTREGA
1. O settings.json com as permissões
2. A lista final do que ficou em ask, para eu confirmar que é curta o suficiente
3. Onde documentar isso no README
4. Como eu adiciono exceção depois, sem quebrar a configuração
```

---

## O que isso muda no seu dia

**Some:** ler arquivo, grep, git status/diff/commit, npm install, lint, build, teste, graphify — o grosso do atrito.

**Fica:** push, comando destrutivo, migration de banco, navegador, escrita no ClickUp, credencial.

> ⚠️ **O item 5 é o que mais importa hoje.** Seus bancos de produção estão sem backup. Uma migration destrutiva aprovada no automático não tem volta — e o Skale Insight tem dado de clínica.
>
> Depois que o backup DIY estiver rodando, dá pra reavaliar. Antes disso, não.
