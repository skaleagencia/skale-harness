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

Pastas dentro de `~/.claude/skills/`, já versionadas em `claude/skills/` neste repositório (16).
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
| clickup | Mostra a fila de tarefas deste produto no ClickUp — o que está pronto para pegar, em que ordem, e por quê. Não executa nada, não altera nada. | A | `./install.sh` |
| clickup-executar | Executa uma tarefa do ClickUp do início ao fim: lê a especificação nos comentários, implementa, valida e deixa em Homologação. Nunca move para Deploy nem Concluído — quem valida é você. | A | `./install.sh` |
| clickup-fila | Executa a fila inteira, uma tarefa por vez, reportando o resultado entre elas. Para e chama você quando aparece pergunta em aberto. | A | `./install.sh` |
| graphify | Ensina a usar o mapa do código: responder "o que quebra se eu mudar isso" numa consulta, em vez de abrir arquivo por arquivo. | A | `./install.sh` |
| agent-browser | Ensina a usar o navegador automatizado para testar interface de verdade. Pede autorização antes de abrir — a sessão pode estar logada nas suas contas reais. | A | `./install.sh` |

---

## Especialistas

Arquivos em `claude/agents/`, versionados neste repositório (17). Categoria A — o `install.sh`
copia cada `.md` direto para `~/.claude/agents/`, nada para instalar à parte. Cada especialista roda
com um **model** (quanto sabe) e um **effort** (quanto se esforça antes de agir) fixos no próprio
arquivo — a sessão principal só decide qual acionar, nunca refaz o trabalho pesado sozinha.

| Agente | model | effort | Para quê |
|---|---|---|---|
| architect | fable | max | Decisão de arquitetura sem volta fácil — como um produto novo se encaixa no que já existe, ou escolha que vira padrão copiado por meses. Não entra para algo que se desfaz revertendo um commit. |
| security-reviewer | opus | max | Confere se uma mudança abre brecha de segurança — login, permissão, e principalmente se uma empresa consegue ver dado de outra no mesmo banco. Entra antes de qualquer coisa sensível ir para produção. |
| database-architect | opus | xhigh | Desenha a estrutura do banco antes de qualquer migração ser escrita — como as tabelas se relacionam, onde entra chave, índice ou a proteção de dado por empresa. |
| migration-specialist | opus | xhigh | Escreve a migração de banco em si — criar ou alterar tabela, política de proteção por empresa, função, gatilho. Trata toda migração como sem volta, porque os bancos de produção ainda não têm backup. |
| backend-specialist | opus | high | Regra de negócio e integração — como o dado flui entre serviços, cálculo financeiro, sincronização com Google Ads, Meta Ads ou planilha, e o que fazer quando algo falha no meio do caminho. |
| debugger | opus | high | Investiga a causa real de um bug ou falha que só acontece às vezes, antes de qualquer conserto — nunca cala o sintoma. |
| devops-engineer | opus | high | Publica em produção, configura automação de deploy, investiga um problema que já está no ar. |
| code-reviewer | opus | xhigh | Revisão geral de código pronto — bug, tratamento de erro, teste faltando — e agora também a lente de React (hooks, renderização) e de tipagem/assincronismo, que antes eram de dois revisores à parte. |
| code-archaeologist | sonnet | high | Investiga um trecho de código antigo e sem explicação para entender por que ele existe, antes de alguém mexer nele. |
| code-explorer | sonnet | high | Lê e interpreta uma parte do sistema pouco conhecida — o que depende do quê, o que quebra se mudar — para embasar uma decisão de planejamento. |
| frontend-specialist | sonnet | high | Tela, componente ou fluxo de interface que exige decisão de composição ou experiência de uso — não ajuste pontual de cor ou texto. |
| performance-optimizer | sonnet | high | Resolve lentidão já medida — tela lenta, consulta cara, função devagar. Nunca otimiza no chute. |
| documentation-writer | sonnet | medium | Escreve documentação nova e substancial — README, guia de uso, runbook — quando é preciso decidir o que vale a pena explicar, não só copiar. |
| react-build-resolver | sonnet | medium | Conserta build quebrado de React/Next.js — erro de compilação, configuração do empacotador, tela que não bate entre servidor e navegador. |
| test-writer | sonnet | medium | Escreve teste para uma função ou fluxo novo, ou para um buraco de cobertura que um bug revelou. |
| doc-updater | haiku | (sem effort — haiku não suporta) | Atualização mecânica de documentação — sincronizar um texto com o que já mudou no código, sem decisão nova envolvida. |
| explorer | haiku | (sem effort) | Só localiza — onde fica um arquivo, quem chama uma função, todo uso de algo. Não interpreta, não decide. |

