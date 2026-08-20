# skale-harness

Este repositório guarda a configuração do Claude Code que vale em **todos** os projetos, e sabe reinstalá-la numa máquina nova.

Antes dele, essa configuração morava solta em `~/.claude/` — sem histórico, sem cópia, e sem nenhuma forma de levar para outro computador. Um comando errado apagava dias de ajuste.

---

## Em máquina nova

```bash
git clone [skale-harness] && cd skale-harness
./install.sh
```

Ao terminar, o script **diz na tela** o que ele não conseguiu trazer de volta — login, credenciais, programas de sistema — e o comando para resolver cada item. O passo a passo manual está no [SETUP.md](SETUP.md).

---

## As peças

| Peça | O que é |
|---|---|
| `claude/` | Cópia fiel da configuração. É isso que vai para a sua máquina. |
| `claude/CLAUDE.md` | As regras que o Claude segue em qualquer projeto que você abrir. |
| `claude/settings.json` | Ajustes gerais: quais plugins ligam, nível de esforço, e o que ele pode fazer sem te perguntar. |
| `claude/MANIFEST.md` | O catálogo. Lista tudo que compõe o setup e o comando de instalar cada coisa. |
| `claude/agents/` | Os especialistas. Cada um com o modelo e o nível de esforço certos para o tipo de trabalho. |
| `claude/skills/` | Os procedimentos que ele já sabe seguir. |
| `claude/hooks/` | Programinhas que rodam sozinhos em momentos fixos (antes de um comando, depois de editar um arquivo). |
| `templates/` | Modelos reaproveitáveis entre projetos. |
| `backup.sh` | Traz a configuração da máquina **para** o repositório. |
| `install.sh` | Leva a configuração do repositório **para** a máquina. |
| `scripts/checar-segredos.sh` | Varre atrás de senha e chave antes de qualquer commit. |

### Os dois sentidos, que não se confundem

```
   máquina  ──  backup.sh  ──▶  repositório      "guardar o que eu ajustei"
repositório  ── install.sh ──▶  máquina          "aplicar o que está guardado"
```

Mexeu direto no `~/.claude/`? Rode `./backup.sh` para não perder. Mexeu aqui no repositório? Rode `./install.sh` para valer na máquina.

Na dúvida sobre qual dos dois lados está mais novo:

```bash
./backup.sh --diferencas    # mostra o que mudou de cada lado, sem copiar nada
```

Use isso sempre que outra sessão, em outro projeto, puder ter instalado algo no global — um hook novo, uma skill, um agente. O sinal `+` é justamente isso: apareceu na máquina e ainda não está versionado aqui.

> ⚠️ **Rode o `install.sh` com o Claude Code FECHADO.**
>
> Ele mantém a configuração em memória e regrava o `settings.json` inteiro a cada aprovação que você dá. Instalar com uma sessão aberta significa ver a mudança ser apagada minutos depois, sem aviso. Aconteceu duas vezes durante a construção deste repositório.
>
> A ordem certa é: fechar o Claude Code → `./install.sh` → abrir de novo.

---

## Duas categorias de coisa — e por que o MANIFEST existe

|  | O quê | Como volta em máquina nova |
|---|---|---|
| **A — arquivos** | Skills, agentes, hooks, CLAUDE.md, settings | O `install.sh` **copia** |
| **B — instaláveis** | Plugins, programas de terminal, MCPs com credencial | O `install.sh` **roda o comando** que está no MANIFEST |

A categoria B não cabe dentro de um repositório — mas a **lista e o comando de instalar cada item**, sim. É exatamente isso que o `claude/MANIFEST.md` guarda.

> **Regra:** ferramenta nova entra no MANIFEST **no mesmo dia**. Sem isso, o setup vira conhecimento que só existe na sua cabeça: você troca de máquina, instala metade, e descobre o que faltou semanas depois.

---

## Desfazer

O `install.sh` guarda o estado anterior antes de sobrescrever qualquer coisa:

```bash
./install.sh --rollback     # volta para o estado de antes da última instalação
./install.sh --check        # só verifica o que falta, não escreve nada
```

As cópias ficam em `backups-locais/`, com data e hora no nome, e não vão para o Git.

---

## Modo permissivo — leia antes de mudar

Este setup roda **liberado**. O Claude Code executa qualquer comando de terminal, cria e apaga qualquer arquivo, acessa a web e usa as integrações (ClickUp, Obsidian) **sem pedir aprovação** — incluindo comando destrutivo: `rm -rf`, `git reset --hard`, `git push`, `supabase db push`.

