# skale-harness

**Sumário**

1. [O que é este repositório](#o-que-é-este-repositório)
2. [O problema que resolve](#o-problema-que-resolve)
3. [Instalação](#instalação)
4. [O harness invisível](#o-harness-invisível)
5. [Ferramentas instaladas](#ferramentas-instaladas)
6. [Roteamento de modelos](#roteamento-de-modelos)
7. [Permissões e modo permissivo](#permissões-e-modo-permissivo)
8. [Automação ClickUp](#automação-clickup)
9. [Backup do Supabase](#backup-do-supabase)
10. [Obsidian](#obsidian)
11. [Global × por projeto](#global--por-projeto)
12. [Glossário](#glossário)
13. [Ressalvas honestas](#ressalvas-honestas)
14. [Documentação completa](#documentação-completa)

---

## 1. O que é este repositório

`skale-harness` guarda, num lugar só e versionado, toda a configuração do Claude Code que os
quatro produtos da Skale compartilham: as regras que ele segue (`claude/CLAUDE.md`), os
especialistas que ele aciona, os atalhos prontos (skills) e as automações que rodam sozinhas
(hooks). Não é um produto — é o kit de ferramentas que todo projeto herda ao ser aberto. Dois
scripts movem essa configuração nos dois sentidos: `install.sh` leva do repositório para a
máquina, `backup.sh` traz da máquina de volta para o repositório.

---

## 2. O problema que resolve

Antes deste repositório, a configuração do Claude Code morava só em `~/.claude/`, direto na
máquina — sem histórico, sem cópia, sem meio de levar para outro computador. Um comando errado (ou
um "apaga e recomeça que é mais rápido") sumia com dias de ajuste sem deixar rastro nenhum do que
existia antes.

| | Antes | Depois |
|---|---|---|
| Mudar uma regra global | Editar `~/.claude/CLAUDE.md` direto, sem registro de quando ou por quê | Um commit no `skale-harness`, com data, mensagem e o diff exato |
| Máquina nova | Reconfigurar tudo à mão, tentando lembrar o que existia na antiga | `git clone` + `./install.sh` — os arquivos voltam sozinhos |
| Um hook novo aparece do nada num projeto | Sem jeito de saber se foi intencional ou sobra de teste de outra sessão | `./backup.sh --diferencas` mostra exatamente o que mudou de cada lado, sem copiar nada |
| Perder um ajuste sem querer | Sem cópia nenhuma — o ajuste simplesmente deixava de existir | `./install.sh --rollback` volta ao estado de antes da última instalação |

---

## 3. Instalação

```bash
git clone [skale-harness] && cd skale-harness
./install.sh
```

O `install.sh` faz, nesta ordem: guarda um backup do `~/.claude/` atual (para o `--rollback`),
copia `CLAUDE.md`, `settings.json`, `agents/`, `skills/`, `hooks/` e `commands/` para lá, instala
os plugins que estão marcados como habilitados no `settings.json` versionado, e por fim confere o
que a máquina ainda não tem (login do Claude Code, `graphify`, `agent-browser`, os MCPs, o vault do
Obsidian, e se alguma das duas variáveis de ambiente perigosas está preenchida) — mostrando na tela
o comando para resolver cada item que faltar.

> **Rode o `install.sh` com o Claude Code FECHADO.** Ele mantém a configuração em memória e
> regrava o `settings.json` inteiro a cada aprovação que você dá durante uma sessão. Instalar com
> uma sessão aberta é ver a mudança sumir minutos depois, sem aviso — já aconteceu duas vezes
> durante a construção deste repositório. A ordem certa é: fechar o Claude Code → `./install.sh` →
> abrir de novo.

Outros comandos úteis:

```bash
./install.sh --check        # só verifica o que falta, não escreve nada
./install.sh --rollback     # volta para o estado de antes da última instalação
```

Se você mexeu direto em `~/.claude/` (por exemplo, aprovou um hook novo durante uma sessão em
outro projeto), rode `./backup.sh` para trazer essa mudança para o repositório. Na dúvida sobre
qual lado — máquina ou repositório — está mais atualizado, sem querer copiar nada ainda:

```bash
./backup.sh --diferencas    # mostra o que mudou de cada lado, sem copiar nada
```

O sinal `+` significa "apareceu na máquina e ainda não está versionado aqui"; `-` significa "está
aqui e falta na máquina"; `~` significa "os dois têm, com conteúdo diferente — olhe qual é o mais
novo antes de escolher um lado".

---

## 4. O harness invisível

**O princípio:** você escreve o mesmo pedido que escreveria antes de existir qualquer ferramenta.
Quem decide o que usar é o Claude. Se você precisar lembrar que este harness existe para conseguir
o resultado, ele falhou.

Pense em tomada elétrica, não em interruptor geral: a casa tem tomada em todo cômodo, mas ninguém
deixa liquidificador, aspirador e chuveiro ligados ao mesmo tempo por precaução. As ferramentas
abaixo estão todas disponíveis; só entram quando a situação pede. Carregar tudo sempre enche o
contexto (a "memória de trabalho" da conversa), deixa mais lento e atrapalha o raciocínio.

| A situação | O que entra |
|---|---|
| Pedido vago, sem escopo claro | `brainstorm-para-plano` — vira plano antes de codar a primeira interpretação |
| Plano aprovado com 3+ partes independentes | `ondas-paralelas` — especialistas em paralelo, sem colidir |
| Qualquer código sendo escrito | `ponytail` (YAGNI — não construir o que ninguém pediu ainda) — sempre ativo, não é opcional |
| **Qualquer trabalho visual** | **`impeccable` + `ui-ux-pro-max`** — ver a regra reforçada abaixo |
| Antes de commit, merge ou produção | `revisao-multi-agente` |
| "O que quebra se eu mudar X" | `graphify query` |
| Biblioteca externa envolvida | `context7` — nunca confiar na memória do modelo sobre versão de API |
| Projeto sem lint, ou configuração velha | `configurar-lint` |
| Pilha de avisos acumulada | `zerar-avisos-lint` |
| Fim de fase, entrega grande | `limpar-projeto` |
| Projeto novo | `aia-harness:init` + `memoria-do-projeto` |
| Documentar decisão ou aprendizado | Obsidian (via MCP) |
| Tarefa de desenvolvimento | ClickUp (via MCP) |
| Teste de interface | `agent-browser` — **pedir autorização antes** |
| Performance, rede, console do navegador | `chrome-devtools` — **pedir autorização antes** |

**Quando não plugar nada.** Pedido simples e direto ("renomeia essa variável", "o que faz esse
arquivo") se responde direto. Acionar uma ferramenta numa tarefa trivial é ligar o aspirador para
tirar uma migalha.

**Regra reforçada do `impeccable`.** Todo produto da Skale tem interface e vai para cliente
pagante. Design com cara de modelo pronto ou "feito por IA" é problema comercial, não estético. Por
isso o `impeccable` entra **sempre** que houver trabalho visual — tela, componente, landing page,
identidade, cor, tipografia — sem precisar pedir.

**Transparência.** Ao acionar uma ferramenta, o Claude diz em uma linha o que está usando e por
quê. Ao delegar para um especialista, diz qual, com qual **model** (seção 6) e qual **effort** —
é como se percebe se algo rodou no nível errado.

---

## 5. Ferramentas instaladas

Visão de conjunto do que está instalado hoje. O catálogo completo — com o comando exato para
reinstalar cada item numa máquina nova — é o [claude/MANIFEST.md](claude/MANIFEST.md); aqui é só
"o que é isso e por que ligar".

### Plugins (17 habilitados)

Baixados de um marketplace — uma espécie de loja de plugins que o Claude Code consulta.

| Nome | O que faz | Quando usar | Sem ele |
|---|---|---|---|
| aia-harness | Monta e mantém a configuração de um projeto inteiro (memória, agentes, hooks) | Projeto novo, ou auditoria de um harness existente | Cada peça do setup de um projeto é montada na mão, uma a uma |
| caveman | Respostas de código diretas e curtas, sem enrolação | Revisão rápida, comentário de commit, comando de compressão | Respostas mais longas que o necessário para o mesmo conteúdo |
| claude-academy-guide | Guia de referência sobre o próprio Claude Code | Dúvida sobre hook, comando, MCP do Claude Code em si | Precisaria pesquisar a documentação oficial por fora |
| claude-code-setup | Analisa um projeto e recomenda automações | Ao configurar o Claude Code num projeto pela primeira vez | As automações a montar são escolhidas no chute |
| claude-md-management | Audita e atualiza o arquivo de instruções de um projeto | Suspeita de que o CLAUDE.md do projeto está desatualizado | Regra velha continua valendo sem ninguém notar |
| code-review | Revisa um pull request inteiro | Antes de aprovar um PR | Revisão manual, sem checklist automático |
| commit-commands | Atalhos para commit, push e abertura de PR | Ao fechar uma mudança pronta | Descrever o processo de novo a cada vez |
| discernment-nudge | Lembra de confirmar antes de agir num pedido ambíguo | Sempre ativo, ajuda em qualquer pedido vago | Risco de agir sobre a primeira interpretação, que pode estar errada |
| document-skills | Cria e edita Word, Excel, PowerPoint e PDF | Gerar ou editar um arquivo de escritório | Precisaria de outro programa aberto para o mesmo resultado |
| example-skills | Pacote de exemplos prontos (marca, arte, comunicação) | Referência ou ponto de partida para algo fora do dia a dia | Começar do zero num tipo de tarefa pouco comum |
| feature-dev | Guia o desenvolvimento de uma funcionalidade do início ao fim | Construir uma feature nova, entendendo o código existente antes | Risco de programar por cima do que já existe sem entender |
| hookify | Cria automações a partir de "sempre que X, faça Y" | Quer uma automação nova sem escrever o hook na mão | Escrever o script de automação do zero |
| ponytail | Mantém o código enxuto — questiona antes de construir o que não foi pedido | Sempre que há código sendo escrito | Risco de sobre-engenharia: abstração e configuração que ninguém pediu |
| pr-review-toolkit | Kit de revisores especializados (teste, erro silencioso, design de tipo) | Revisão de PR sob mais de um ângulo | Uma passada de revisão só, sem essas lentes específicas |
| superpowers | Coleção de métodos de trabalho (planejar antes, depurar sistematicamente) | Tarefa que se beneficia de processo, não de atalho | Risco de pular direto para a solução sem checar a causa |
| ui-ux-pro-max | Kit de design de interface — marca, sistema de design, apresentação | Telas e materiais visuais, junto com `impeccable` | Design mais genérico, sem a régua de consistência visual |
| vercel | Conecta o Claude Code à Vercel — deploy, variáveis de ambiente, Next.js | Projeto hospedado na Vercel | Operações feitas manualmente no painel da Vercel |

Instalado mas **não** habilitado no perfil global hoje: `watch@claude-video` (fica de fora até ser
ligado de propósito).

### Skills (16)

Procedimentos que o Claude já sabe seguir — pastas em `claude/skills/`.

| Nome | O que faz | Quando usar | Sem ela |
|---|---|---|---|
| [agent-browser](claude/skills/agent-browser) | Automação de navegador de verdade, para testar tela e fluxo | Teste de interface — **pede autorização antes**, é sessão logada de verdade | Interface testada só de olho, sem confirmar o comportamento real |
| [brainstorm-para-plano](claude/skills/brainstorm-para-plano) | Transforma pedido vago em plano executável | Pedido que admite mais de uma interpretação razoável | Risco de construir a primeira leitura errada do pedido |
| [clickup](claude/skills/clickup) | Mostra a fila de tarefas prontas no ClickUp, sem mexer em nada | Ver o que tem para fazer antes de decidir o que rodar | Teria que abrir o ClickUp e ler a fila manualmente |
| [clickup-executar](claude/skills/clickup-executar) | Executa uma tarefa específica do ClickUp do início ao fim | Tarefa pontual, com id ou link | Ciclo de implementação inteiro guiado à mão, passo a passo |
| [clickup-fila](claude/skills/clickup-fila) | Executa a fila inteira de tarefas prontas, uma a uma | Processar várias tarefas prontas em sequência | Rodar `clickup-executar` várias vezes, uma por uma, manualmente |
| [configurar-lint](claude/skills/configurar-lint) | Monta as regras de qualidade de código do zero | Projeto sem lint, ou com configuração velha | Padrão de código inconsistente, sem nada que avise cedo |
| [design-pro](claude/skills/design-pro) | Direção visual completa — cor, tipografia, hierarquia, acessibilidade | Junto do `impeccable`, em qualquer trabalho visual | Decisão visual tomada sem critério de design definido |
| [frontend-design](claude/skills/frontend-design) | Ajuda a escolher direção visual que não pareça modelo genérico | Ao criar ou redesenhar uma tela | Risco de tela com "cara de feito por IA" |
| [graphify](claude/skills/graphify) | Consulta o mapa de dependências do código já mapeado | Pergunta sobre arquitetura, relação entre arquivos, "o que quebra se eu mudar X" | Resposta baseada em vasculhar arquivo por arquivo |
| [impeccable](claude/skills/impeccable) | Design de produto completo — crítica, polimento, sistema de design | Sempre que houver trabalho visual, sem precisar pedir | Interface mais fraca — problema comercial, não só estético |
| [limpar-projeto](claude/skills/limpar-projeto) | Faxina medida — código morto, anotação esquecida, dependência sem uso | Fim de fase ou entrega grande | Lixo de código acumulando sem ninguém notar |
| [memoria-do-projeto](claude/skills/memoria-do-projeto) | Monta o sistema de memória entre sessões de um projeto | Início de projeto novo, ou adoção de memória num existente | Cada sessão reaprende o projeto do zero |
| [ondas-paralelas](claude/skills/ondas-paralelas) | Distribui tarefas independentes entre agentes em paralelo | Plano aprovado com 3 ou mais partes que não se cruzam | Tarefas independentes executadas uma atrás da outra, mais devagar |
| [revisao-multi-agente](claude/skills/revisao-multi-agente) | Revisão em paralelo, cada revisor com uma lente diferente | Antes de commit grande, merge, ou produção | Uma única passada de revisão, sem os ângulos cruzados |
| [theme-factory](claude/skills/theme-factory) | Aplica um visual pronto (cor, fonte) a apresentação ou relatório | Material gerado que precisa de identidade visual rápida | Visual sem tema, ou tema montado do zero a cada vez |
| [zerar-avisos-lint](claude/skills/zerar-avisos-lint) | Zera avisos de lint acumulados, em lotes controlados | Pilha de avisos antigos, projeto que já tem lint configurado | Avisos acumulando até virar ruído que ninguém mais lê |

### Hooks (15)

Programas curtos que reagem sozinhos a um momento fixo — não são chamados por você. Todos ficam em
`claude/hooks/`.

| Nome | O que faz | Quando dispara | Sem ele |
|---|---|---|---|
| registrar-comandos.mjs | Grava todo comando de terminal executado, com data, pasta e projeto | Sempre, antes de qualquer comando | Nenhum rastro do que rodou, para reconstruir depois |
| avisar-destrutivo.mjs | Escreve na tela o que se perde ao rodar um comando destrutivo | Antes de comando tipo `rm -rf`, `git reset --hard` | O comando roda sem ninguém ter visto o aviso |
| checkpoint-automatico.mjs | Guarda um ponto de retorno (`git stash`) antes de operação irreversível | Antes de `git reset --hard`, `rebase`, `supabase db push`/`reset`, etc. | Comando destrutivo roda sem rede de segurança nenhuma por trás |
| avisar-sql-nao-idempotente.mjs | Avisa se um `.sql` editado pode quebrar ao rodar mais de uma vez | Depois de criar/editar um arquivo `.sql` | Migração que só funciona na primeira execução passa despercebida |
| secret-scan.mjs | Recusa gravar um arquivo com cara de senha, chave ou token | Antes de qualquer escrita de arquivo | Segredo entraria no repositório sem barreira nenhuma |
| guard-main-branch.mjs | Pede confirmação antes de commit ou push direto na branch principal | Ao commitar/dar push estando na branch principal | Mudança vai direto para a branch principal sem esse alerta |
| bootstrap-projeto.mjs | Ao abrir um projeto, lista o que falta da configuração e oferece criar | Uma vez por projeto, na primeira sessão | Peça de configuração faltando só é percebida quando dá problema |
| lint-gate.mjs | Roda o verificador de qualidade só no arquivo que acabou de mudar | Depois de criar ou editar um arquivo | Erro de lint só aparece na próxima rodada manual |
| format-on-edit.mjs | Formata o arquivo recém-editado, se o projeto já tem `biome`/`prettier` | Depois de criar ou editar um arquivo | Arquivo fica com a formatação que o agente escolheu na hora, fora do padrão do projeto |
| orchestration-mode.mjs | Ativa o modo "delega para especialista" em vez de fazer tudo na mesma conversa | A cada mensagem | Trabalho pesado tentado na sessão principal, sem o roteamento da seção 6 |
| validate-settings-schema.mjs | Avisa se um arquivo de configuração ficou com formato inválido | Depois de editar um arquivo de configuração do Claude Code | Erro só aparece na próxima sessão, quando nada carrega |
| large-file-warning.mjs | Avisa quando um arquivo passa de ~350 linhas | Ao escrever um arquivo grande | Arquivo cresce sem ninguém sugerir dividir |
| gh-scope-guard.mjs | Mostra o comando certo quando o `gh` falha por permissão faltando | Depois de um comando `gh` que falha por escopo OAuth | Risco de contornar com um token novo em vez de ajustar a credencial já logada |
| graphify-orient.mjs | Lembra de consultar o mapa do código antes de vasculhar arquivo por arquivo | Antes de `Bash`/`Read`/`Glob`, se o mapa já existe | Busca às cegas por algo que o mapa já responderia de cara |
| rtk-proxy.mjs | Resume o resultado de um comando de leitura para gastar menos tokens | Antes de um comando de leitura no terminal | Conversa consome mais tokens do que precisaria para o mesmo resultado |

### MCPs conectados

MCP é a ponte entre o Claude e um serviço de fora — cada um pede login ou chave própria por
máquina, por isso nenhum vem dentro do repositório.

| Nome | O que faz | Quando usar | Sem ele |
|---|---|---|---|
| claude.ai ClickUp | Cria e consulta tarefa, comentário e status no ClickUp | Toda a automação da seção 8 | As três skills de ClickUp não funcionam |
| obsidian | Lê e escreve nota no vault (`~/ObsidianVault-Skale`) | Registrar decisão ou aprendizado (seção 10) | Conhecimento de projeto sem lugar fixo para viver |
| context7 | Busca documentação atual de uma biblioteca antes de usá-la | Qualquer biblioteca externa envolvida | Risco de recomendar versão de API desatualizada, de memória |
| claude.ai Algrow | Inteligência de canal do YouTube — métricas, miniatura, roteiro | Trabalho ligado a canal/vídeo do YouTube | Sem acesso a essa base fora da conversa |
| claude.ai Google Drive | Leria e escreveria arquivo do Google Drive | — | **Conectado mas não autorizado hoje** — não funciona até autorizar em claude.ai → Conectores |
| plugin:vercel:vercel | Gerenciaria deploy e ambiente de projeto Vercel pela conversa | — | **Conectado mas não autorizado hoje** — completar login via `claude mcp` ou `/mcp` |

`chrome-devtools` também está conectado (controla um Chrome de verdade) — sempre **pede
autorização antes**, os detalhes estão na seção 7.

### Programas de terminal

| Nome | O que faz | Situação hoje |
|---|---|---|
| Claude Code | O programa que executa tudo isso | v2.1.237 — ver ressalva na seção 13 |
| graphify | Mapeia o código como grafo de dependências | v0.9.46 |
| agent-browser | Dá a um agente um navegador de verdade para testar | v0.34.0 |
| gh (GitHub CLI) | Abre e gerencia PR/repositório sem o site | v2.89.0 |
| supabase CLI | Gerencia banco e funções de backend dos projetos Supabase | v2.84.2 — **desatualizada**, existe v2.115.0 |
| rclone | Copiaria o backup do banco para o Cloudflare R2 | **Não instalado ainda** — necessário para a fase 3 do backup (seção 9) |
| jq / git | Ferramentas de base do sistema | Já vêm com o macOS |

---

## 6. Roteamento de modelos

Cada especialista roda com um **model** (quanto ele sabe) e um **effort** (quanto ele se esforça
antes de agir) fixados no seu próprio arquivo — a sessão principal roda em `xhigh` por padrão e faz
só o roteamento e a delegação; o trabalho pesado vai para os especialistas.

| Especialista | model | effort | Para quê |
|---|---|---|---|
| `architect` | fable | max | Decisões de arquitetura que não têm volta fácil |
| `security-reviewer` | opus | max | RLS (isolamento de dado por empresa), OWASP, autenticação |
| `database-architect` | opus | xhigh | Desenho do banco antes da migração — tabela, chave, índice, fronteira de RLS |
| `migration-specialist` | opus | xhigh | Qualquer migração de banco |
| `backend-specialist` | opus | high | Lógica de negócio, endpoint de API, edge function |
| `debugger` | opus | high | Causa raiz de bug e comportamento instável |
| `devops-engineer` | opus | high | Deploy, CI/CD, operação em produção |
| `code-reviewer` | opus | xhigh | Revisão geral de código — agora também as lentes de React e de tipagem |
| `code-archaeologist` | sonnet | high | Entender código legado sem documentação |
| `code-explorer` | sonnet | high | Ler e **interpretar** arquitetura antes de decidir |
| `frontend-specialist` | sonnet | high | Componente de UI, tela, fluxo de interface |
| `performance-optimizer` | sonnet | high | Gargalo de performance, query lenta, Core Web Vitals |
| `documentation-writer` | sonnet | medium | Documentação nova e substancial |
| `react-build-resolver` | sonnet | medium | Build de React quebrado (Vite, Next, bundler) |
| `test-writer` | sonnet | medium | Escrever e manter testes |
| `doc-updater` | haiku | — | Documentação trivial, sincronizar texto |
| `explorer` | haiku | — | **Localizar**: buscar, listar, grep — não interpreta |

`explorer` e `code-explorer` não são a mesma coisa: o primeiro **acha** (mecânico, barato); o
segundo **entende** (julgamento, mais caro). Pedir para achar um arquivo não precisa do segundo.

**Por que um revisor geral forte em vez de três revisores em sonnet.** Até 2026-08-20 existiam
`react-reviewer` e `typescript-reviewer`, cada um cobrindo uma lente à parte. Os dois foram
aposentados: o conteúdo virou parte do `code-reviewer`, que subiu de sonnet/medium para opus/xhigh.
Um revisor forte cobrindo as lentes de React e de TypeScript junto é mais fácil de manter do que
três prompts separados — três prompts envelhecem desalinhados entre si, um evolui e os outros dois
ficam para trás sem ninguém notar.

**`security-reviewer` é o único em `max`.** Ele entra raramente — só quando a mudança toca
autenticação, permissão, RLS ou dado de cliente — e a falha que ele existe para evitar (uma empresa
lendo o dado de outra, no mesmo banco) é a mais cara possível. `max` custa mais para rodar; vale a
pena porque a chance de precisar dele é baixa e o custo de errar é alto.

**O critério do tier não é a categoria da tarefa.** "Código = sonnet, documentação = haiku" erra:
um documento de arquitetura pode exigir opus, e um "código" que só renomeia um campo roda em
haiku. O que decide é se a tarefa exige **julgamento** ou é **mecânica**. Na dúvida entre dois
tiers, o padrão é subir um — um modelo fraco numa tarefa que exige raciocínio produz um resultado
inútil, e aí se paga duas vezes, porque refaz.

### Três coisas diferentes

| | O que controla | Onde se define |
|---|---|---|
| **Model** | Quanto o especialista **sabe** | Frontmatter do agente (o bloco de configuração no topo do arquivo `.md`) |
| **Effort** | Quanto ele **se esforça** antes de agir | Frontmatter do agente |
| **Ultracode** | **Quantos** rodam ao mesmo tempo | Só na sessão, ligado à mão |

`ultracode` dispara até 16 especialistas simultâneos — multiplica a quantidade, enquanto o
roteamento de model/effort economiza por unidade. Liga-se só quando a tarefa tem partes de verdade
independentes; ligar por hábito é contratar 20 pessoas para trocar uma lâmpada.

### O aviso mais importante desta seção

**Duas variáveis de ambiente anulam todo esse roteamento em silêncio:** `CLAUDE_CODE_SUBAGENT_MODEL`
e `CLAUDE_CODE_EFFORT_LEVEL`. Se qualquer uma estiver preenchida, o model ou o effort configurado em
cada especialista é ignorado — sem erro, sem aviso na tela. A precedência é: variável de ambiente
> frontmatter do agente > sessão. Se um roteamento parecer não fazer efeito, a primeira coisa a
checar são essas duas variáveis — inclusive dentro do `settings.json` de cada projeto, não só no
shell. O `./install.sh --check` já confere as duas automaticamente.

---

## 7. Permissões e modo permissivo

As permissões do dia a dia moram em [claude/permissoes.json](claude/permissoes.json), escrito para
ser lido — cada bloco vem com o porquê ao lado. A ordem de avaliação do Claude Code é fixa: **`deny`
vence `ask`, que vence `allow`** — sempre, em qualquer projeto, e não depende de qual regra é mais
específica.

Este setup roda **liberado**. O Claude Code executa qualquer comando de terminal, cria e apaga
qualquer arquivo, acessa a web e usa as integrações (ClickUp, Obsidian) **sem pedir aprovação** —
incluindo comando destrutivo: `rm -rf`, `git reset --hard`, `git push`, `supabase db push`.

**Duas exceções**, e só elas, continuam perguntando:

| O quê | Por quê |
|---|---|
| `agent-browser` | Clica em interface de verdade, numa sessão logada nas contas reais de Supabase, ClickUp, Google Cloud e banco |
| `chrome-devtools` | Abre navegador nas mesmas contas |

O motivo de serem essas duas: é o único tipo de dano que nenhuma das mitigações abaixo consegue
desfazer. Um comando errado no terminal deixa rastro e tem ponto de retorno; um clique errado numa
tela de produção, não.

A lista `deny` está **vazia** de propósito. Nada é bloqueado por ela.

### O que existe no lugar da aprovação

Três hooks, que **registram e revertem** — nenhum deles bloqueia ou pergunta (descrição completa
na seção 5, tabela de hooks):

- `registrar-comandos.mjs` grava todo comando em `~/.claude/logs/comandos.jsonl`, mascarando valor
  com cara de credencial antes de gravar.
- `avisar-destrutivo.mjs` mostra na tela o que se perde ao rodar um comando destrutivo, sem
  bloquear.
- `checkpoint-automatico.mjs` guarda um ponto de retorno antes de operação que reescreve histórico
  do Git ou toca o banco.

Os três **falham abertos**: se algum quebrar, sai calado e o comando roda normalmente. Um hook que
travasse a sessão seria o único jeito de este setup atrapalhar de verdade.

**Onde fica o log:**

```bash
tail -50 ~/.claude/logs/comandos.jsonl | jq -r '"\(.data)  \(.projeto)  \(.comando)"'
```

**Como voltar de um checkpoint:**

```bash
git stash list                    # os pontos de retorno, do mais recente para o mais antigo
git stash apply stash@{0}         # traz o estado de volta sem apagar o ponto
```

### Como adicionar ou tirar uma exceção

1. Edite [claude/permissoes.json](claude/permissoes.json) — **passar a perguntar por algo**:
   acrescente o padrão em `ask` (vence `allow` sempre, não precisa mexer nele). **Bloquear de vez**:
   acrescente em `deny`. **MCP novo**: precisa ser nomeado em `allow` (`mcp__nome-do-servidor`) —
   não existe curinga que pegue todos.
2. Rode `./scripts/aplicar-permissoes.sh` — atualiza o `settings.json` daqui.
3. Rode `./install.sh` — leva para a máquina, com o Claude Code **fechado**.

### Duas proteções que continuam de pé

Não são aprovações, e não foram removidas:

- **`secret-scan.mjs` recusa gravar** um arquivo cujo conteúdo tenha cara de senha, chave ou token
  — é o único hook que barra alguma coisa, porque "nunca commitar segredo" é regra inviolável.
- **Caminhos críticos** — `.git`, `.claude`, `.zshrc`, `.npmrc`, `.mcp.json` — continuam pedindo
  confirmação para escrita, porque o modo escolhido é `default`, não `bypassPermissions`. No dia a
  dia o efeito é igual; a diferença só aparece nesses caminhos.

---

## 8. Automação ClickUp

**Fluxo:** alguém cria solicitação no ClickUp → automação distribui para a lista certa → o
Autopilot Agent do ClickUp lê o Mapa do Repositório e refina (descrição estruturada, campos
preenchidos, comentário com o prompt pronto) → Eric confere e move de Backlog para Próximo → no
Claude Code, dentro do repositório do produto, roda `/clickup-fila` → a skill puxa as tarefas em
Próximo, executa por ordem de prioridade → move para Homologação e **PARA** → Eric valida, move
para Deploy e Concluído.

**A divisão:** o ClickUp decide **O QUE** fazer. O Claude Code decide **COMO** fazer. Eric decide
**SE ESTÁ CERTO**.

### As 7 regras

1. **Para em Homologação, nunca move para Deploy ou Concluído** — testar que a tela funciona não
   prova que é o que Eric queria.
2. **Só executa o que está em "próximo"** — backlog nunca entra sozinho.
3. **Ordem por prioridade**: Urgente, Alta, Normal, Baixa, empate pela mais antiga — e bug urgente
   na frente de feature urgente, por causa do SLA de mesmo dia.
4. **Limite de 3 tentativas no teste**, senão vira corrige-testa-corrige queimando tokens sem sair
   do lugar.
5. **Pergunta em aberto trava e chama** — nunca decide sozinho.
6. **Sem critério de aceite, recusa e comenta** o que falta.
7. **Identifica o produto pelo campo "produto:" no CLAUDE.md do projeto**, perguntando uma vez e
   gravando a resposta.

### As 3 skills

| Skill | O que faz |
|---|---|
| `/clickup` | Mostra a fila sem executar nada |
| `/clickup-executar [id]` | Executa uma tarefa específica |
| `/clickup-fila` | Executa a fila inteira, uma por vez, reportando entre elas |

### Estrutura real do ClickUp, verificada

Espaço **Tecnologia** → Pasta **Desenvolvimento** → listas **Backlog & Roadmap** e **Bugs &
Suporte**. Os status são **minúsculos** (`backlog`, `próximo`, `em desenvolvimento`, `homologação`,
`deploy`, `concluído`). O campo chama-se **"Item"**, sem acento. As opções do campo **"Projeto"**
**não** correspondem aos quatro produtos Skale — o filtro de produto usa sempre o campo
**"Produto"**.

> Estas três skills ainda **não** foram testadas ponta a ponta contra o ClickUp real — volta a
> aparecer na seção 13.

---

## 9. Backup do Supabase

O Supabase não protege o dado do jeito que se imagina: no plano **Free** não existe backup nenhum;
no **Pro**, guarda só os **últimos 7 dias**, numa janela que anda — o dia 8 empurra o dia 1 para
fora; e **arquivos do Storage (foto, PDF, anexo) não têm backup em nenhum plano**, nem no
Enterprise.

**Como funciona:** uma rotina diária pelo GitHub Actions (um agendador de tarefas que já vem com o
GitHub) gera três dumps do banco — `roles.sql`, `schema.sql` e `data.sql`, porque um dump "padrão"
sozinho não traz nem os dados nem os usuários customizados — criptografa cada um antes de subir, e
guarda no Cloudflare R2 (armazenamento em nuvem com **egresso zero**: baixar de volta nunca é
cobrado, ao contrário da maioria dos concorrentes).

**O ponto mais importante: o maior risco não é ficar sem backup, é ACHAR que tem.** O jeito mais
comum de um backup caseiro falhar não é um erro óbvio — é a rotina parar de rodar em silêncio e só
se descobrir meses depois, no dia em que faz falta de verdade. Por isso existe uma verificação
semanal (confere se existe um backup com menos de 48 horas) e um alerta de falha, além do tamanho
de cada dump ser comparado com o do dia anterior — se encolher pela metade, é tratado como falha
mesmo sem erro explícito.

Detalhes completos — custo estimado, passo a passo de configuração, o que fazer se falhar — estão
em [templates/backup-supabase/README.md](templates/backup-supabase/README.md), e o passo a passo
de restauração sob pressão está em
[templates/backup-supabase/restore.md](templates/backup-supabase/restore.md).

> **O template está PRONTO, mas NÃO foi aplicado em nenhum projeto ainda.** Os bancos de produção
> dos quatro produtos seguem **sem backup nenhum** até isso acontecer — volta a aparecer na
> seção 13.

---

## 10. Obsidian

O Obsidian é o cofre de notas onde vive a memória que atravessa os produtos — decisão tomada,
aprendizado caro, contexto que não cabe num commit. Um **vault único**, em
`~/ObsidianVault-Skale`, na estrutura **PARA** (um jeito de organizar notas por quão perto estão da
ação):

- `01-projetos` — o que está em andamento agora
- `02-areas` — responsabilidades contínuas, sem data de fim
- `03-conhecimento` — o que foi aprendido e vale para mais de um projeto
- `04-referencia` — material de consulta, sem prazo

**Acesso sempre pelo MCP** — nunca escrevendo arquivo cru direto na pasta do vault, para o Obsidian
sempre reconhecer a nota como se tivesse sido criada pelo próprio aplicativo.

**Wikilinks por nome de arquivo:** o link entre notas usa o nome do arquivo, não o caminho da
pasta. Mover uma nota de pasta não quebra o link que aponta para ela; renomear o arquivo, quebra.

**Por que um vault único, e não um por produto:** conhecimento que atravessa produtos — um padrão
de RLS, uma lição sobre uma API externa — liga os projetos entre si no grafo de notas. Vault
separado por produto cortaria essas ligações.

O **Mapa do Repositório** (o documento que descreve a arquitetura de um projeto para quem vai
mexer nele) mora em dois lugares por motivos diferentes: no **Obsidian**, para o grafo e a
exploração visual; no **ClickUp**, porque é o formato que o Autopilot Agent do ClickUp consegue
ler (seção 8). Ele **nunca vai para o GitHub** — uma tabela de mapa sem proteção de acesso, dentro
de um repositório, é um relatório de reconhecimento pronto para um atacante.

> **Hoje esse Doc ainda NÃO existe no ClickUp** — verificado; existe só uma tarefa dizendo que
> precisa ser criado. Volta a aparecer na seção 13.

---

## 11. Global × por projeto

A frase que resume: **o global carrega COMO TRABALHAR, o projeto carrega O QUE EXISTE ALI.**

**Herda sozinho**, sem precisar de nada no repositório do projeto: o `CLAUDE.md` global, os
plugins, as skills, os hooks, os especialistas, e qualquer programa de terminal instalado na
máquina.

**Não herda**, porque depende do conteúdo do repositório específico:

- O mapa do `graphify` daquele código
- O `CLAUDE.md` do projeto (as regras específicas dele)
- O `.mcp.json` (quais integrações valem ali)
- Regras de outros editores (Cursor, Windsurf) via caveman
- `PRODUCT.md` e `DESIGN.md`, em projeto com interface

### O bootstrap

Ao abrir um projeto pela primeira vez, o hook `bootstrap-projeto.mjs` (seção 5) checa o que falta
dessa lista e **oferece** — nunca executa nada sozinho. Pergunta uma vez, numa mensagem só,
explicando o papel de cada item; registra a resposta num arquivo de controle
(`.claude/.bootstrap-check`) para nunca mais perguntar de novo naquele projeto. Se o Eric disser
não, não insiste. Se não faltar nada, fica calado.

Hoje ele checa: `CLAUDE.md` do projeto, mapa do `graphify`, regra do caveman para outros editores,
`.mcp.json`, `PRODUCT.md`/`DESIGN.md` (só se o projeto tiver interface), e rotina de backup do
Supabase (só se o projeto usar Supabase).

---

## 12. Glossário

- **Linter** — programa que lê o código e aponta erro de estilo ou de padrão antes de rodar.
- **Hook** — programinha que dispara sozinho num momento fixo (antes de um comando, depois de uma
  edição), sem precisar ser chamado.
- **MCP** — a ponte que dá ao Claude acesso a um serviço de fora (ClickUp, Obsidian, navegador).
- **Subagente** — um especialista chamado à parte, com seu próprio model e effort, para uma tarefa
  específica dentro da conversa principal.
- **Contexto** — a "memória de trabalho" da conversa: tudo que o Claude tem carregado para
  responder agora.
- **Token** — a unidade que mede quanto texto entra ou sai numa conversa com o modelo; carregar
  ferramenta demais consome token à toa.
- **YAGNI** — sigla de "you aren't gonna need it" (você não vai precisar disso): não construir
  agora o que ninguém pediu ainda.
- **WIP** — "work in progress", trabalho em andamento, ainda não terminado.
- **Worktree** — uma segunda cópia de trabalho do mesmo repositório Git, isolada, para mexer em
  algo sem afetar a pasta principal.
- **Frontmatter** — o bloco de configuração no topo de um arquivo (entre `---`), que define nome,
  descrição, model e effort de um agente.
- **Effort** — o nível de esforço que um especialista aplica antes de agir; não é o mesmo que
  model (ver seção 6).
- **Dump** — uma cópia exportada do conteúdo de um banco de dados, num arquivo.
- **Egresso** — o tráfego de saída de um serviço de nuvem, ou seja, o custo de baixar dado de
  volta; o R2 (seção 9) tem egresso zero.

---

## 13. Ressalvas honestas

Documentação que só elogia é propaganda. Isto ainda não foi provado na prática:

- **As 3 skills do ClickUp** (`/clickup`, `/clickup-executar`, `/clickup-fila`) nunca rodaram ponta
  a ponta contra o ClickUp real.
- **O template de backup do Supabase nunca rodou**: nenhum dump foi gerado, nada foi enviado ao
  R2, e a restauração nunca foi testada. Até isso acontecer, os bancos de produção dos quatro
  produtos seguem **sem backup**.
- **O hook de bootstrap** (`bootstrap-projeto.mjs`) nunca rodou ao abrir um projeto de verdade — só
  em pasta de teste.
- **O checkpoint automático** foi testado em repositório de teste, não em uso real.
- **O modo permissivo é escolha deliberada de risco**: nada bloqueia exceto navegador, e a lista de
  bloqueio (`deny`) está vazia. Ler um arquivo de credencial passa a ser liberado, e o conteúdo
  lido fica gravado no transcript da conversa.
- **O Doc "Mapa do Repositório" não existe no ClickUp** — o refino automático das tarefas (seção 8)
  sai mais genérico até ele existir.
- **Duas entradas de configuração no projeto skale-insight** (`hook-guard search` e
  `hook-guard read`, em `.claude/settings.json`) chamam o programa `graphify` pelo caminho fixo
  `/Users/ericsoarese/.local/bin/graphify` — quebram em outro computador.
- **Regra de permissão com caminho para `Write`/`Glob`/`NotebookEdit` é aceita, mas nunca
  consultada** — escrever `Write(**)` em vez do nome nu não filtra nada, porque esses três avaliam
  pelo nome da ferramenta, não por padrão de caminho. É por isso que `claude/permissoes.json`
  insiste no nome nu para esses três. O que muda de versão para versão do Claude Code é só se isso
  gera algum aviso na tela — hoje instalada a v2.1.237, não confirmado se ela avisa.
- **O Claude Code regrava o `settings.json` inteiro a cada aprovação**, a partir do que tem em
  memória: editar esse arquivo com a sessão aberta é perder a edição sem aviso.
- **Um comando aprovado vira regra permanente com o texto literal dentro.** Um segredo digitado
  numa linha de comando fica escrito em texto puro no arquivo de configuração, para sempre — é por
  isso que a seção 3 do `claude/CLAUDE.md` proíbe colar segredo em qualquer comando.
- **`rclone` ainda não está instalado** nesta máquina — é necessário para a fase 3 do backup do
  Supabase (subir para o R2), então mesmo aplicando o template hoje essa etapa ainda dependeria
  desse passo.
- **`supabase CLI` está desatualizado** (v2.84.2 instalada, existe v2.115.0).

---

## 14. Documentação completa

Este README é a porta de entrada. O resto do conteúdo mora em arquivos próprios, por assunto:

| Onde | O que tem |
|---|---|
| [SETUP.md](SETUP.md) | Passo a passo manual para máquina nova — para quando o `install.sh` falha ou você quer conferir na mão |
| [claude/MANIFEST.md](claude/MANIFEST.md) | Catálogo completo de tudo que compõe o setup — plugin, skill, hook, programa de terminal — com o comando exato para reinstalar cada item |
| [docs/README.md](docs/README.md) | Índice das pendências em aberto do harness e do skale-insight, e do plano original que deu origem a este repositório |
| [templates/README.md](templates/README.md) | Modelos reaproveitáveis entre os quatro produtos — hoje, o backup do Supabase |

Documentação de apoio nova entra em `docs/`, nunca solta na raiz — e o índice em
[docs/README.md](docs/README.md) é atualizado no mesmo commit.
