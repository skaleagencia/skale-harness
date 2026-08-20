---
name: agent-browser
description: CLI de automação de navegador para agentes de IA. Use quando for preciso interagir com sites de verdade — navegar por página, preencher formulário, clicar em botão, tirar screenshot, extrair dado, testar aplicação web, fazer login num site, ou qualquer automação de navegador. Também serve para testar app desktop Electron (VS Code, Slack, Discord, Figma, Notion, Spotify), checar mensagem não lida do Slack, mandar mensagem no Slack, rodar automação de navegador em microVM da Vercel Sandbox, ou usar navegador em nuvem via AWS Bedrock AgentCore. Também vale para teste exploratório, dogfooding, QA, e caça a bug. IMPORTANTE — pare e peça autorização ao usuário antes de abrir uma sessão de navegador de verdade: ela pode estar logada nas contas reais dele.
allowed-tools: Bash(agent-browser:*), Bash(npx agent-browser:*)
---

# agent-browser

> **Pare e peça autorização antes de abrir um navegador de verdade.** O agent-browser controla
> sessões de navegador que podem estar logadas nas contas reais do dono do projeto — e-mail, banco,
> CRM, redes sociais, painel de cliente. Antes de rodar qualquer comando que abre página ou sessão,
> explique em uma linha o que vai fazer e por quê, e espere a confirmação. Nunca pule esse passo
> porque a tarefa parece simples ou só leitura — mesmo "só tirar um print" abre a sessão real.

CLI rápida de automação de navegador para agentes de IA. Controla Chrome/Chromium via CDP (o
protocolo de depuração do Chrome), lendo a árvore de acessibilidade da página e usando referências
curtas de elemento (`@eN`) em vez de seletor CSS frágil.

Instalar: `npm i -g agent-browser && agent-browser install`

## Por onde começar

Este arquivo é só a porta de entrada — não é o manual de uso. Antes de rodar qualquer comando
`agent-browser` (e só depois de ter a autorização do usuário, ver aviso acima), carregue o conteúdo
de verdade direto da CLI:

```bash
agent-browser skills get core             # começa aqui — fluxo de trabalho, padrões comuns, resolução de problema
agent-browser skills get core --full      # inclui a referência completa de comandos e templates
```

A CLI serve o conteúdo da skill sempre na versão instalada — assim a instrução nunca fica
desatualizada. O texto deste arquivo não muda entre versões; é por isso que ele só aponta para
`skills get core`.

## Skills especializadas

Carregue uma skill especializada quando a tarefa sai de "página de navegador comum":

```bash
agent-browser skills get electron          # apps desktop Electron (VS Code, Slack, Discord, Figma, ...)
agent-browser skills get slack             # automação do workspace do Slack
agent-browser skills get dogfood           # teste exploratório / QA / caça a bug
agent-browser skills get derive-client     # grava um HAR e deriva um cliente de API standalone para o site
agent-browser skills get vercel-sandbox    # agent-browser dentro de microVM da Vercel Sandbox
agent-browser skills get agentcore         # navegador em nuvem via AWS Bedrock AgentCore
```

Rode `agent-browser skills list` para ver tudo disponível na versão instalada.

## Por que agent-browser

- CLI nativa em Rust, rápida — não é um wrapper de Node.js
- Funciona com qualquer agente de IA (Cursor, Claude Code, Codex, Continue, Windsurf etc.)
- Controla Chrome/Chromium via CDP, sem depender de Playwright ou Puppeteer
- Lê a árvore de acessibilidade da página com referência de elemento confiável, que não quebra por
  mudança de CSS
- Guarda sessão, cofre de autenticação, persistência de estado, gravação de vídeo
- Tem skills especializadas para apps Electron, Slack, teste exploratório e provedores de nuvem

## Painel de observabilidade

O painel roda independente das sessões de navegador, na porta 4848, e também pode ser aberto por uma
URL com proxy ou encaminhada, como `https://dashboard.agent-browser.localhost`. O agente deve
permanecer na origem do painel: as abas de sessão, status e tráfego de streaming já passam por proxy
internamente, então as portas de cada sessão não precisam ficar expostas.
