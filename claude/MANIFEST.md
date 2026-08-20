# MANIFEST — catálogo completo do setup do Claude Code

Este arquivo lista **tudo** que compõe o ambiente do Claude Code nesta máquina — não só o que o
Git versiona. Metade das ferramentas (plugins de marketplace, programas de terminal, credenciais de
MCP) não cabe dentro do repositório, mas o nome delas e o comando para reinstalar cabem aqui. Regra
fixa: **toda ferramenta nova entra neste arquivo no mesmo dia em que é instalada** — nunca depois,
nunca "quando sobrar tempo". Sem isso o setup vira conhecimento que só existe na cabeça do Eric, e
some na próxima troca de máquina.

Categoria **A** = arquivo dentro de `claude/`, o `install.sh` copia sozinho.
Categoria **B** = instalável (plugin, programa, credencial), não cabe no repositório — só a receita
de instalar cabe, e está na coluna "Como instalar".

---

## Plugins

Habilitados hoje em `~/.claude/settings.json` (17). Cada um vem de um marketplace — uma espécie de
loja de plugins que o Claude Code sabe consultar; os 7 marketplaces conhecidos nesta máquina estão
listados depois da tabela.

| Nome | O que faz | Categoria | Como instalar |
|---|---|---|---|
| aia-harness | Monta e mantém a configuração do Claude Code de um projeto inteiro — memória, agentes, hooks — em vez de eu montar peça por peça. | B | `/plugin install aia-harness@leandro-plugins-registry` |
| caveman | Deixa minhas respostas de texto diretas e curtas, sem enrolação. | B | `/plugin install caveman@caveman` |
| claude-academy-guide | Guia de referência sobre o próprio Claude Code — como usar hooks, comandos, MCP — para eu explicar a ferramenta em vez de adivinhar. | B | `/plugin install claude-academy-guide@anthropic-agent-skills` |
| claude-code-setup | Analisa um projeto e recomenda quais automações do Claude Code (hooks, agentes, skills) valem a pena montar nele. | B | `/plugin install claude-code-setup@claude-plugins-official` |
| claude-md-management | Audita e atualiza o arquivo de instruções (CLAUDE.md) de um projeto, apontando o que está desatualizado ou fraco. | B | `/plugin install claude-md-management@claude-plugins-official` |
| code-review | Revisa um pull request inteiro, apontando bug e ponto fraco antes de eu aprovar. | B | `/plugin install code-review@claude-plugins-official` |
| commit-commands | Atalhos prontos para criar commit, subir e abrir pull request sem eu descrever o processo toda vez. | B | `/plugin install commit-commands@claude-plugins-official` |
| discernment-nudge | Me lembra de parar e confirmar antes de agir quando o pedido é ambíguo, em vez de sair executando a primeira interpretação. | B | `/plugin install discernment-nudge@anthropic-agent-skills` |
| document-skills | Cria e edita arquivo do Office (Word, Excel, PowerPoint) e PDF direto, sem precisar de outro programa aberto. | B | `/plugin install document-skills@anthropic-agent-skills` |
| example-skills | Pacote de exemplos prontos (design de marca, arte, comunicação interna) que eu posso usar de modelo em vez de começar do zero. | B | `/plugin install example-skills@anthropic-agent-skills` |
| feature-dev | Guia o desenvolvimento de uma funcionalidade nova do início ao fim — entender o código existente antes de escrever o novo. | B | `/plugin install feature-dev@claude-plugins-official` |
| hookify | Cria automações (hooks) a partir de "sempre que X acontecer, faça Y" — sem eu escrever o script de automação na mão. | B | `/plugin install hookify@claude-plugins-official` |
| ponytail | Mantém meu código enxuto — questiona código desnecessário antes de escrever, prefere a solução mais simples que funciona. | B | `/plugin install ponytail@ponytail` |
| pr-review-toolkit | Kit de revisores especializados (teste, erro silencioso, design de tipo) que analisam um pull request cada um pela sua lente. | B | `/plugin install pr-review-toolkit@claude-plugins-official` |
| superpowers | Coleção de métodos de trabalho (planejar antes de codar, revisão antes de terminar, depuração sistemática) que me fazem seguir processo em vez de atalho. | B | `/plugin install superpowers@claude-plugins-official` |
| ui-ux-pro-max | Kit de design de interface — marca, sistema de design, apresentação — para telas e materiais visuais mais consistentes. | B | `/plugin install ui-ux-pro-max@ui-ux-pro-max-skill` |
| vercel | Conecta o Claude Code à Vercel — deploy, variáveis de ambiente, Next.js — para projetos hospedados lá. | B | `/plugin install vercel@claude-plugins-official` |

