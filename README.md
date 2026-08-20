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

## Segurança

Nenhuma credencial entra aqui. O `backup.sh` funciona por **lista branca** — só copia os arquivos que estão explicitamente listados nele, então um arquivo novo com token que apareça em `~/.claude/` amanhã não é copiado por acidente. Depois de copiar, ele roda o `checar-segredos.sh`, que procura os formatos conhecidos de chave e **interrompe** se achar algum.

Se um segredo escapar mesmo assim: **rotacione a chave na origem** — apagar o commit não basta, o valor já saiu do seu controle.