**Duas revisões foram aposentadas em 2026-08-20**: `react-reviewer` e `typescript-reviewer`. O
conteúdo dos dois foi absorvido pelo `code-reviewer`, que subiu para opus/xhigh — um revisor forte
cobrindo as duas lentes é mais fácil de manter do que três prompts separados, que envelhecem
desalinhados entre si.

1. **O critério do tier não é a categoria da tarefa.** "Código = sonnet, documentação = haiku" erra:
   um documento de arquitetura pode exigir opus, e um "código" que só renomeia um campo roda em
   haiku. O que decide é se a tarefa exige **julgamento** ou é **mecânica**.
2. **`max` só pode ser declarado no arquivo do agente** — o arquivo de configuração da sessão
   (`settings.json`) aceita no máximo `xhigh`. São dois lugares com regras diferentes, de propósito:
   `max` não foi feito para ser o padrão do dia inteiro.
3. **Duas variáveis de ambiente anulam tudo em silêncio:** `CLAUDE_CODE_SUBAGENT_MODEL` e
   `CLAUDE_CODE_EFFORT_LEVEL`. Se qualquer uma estiver preenchida, o roteamento é ignorado sem dar
   erro — a de effort vence até o arquivo do agente.

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
| claude (Claude Code) | O próprio programa que executa tudo isso — sem ele, nada do resto funciona. Versão 2.1.237 hoje. | B | Instalador oficial da Anthropic (ver claude.com/claude-code) |
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
| claude.ai Algrow | Acesso à base de inteligência de canais do YouTube — pesquisa, métricas de crescimento, geração de miniatura e roteiro. | B | Conector de CONTA: liga nas configurações do claude.ai. Em máquina nova, vem junto com o login — não use `claude mcp add`. |
| claude.ai ClickUp | Cria e consulta tarefa, comentário e documento no ClickUp direto da conversa, sem abrir o quadro. É por ele que as skills `/clickup*` funcionam. | B | Conector de CONTA: liga nas configurações do claude.ai. Em máquina nova, vem junto com o login — não use `claude mcp add`. |
| context7 | Busca a documentação atual de uma biblioteca ou framework antes de eu usar ela — evita eu recomendar uma versão antiga de cabeça. | B | `claude mcp add --scope user context7` |
| chrome-devtools | Controla um Chrome de verdade para inspecionar e testar uma página — rede, console, performance. | B | `claude mcp add --scope user chrome-devtools` |
| obsidian | Lê e escreve nota no cofre de anotações do Eric (`~/ObsidianVault-Skale`) — memória de projeto que vive fora do código. | B | `claude mcp add --scope user obsidian` (aponta para o vault local) |
| claude.ai Google Drive | Leria e escreveria arquivo do Google Drive. **Conectado mas não autorizado hoje** — os comandos deste MCP não funcionam até autorizar. | B | Autorizar em claude.ai → Configurações → Conectores (não dá para autorizar por aqui) |
| plugin:vercel:vercel | Gerenciaria deploy e ambiente de projetos na Vercel direto da conversa. **Conectado mas não autorizado hoje.** | B | `claude mcp` ou `/mcp` numa sessão interativa, para completar o login |

---

---

## Templates

Modelos prontos para reaproveitar entre projetos. Não são instalados em lugar nenhum — ficam aqui
até alguém decidir aplicar num projeto.

| Nome | O que faz | Categoria | Como usar |
|---|---|---|---|
| [backup-supabase](../templates/backup-supabase/) | Rotina diária que copia o banco do Supabase para fora dele, criptografada, guardada no Cloudflare R2. Existe porque o plano Free não faz backup nenhum, o Pro guarda só 7 dias, e arquivo de Storage não é coberto em plano nenhum. | A | copiar para o projeto e cadastrar os secrets — ver o [README do template](../templates/backup-supabase/README.md) |

> **Dois tipos de MCP, e a diferença importa em máquina nova.** Os que começam com `claude.ai` são
> **conectores da conta**: a credencial mora na sua conta do claude.ai, e o Claude Code os enxerga
> através do login. Fazer login numa máquina nova já traz todos eles — `claude mcp add` não é o
> caminho e não funciona para esses. Os demais rodam **nesta máquina**, com credencial local, e aí
> sim precisam do comando da coluna ao lado.

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
