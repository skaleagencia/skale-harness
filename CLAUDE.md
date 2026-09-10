<!--
  ATENÇÃO — existem DOIS CLAUDE.md neste repositório, e eles servem a coisas diferentes.

  ESTE ARQUIVO (CLAUDE.md, na raiz)
    É o contexto de quem trabalha NESTE repositório — quem mexe no harness em si.
    Vale só aqui dentro. Não é instalado em lugar nenhum.

  claude/CLAUDE.md
    É o CLAUDE.md GLOBAL. O install.sh copia ele para ~/.claude/CLAUDE.md, e a partir dali ele
    vale em TODO projeto que você abrir — skale-insight, CRM, Finance, qualquer um.
    Editar aquele muda como o Claude trabalha em todos os produtos.

  Regra prática: mexeu em como o Claude trabalha nos PRODUTOS? é claude/CLAUDE.md.
  Mexeu em como se trabalha NESTE repositório? é este arquivo aqui.
-->

# skale-harness — contexto deste repositório

Este repositório versiona a configuração global do Claude Code e a distribui para os quatro
produtos. Não é um produto: é a caixa de ferramentas que todos herdam.

## Memória entre sessões

@.claude/memory/MEMORY.md

O índice acima é lido em toda sessão aberta aqui. Cada linha aponta para uma lição em
`.claude/memory/`, com o que aconteceu e como aplicar. **Leia a lição inteira antes de mexer no
assunto dela** — todas foram pagas com tempo perdido, e várias são armadilhas que não dão erro na
tela.

Ao terminar um trabalho que ensinou algo não óbvio, escreva a lição ali e acrescente a linha no
índice, no mesmo commit. Não existe hook automático aqui, de propósito: o registro é manual
enquanto o registro manual der conta.

## Os dois sentidos, que não se confundem

```
   máquina  ──  backup.sh  ──▶  repositório      "guardar o que eu ajustei"
repositório  ── install.sh ──▶  máquina          "aplicar o que está guardado"
```

`./backup.sh --diferencas` mostra o que divergiu dos dois lados, sem copiar nada.

## Antes de mexer

- **Rode o `install.sh` com o Claude Code fechado.** Ele regrava o `settings.json` a cada aprovação,
  a partir do que tem em memória — instalar com sessão aberta é ver a mudança sumir.
- **Permissões editam-se em `claude/permissoes.json`**, nunca direto no `settings.json`. Depois
  `./scripts/aplicar-permissoes.sh`.
- **Nada de segredo em comando.** O `checar-segredos.sh` roda no fim do backup e interrompe se achar,
  mas a regra vem antes dele.
