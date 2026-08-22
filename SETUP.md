# SETUP — máquina nova, passo a passo

O `install.sh` faz quase tudo. Este arquivo existe para dois casos: o script falhar, ou você querer conferir na mão.

A regra que organiza tudo: **o Git traz arquivo, não traz credencial nem programa.** O que está abaixo é justamente a parte que o Git não consegue trazer.

---

## 1. O que instalar antes de rodar o script

| O quê | Como | Para que serve |
|---|---|---|
| **Claude Code** | ver claude.com/code | O programa em si |
| **Git** | já vem no macOS | Clonar este repositório |
| **rsync** | já vem no macOS | O `install.sh` usa para copiar |

Clone e rode:

```bash
git clone [skale-harness] && cd skale-harness
./install.sh
```

O script vai listar o que falta. Os itens abaixo cobrem cada um deles.

---

## 2. Login do Claude Code

```bash
claude
```

Abre o navegador para autenticar. A credencial fica no Chaveiro do macOS — **nunca** neste repositório.

---

## 3. Programas de terminal

```bash
# graphify — mapeia o código como grafo.
# Com ele, "o que quebra se eu mudar isso" é uma consulta; sem ele, é vasculhar arquivo por arquivo.
# (comando de instalação em claude/MANIFEST.md)

brew install agent-browser    # controla um navegador de verdade, para testar interface
```

---

## 4. MCPs — as conexões com serviços externos

MCP é a ponte entre o Claude e um serviço de fora (ClickUp, Obsidian, documentação). Cada um precisa da sua credencial, então nenhum vem no repositório.

São de dois tipos, e se configuram de formas diferentes:

**Os que vêm da sua conta** — ClickUp, Google Drive, Algrow. Não se instalam por comando: são
conectores ligados na sua conta do claude.ai, e o Claude Code enxerga através do login. Em máquina
nova, **fazer login já traz os três**. Para ligar ou desligar algum, é nas configurações de
conectores do claude.ai, não aqui.

**Os que rodam nesta máquina** — precisam ser adicionados:

```bash
claude mcp add --scope user context7
claude mcp add --scope user chrome-devtools
claude mcp add --scope user obsidian    # aponta para o vault: veja o passo 5
```

Conferir: `claude mcp list`

> **Nunca cole o valor de um token no chat.** Guarde no Chaveiro e exponha como variável de ambiente no `~/.zshenv`:
>
> ```bash
> # com a credencial já copiada:
> security add-generic-password -a "$USER" -s nome-do-item -w "$(pbpaste | tr -d '\n')"
> # e no ~/.zshenv:
> export MINHA_VAR=$(security find-generic-password -a "$USER" -s nome-do-item -w 2>/dev/null)
> ```
>
> O `tr -d '\n'` não é detalhe: a cópia costuma trazer uma quebra de linha junto, e a API rejeita com um erro de autenticação que parece falta de permissão — e não é.
>
> Tem que ser `~/.zshenv`, **não** `~/.zshrc`: o `.zshrc` só é lido em terminal interativo, e o shell que o Claude usa não é.

---

## 5. Vault do Obsidian

```bash
mkdir -p ~/ObsidianVault-Skale/{01-projetos,02-areas,03-conhecimento,04-referencia}
```

Abra uma vez no Obsidian para ele reconhecer a pasta. É onde mora o conhecimento que atravessa os produtos.

---

## 6. As duas variáveis que quebram tudo em silêncio

```bash
echo "modelo=[${CLAUDE_CODE_SUBAGENT_MODEL:-vazia}] esforço=[${CLAUDE_CODE_EFFORT_LEVEL:-vazia}]"
```

As duas precisam estar **vazias**.

Se alguma estiver preenchida, ela sobrescreve o modelo e o nível de esforço de **todos** os especialistas — e o pior: sem dar erro. Você configura um especialista para pensar bastante, ele roda no mínimo, e nada na tela avisa. Procure em `~/.zshenv`, `~/.zshrc` e no `settings.json` de cada projeto.

---

## 7. Conferir

```bash
./install.sh --check
```

Deve terminar sem nenhum item pendente.

---

## Se algo der errado

```bash
./install.sh --rollback     # volta ao estado anterior à última instalação
```

Os backups ficam em `backups-locais/`, com data e hora no nome.