**Instalado mas não habilitado no perfil global:** `watch@claude-video` — fica de fora até eu decidir ligá-lo. Para habilitar: `/plugin` e marcar `watch` na lista.

**Marketplaces conhecidos** (a "loja" de onde cada plugin acima vem — precisa estar registrada antes do `/plugin install` funcionar): `anthropic-agent-skills`, `caveman`, `claude-plugins-official`, `claude-video`, `leandro-plugins-registry`, `ponytail`, `ui-ux-pro-max-skill`. Se o `/plugin install` falhar dizendo que não conhece o marketplace, primeiro rode `/plugin marketplace add <nome>`.

---

## Skills

Pastas dentro de `~/.claude/skills/`, já versionadas em `claude/skills/` neste repositório (11).
Categoria A — o `install.sh` copia direto, nada para instalar à parte.

| Nome | O que faz | Categoria | Como instalar |
|---|---|---|---|
| brainstorm-para-plano | Antes de eu sair codando um pedido vago ("melhora o dashboard"), transforma o pedido num plano claro — evita eu construir a primeira interpretação errada. | A | `./install.sh` (copia `claude/skills/brainstorm-para-plano`) |
| configurar-lint | Monta as regras de qualidade de código (lint) do zero num projeto novo, ou moderniza uma configuração velha. | A | `./install.sh` (copia `claude/skills/configurar-lint`) |
| design-pro | Direção visual de interface — cor, tipografia, espaçamento, hierarquia, estados de componente, formulário, tabela, gráfico, responsivo, acessibilidade. Sobrepõe-se ao `impeccable`; usar os dois juntos em trabalho visual. **Era um atalho para `~/Desktop/claude-skills/design-pro` e por isso não estava versionada de verdade** — corrigido em 2026-08-19, agora o conteúdo mora no repositório. | A | `./install.sh` |
| frontend-design | Ajuda a escolher direção visual (tipografia, estilo) que não pareça modelo genérico, ao criar ou redesenhar uma tela. | A | `./install.sh` (copia `claude/skills/frontend-design`) |
| impeccable | Skill de design de produto — a mais importante do negócio, porque todo produto do Eric tem interface e vai para cliente pagante. Cobre crítica, polimento, acessibilidade, hierarquia visual e sistema de design completo de uma tela, componente ou landing page. Deve entrar sozinha em qualquer trabalho visual, sem eu precisar pedir. Usa dois arquivos próprios de cada projeto (PRODUCT.md e DESIGN.md), que não vêm neste repositório. | A | `./install.sh` (copia `claude/skills/impeccable`) |
| limpar-projeto | Faz uma faxina no projeto — código morto, anotação "resolver depois" esquecida, dependência que ninguém usa mais — mas sempre mede antes de apagar, nunca no chute. | A | `./install.sh` (copia `claude/skills/limpar-projeto`) |
| memoria-do-projeto | Monta um sistema para o Claude Code lembrar, de uma sessão para outra, o que já foi decidido e o que já foi tentado e descartado — evita reaprender o mesmo projeto do zero toda vez. | A | `./install.sh` (copia `claude/skills/memoria-do-projeto`) |
| ondas-paralelas | Pega uma lista de tarefas independentes de um plano aprovado e distribui entre vários agentes trabalhando ao mesmo tempo, sem um pisar no arquivo do outro. | A | `./install.sh` (copia `claude/skills/ondas-paralelas`) |
| revisao-multi-agente | Revisa um código pronto com vários revisores em paralelo, cada um olhando por um ângulo diferente (segurança, correção, performance) — em vez de uma passada só. | A | `./install.sh` (copia `claude/skills/revisao-multi-agente`) |
| theme-factory | Aplica um visual pronto (cor, fonte) a um material gerado — apresentação, relatório, página — escolhendo entre 10 estilos prontos ou criando um novo na hora. | A | `./install.sh` (copia `claude/skills/theme-factory`) |
| zerar-avisos-lint | Zera uma pilha de avisos de qualidade de código já acumulados, em lotes controlados, sem quebrar o que já funciona — para quando o lint já existe mas ninguém nunca zerou os avisos. | A | `./install.sh` (copia `claude/skills/zerar-avisos-lint`) |