**Duas exceções**, e só elas, continuam perguntando:

| O quê | Por quê |
|---|---|
| `agent-browser` | Clica em interface de verdade, numa sessão logada nas contas reais de Supabase, ClickUp, Google Cloud e banco. |
| `chrome-devtools` | Abre navegador nas mesmas contas. |

O motivo de serem essas duas: é o único tipo de dano que **nenhuma** das mitigações abaixo consegue desfazer. Um comando errado no terminal deixa rastro e tem ponto de retorno; um clique errado numa tela de produção, não.

A lista `deny` está **vazia** de propósito. Nada é bloqueado.

### O que existe no lugar da aprovação

Três hooks, que **registram e revertem** — nenhum deles bloqueia ou pergunta:

| Hook | O que faz |
|---|---|
| `registrar-comandos.mjs` | Grava todo comando executado em `~/.claude/logs/comandos.jsonl`: data, pasta, projeto e o comando completo. Serve para reconstruir o que aconteceu depois. Mascara valor com cara de credencial antes de gravar, e troca de arquivo ao passar de 5 MB. |
| `avisar-destrutivo.mjs` | Ao detectar comando destrutivo, escreve na tela uma linha dizendo **o que se perde**. Não bloqueia, não pergunta — só mostra passando. |
| `checkpoint-automatico.mjs` | Antes de operação que reescreve histórico do Git ou toca o banco, guarda o estado atual num ponto de retorno, sem tirar o trabalho de baixo de você. Depois diz como voltar. |

Os três **falham abertos**: se algum quebrar, ele sai calado e o comando roda normalmente. Um hook que trava a sessão seria o único jeito de esse setup te atrapalhar.

**Onde fica o log:** `~/.claude/logs/comandos.jsonl` — uma linha por comando. Para ler o que aconteceu hoje:

```bash
tail -50 ~/.claude/logs/comandos.jsonl | jq -r '"\(.hora)  \(.projeto)  \(.comando)"'
```

**Como voltar de um checkpoint:**

```bash
git stash list                    # os pontos de retorno, do mais recente para o mais antigo
git stash apply stash@{0}         # traz o estado de volta sem apagar o ponto
```

### Como adicionar ou tirar uma exceção

Tudo mora em [claude/permissoes.json](claude/permissoes.json), que é escrito para ser lido — cada bloco tem o porquê junto. Depois de editar:

```bash
./scripts/aplicar-permissoes.sh    # atualiza o settings.json daqui
./install.sh                       # leva para a máquina (com o Claude Code FECHADO)
```

- **Passar a perguntar por algo:** acrescente o padrão na lista `ask`. Regra em `ask` vence `allow` sempre, sem depender de ser mais específica — então não precisa mexer no `allow`.
- **Bloquear de vez:** acrescente na lista `deny`, hoje vazia. `deny` vence tudo, inclusive o `allow` de qualquer projeto.
- **Servidor MCP novo:** precisa ser nomeado no `allow` (`mcp__nome-do-servidor`). Não existe curinga que pegue todos — se esquecer, ele fica perguntando.

### Duas proteções que continuam de pé

Não são aprovações, e não foram removidas:

- **`secret-scan.mjs` recusa gravar** um arquivo cujo conteúdo tenha cara de senha, chave ou token. É o único hook que barra alguma coisa, e barra porque "nunca commitar segredo" é regra sua. Para desligar, tire a entrada dele de `claude/settings.json`.
- **Caminhos críticos** — `.git`, `.claude`, `.zshrc`, `.npmrc`, `.mcp.json` — continuam pedindo confirmação para escrita, porque o modo escolhido foi `default` e não `bypassPermissions`. Na prática o dia a dia é igual; a diferença aparece só nesses caminhos.

---

## Segurança

Nenhuma credencial entra aqui. O `backup.sh` funciona por **lista branca** — só copia os arquivos que estão explicitamente listados nele, então um arquivo novo com token que apareça em `~/.claude/` amanhã não é copiado por acidente. Depois de copiar, ele roda o `checar-segredos.sh`, que procura os formatos conhecidos de chave e **interrompe** se achar algum.

Se um segredo escapar mesmo assim: **rotacione a chave na origem** — apagar o commit não basta, o valor já saiu do seu controle.
