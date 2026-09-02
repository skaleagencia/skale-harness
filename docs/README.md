# docs — documentação de apoio

Este índice separa dois tipos de conteúdo. **Documentação viva**: registra decisão e pendência
reais deste repositório, e é atualizada conforme muda. **Plano original** (pasta `Plan/`): os
documentos que planejaram o `skale-harness` antes dele existir — histórico, não necessariamente o
estado atual. Para saber como o harness funciona **hoje**, o ponto de partida é sempre o
[README.md](../README.md) da raiz, não esta pasta.

## Documentação viva

| Documento | O que tem |
|---|---|
| [pendencias-harness.md](pendencias-harness.md) | Três decisões do harness ainda em aberto — manter ou fundir o `database-architect`, apagar o `orchestrator` do skale-insight, desativar revisores de plugin. Nenhuma foi executada. |
| [pendencias-skale-insight.md](pendencias-skale-insight.md) | Auditoria de custo do skale-insight que achou agentes "fantasmas" (citados sem existir). O que já foi corrigido e o que ainda falta. |
| [inventario-agentes-skale-insight.md](inventario-agentes-skale-insight.md) | Levantamento dos agentes locais do skale-insight com recomendação (manter, promover ao global, substituir). Nada foi alterado — é referência para decisão. |
| [prompt-limpeza-skale-insight.md](prompt-limpeza-skale-insight.md) | Prompt usado para terminar a limpeza do `.claude/` do skale-insight. **Já executado em 2026-08-20 — não usar de novo.** |

## Plano original (`Plan/`)

Os cinco documentos que planejaram este repositório antes da primeira linha de código, colados em
sessões separadas do Claude Code. Ficam guardados como **histórico de decisão**, não como
documentação viva — o [índice deles](Plan/00%20-%20skale-harness-INDICE.md) explica a ordem de
leitura original. O que vale hoje é o README da raiz, o [claude/MANIFEST.md](../claude/MANIFEST.md)
e esta página; se o plano original divergir do que o repositório faz agora, o repositório é quem
está certo.

| Documento | Cobria |
|---|---|
| [00 - skale-harness-INDICE.md](Plan/00%20-%20skale-harness-INDICE.md) | Mapa dos outros quatro documentos e a ordem de uso |
| [01 - contexto-motor-global-harness-clickup-obsidian.md](Plan/01%20-%20contexto-motor-global-harness-clickup-obsidian.md) | Estrutura do repositório, MANIFEST, CLAUDE.md global, harness invisível, model+effort, bootstrap |
| [01-1 - prompt-permissoes-skale-harness.md](Plan/01-1%20-%20prompt-permissoes-skale-harness.md) | Desenho original das permissões |
| [02 - skale-harness-automacao-clickup.md](Plan/02%20-%20skale-harness-automacao-clickup.md) | Fluxo do ClickUp, as três skills, regras de operação |
| [03 - prompt-backup-diy-skale-harness.md](Plan/03%20-%20prompt-backup-diy-skale-harness.md) | Template de backup do Supabase para o Cloudflare R2 |
