#!/usr/bin/env bash
#
# backup.sh — copia a configuração viva de ~/.claude/ para claude/ neste repositório.
#
# Sentido único: máquina  ->  repositório. Nunca escreve em ~/.claude/ (isso é o install.sh).
#
# Lista branca, não lista negra: só entra o que está em ITENS abaixo. Sessão, cache, histórico,
# transcript de conversa e credencial ficam de fora por construção — se um arquivo novo aparecer
# em ~/.claude/ amanhã, ele NÃO é copiado até alguém adicioná-lo aqui de propósito. O contrário
# (copiar tudo e excluir o que é sensível) vaza no dia em que a lista de exclusão ficar desatualizada.

set -euo pipefail

CLAUDE_HOME="${CLAUDE_HOME:-$HOME/.claude}"
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="$REPO/claude"

ITENS=(CLAUDE.md settings.json agents skills hooks commands)

# Lixo que não é configuração e só engorda o repositório.
EXCLUDES=(--exclude '.DS_Store' --exclude 'node_modules/' --exclude '*.log')

if [[ ! -d "$CLAUDE_HOME" ]]; then
  echo "erro: $CLAUDE_HOME não existe. Nada para importar." >&2
  exit 1
fi

mkdir -p "$DEST"

echo "Importando $CLAUDE_HOME  ->  claude/"
echo

for item in "${ITENS[@]}"; do
  origem="$CLAUDE_HOME/$item"

  if [[ -d "$origem" ]]; then
    # --delete só dentro da pasta espelhada: o que sumiu da máquina some do espelho,
    # mas arquivos do repositório que vivem fora dela (MANIFEST.md) não são tocados.
    rsync -a --delete "${EXCLUDES[@]}" "$origem/" "$DEST/$item/"
    echo "  ok  $item/  ($(find "$DEST/$item" -type f | wc -l | tr -d ' ') arquivos)"
  elif [[ -f "$origem" ]]; then
    rsync -a "$origem" "$DEST/$item"
    echo "  ok  $item"
  else
    echo "  --  $item (não existe na máquina)"
  fi
done

echo
echo "Conferindo se algum segredo entrou junto..."
if "$REPO/scripts/checar-segredos.sh" "$DEST"; then
  echo
  echo "Pronto. Revise com 'git status' e 'git diff' antes de commitar."
fi