---

## Hooks

Scripts em `claude/hooks/` que reagem automaticamente a uma ação do Claude Code (não precisam ser
chamados por mim). Categoria A.

| Nome | O que faz | Categoria | Como instalar |
|---|---|---|---|
| rtk-proxy.mjs | Antes de rodar um comando de leitura no terminal, resume o resultado para gastar menos tokens da conversa. Nunca mexe em comando que escreve ou apaga algo, e se der erro deixa o comando original passar direto — nunca trava o trabalho por causa dele. | A | `./install.sh` (copia `claude/hooks/rtk-proxy.mjs`) |
| lint-gate.mjs | Depois que eu crio ou edito um arquivo, roda o verificador de qualidade de código só naquele arquivo — e só avisa, nunca bloqueia. Bloquear travaria o trabalho no skale-insight, que já tem 155 avisos acumulados de antes. | A | `./install.sh` (copia `claude/hooks/lint-gate.mjs`) |
| orchestration-mode.mjs | A cada mensagem minha, ativa no Claude Code o modo "chefe de equipe": ele delega para agentes especialistas em vez de tentar fazer tudo sozinho na mesma conversa. | A | `./install.sh` (copia `claude/hooks/orchestration-mode.mjs`) |
| bootstrap-projeto.mjs | Ao abrir um projeto pela primeira vez, lista o que falta ali (mapa do código, CLAUDE.md, regras, integrações) explicando para que serve cada coisa, e **oferece** criar. Nunca executa sozinho, pergunta uma vez só e nunca mais. | A | `./install.sh` |
| secret-scan.mjs | Antes de gravar qualquer arquivo, recusa a escrita se o conteúdo tiver cara de senha, chave ou token. É o único que bloqueia de verdade — e bloqueia de propósito. | A | `./install.sh` |
| guard-main-branch.mjs | Antes de um commit ou envio direto na branch principal, pede confirmação. Branch de trabalho passa direto. | A | `./install.sh` |
| validate-settings-schema.mjs | Depois de editar um arquivo de configuração do Claude Code, avisa se ele ficou com formato inválido — antes de você descobrir na próxima sessão, quando nada carrega. | A | `./install.sh` |
| large-file-warning.mjs | Avisa quando um arquivo passa de ~350 linhas, sugerindo dividir. Só avisa. | A | `./install.sh` |

---

## Programas de terminal

Categoria B — nenhum cabe no repositório, só a receita de instalar.

| Nome | O que faz | Categoria | Como instalar |
|---|---|---|---|
| claude (Claude Code) | O próprio programa que executa tudo isso — sem ele, nada do resto funciona. Versão 2.1.160 hoje. | B | Instalador oficial da Anthropic (ver claude.com/claude-code) |
| graphify | Mapeia o código do projeto como um mapa de dependências — respondo "o que quebra se eu mudar isso" numa consulta em vez de vasculhar arquivo por arquivo. Versão 0.9.46 hoje. | B | Instalador próprio do graphify (ver documentação da ferramenta) |
| agent-browser | Dá a um agente do Claude Code um navegador de verdade para testar telas e fluxos web como um usuário faria. Versão 0.34.0 hoje. | B | `brew install agent-browser` |
| gh (GitHub CLI) | Abre e gerencia pull request e repositório do GitHub direto do terminal, sem abrir o site. Versão 2.89.0 hoje. | B | `brew install gh` |
| git | Controle de versão — grava o histórico de mudanças de cada projeto. Versão 2.50.1 hoje (vem com o macOS). | B | Já vem com o macOS; `xcode-select --install` se sumir |
| jq | Lê e filtra arquivo JSON no terminal — usado por scripts internos do setup. Versão 1.7.1 hoje. | B | `brew install jq` |
| supabase CLI | Gerencia o banco de dados e as funções de backend dos projetos Supabase (skale-insight, Skale Finance) direto do terminal. Versão 2.84.2 hoje — **desatualizada**, existe 2.115.0. | B | `brew upgrade supabase` |
| rclone | **Não instalado ainda.** Vai copiar o backup do banco Supabase para o Cloudflare R2 (armazenamento externo) — necessário para a fase 3 do projeto de backup. | B | `brew install rclone` |

