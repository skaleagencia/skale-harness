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

# Guarda contra o erro mais fácil de cometer aqui: escrever um CLAUDE.md novo no repositório,
# rodar o backup por reflexo, e ver a versão da máquina passar por cima do trabalho — sem aviso,
# sem nada no Git para recuperar. Se há mudança não commitada em claude/, pergunta antes.
if git -C "$REPO" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  pendente="$(git -C "$REPO" status --porcelain -- claude/ 2>/dev/null | grep -v '^??' || true)"
  if [[ -n "$pendente" ]]; then
    echo "Atenção: há mudança NÃO COMMITADA em claude/ que este backup vai sobrescrever:"
    echo "$pendente" | sed 's/^/  /'
    echo
    echo "O backup traz a versão da MÁQUINA por cima da versão do REPOSITÓRIO."
    read -rp "Continuar e perder essas mudanças? [s/N] " r
    [[ "$r" =~ ^[sS]$ ]] || { echo "Cancelado. Commite antes, ou rode ./install.sh para aplicar o repositório na máquina."; exit 0; }
  fi
fi

mkdir -p "$DEST"

# Atalho quebrado é a falha mais traiçoeira aqui: a skill aparece na listagem, o backup "passa",
# e só na máquina nova alguém descobre que nunca houve conteúdo nenhum ali. Avisa antes de copiar.
quebrados="$(find -L "$CLAUDE_HOME" -maxdepth 3 -type l 2>/dev/null || true)"
if [[ -n "$quebrados" ]]; then
  echo "Atenção — atalho(s) apontando para lugar nenhum em ~/.claude/:"
  while IFS= read -r l; do
    [[ -z "$l" ]] && continue
    echo "  x  ${l/#$CLAUDE_HOME/~\/.claude}  ->  $(readlink "$l")"
  done <<<"$quebrados"
  echo "     Não têm conteúdo para versionar. Apague o atalho ou restaure o destino."
  echo
fi

echo "Importando $CLAUDE_HOME  ->  claude/"
echo

for item in "${ITENS[@]}"; do
  origem="$CLAUDE_HOME/$item"

  if [[ -d "$origem" ]]; then
    # -L segue os atalhos e copia o CONTEÚDO. Sem isso, uma skill que é atalho para outra pasta
    # entra no repositório como um ponteiro para um caminho que só existe nesta máquina.
    # --delete só dentro da pasta espelhada: o que sumiu da máquina some do espelho, mas os
    # arquivos do repositório que vivem fora dela (MANIFEST.md) não são tocados.
    # Código 23 = "copiou o que dava, um atalho quebrado ficou de fora" — já avisado acima.
    rsync -aL --delete "${EXCLUDES[@]}" "$origem/" "$DEST/$item/" || [[ $? -eq 23 ]]
    echo "  ok  $item/  ($(find "$DEST/$item" -type f | wc -l | tr -d ' ') arquivos)"
  elif [[ -f "$origem" ]]; then
    rsync -aL "$origem" "$DEST/$item"
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