---

## MCPs

MCP é uma conexão que dá ao Claude Code acesso a um serviço externo (planilha, quadro de tarefas,
navegador, cofre de notas). Cada um exige credencial própria por máquina, por isso nenhum vem no
repositório — só o nome e o comando genérico de registrar cabem aqui.

| Nome | O que faz | Categoria | Como instalar |
|---|---|---|---|
| claude.ai Algrow | Acesso à base de inteligência de canais do YouTube — pesquisa, métricas de crescimento, geração de miniatura e roteiro. | B | `claude mcp add --scope user algrow` (autorizar depois via claude.ai) |
| claude.ai ClickUp | Cria e consulta tarefa, comentário e documento no ClickUp direto da conversa, sem abrir o quadro. | B | `claude mcp add --scope user clickup` (autorizar depois via claude.ai) |
| context7 | Busca a documentação atual de uma biblioteca ou framework antes de eu usar ela — evita eu recomendar uma versão antiga de cabeça. | B | `claude mcp add --scope user context7` |
| chrome-devtools | Controla um Chrome de verdade para inspecionar e testar uma página — rede, console, performance. | B | `claude mcp add --scope user chrome-devtools` |
| obsidian | Lê e escreve nota no cofre de anotações do Eric (`~/ObsidianVault-Skale`) — memória de projeto que vive fora do código. | B | `claude mcp add --scope user obsidian` (aponta para o vault local) |
| claude.ai Google Drive | Leria e escreveria arquivo do Google Drive. **Conectado mas não autorizado hoje** — os comandos deste MCP não funcionam até autorizar. | B | Autorizar em claude.ai → Configurações → Conectores (não dá para autorizar por aqui) |
| plugin:vercel:vercel | Gerenciaria deploy e ambiente de projetos na Vercel direto da conversa. **Conectado mas não autorizado hoje.** | B | `claude mcp` ou `/mcp` numa sessão interativa, para completar o login |

---

## O que o Git não traz de volta

Numa máquina nova, clonar este repositório e rodar `install.sh` copia os arquivos da categoria A —
mas os itens abaixo **não estão em nenhum lugar do Git** e precisam ser refeitos à mão:

- **Login do Claude Code** — a sessão autenticada com a conta da Anthropic.
- **Credenciais dos MCPs** — cada MCP listado acima pede autorização própria (login OAuth ou chave)
  na máquina nova; nenhuma credencial fica salva no repositório.
- **Programas de terminal** — graphify, agent-browser, gh, jq, supabase CLI, rclone: precisam ser
  reinstalados um a um pelos comandos da tabela acima.
- **Vault do Obsidian** (`~/ObsidianVault-Skale`) — as notas de projeto (estrutura PARA: 12 notas em
  01-projetos, 4 em 03-conhecimento, 1 em 04-referencia, mais daily e templates) vivem só no disco
  local, sem backup neste Git.

---

## Pendências conhecidas

- **rclone não instalado** — necessário para a fase 3 do backup do Supabase para o Cloudflare R2.
  `brew install rclone`.
- **supabase CLI desatualizado** — versão 2.84.2 instalada, existe 2.115.0. `brew upgrade supabase`.
- **Google Drive sem autorização** — MCP conectado mas inativo; autorizar em claude.ai → Conectores.
- **Vercel sem autorização** — MCP conectado mas inativo; autorizar via `claude mcp` ou `/mcp`.
- **MCP do ClickUp usado pelas skills do projeto** — falta configurar; é necessário para o fluxo de
  trabalho atual.

---

## Como adicionar uma ferramenta nova

1. **Instalar** a ferramenta (plugin, programa ou MCP) pelo comando próprio dela.
2. **Registrar aqui** — uma linha nova na tabela certa deste MANIFEST, com o comando de instalar e
   uma frase dizendo o que ela entrega em linguagem de produto, no mesmo dia da instalação.
3. **Se for arquivo** (categoria A — skill, hook, agente, CLAUDE.md, settings.json), rodar
   `./backup.sh` para levar o arquivo novo para dentro do repositório.
