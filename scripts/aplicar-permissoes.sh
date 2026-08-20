#!/usr/bin/env bash
#
# aplicar-permissoes.sh — injeta claude/permissoes.json dentro do settings.json e, se pedido,
# leva o resultado para a máquina.
#
#   ./scripts/aplicar-permissoes.sh          só atualiza claude/settings.json (no repositório)
#   ./scripts/aplicar-permissoes.sh --agora  atualiza e copia para ~/.claude/settings.json
#
# O permissoes.json é escrito para ser LIDO por humano: tem um bloco "_leia_isto" e linhas
# começando com "_ " que são títulos de seção. Nada disso pode chegar no settings.json — o
# Claude Code avisaria "regra inválida". Este script tira os comentários e faz a fusão.

set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FONTE="$REPO/claude/permissoes.json"
DESTINO="$REPO/claude/settings.json"
CLAUDE_HOME="${CLAUDE_HOME:-$HOME/.claude}"

[[ -f "$FONTE"   ]] || { echo "erro: não achei $FONTE" >&2; exit 1; }
[[ -f "$DESTINO" ]] || { echo "erro: não achei $DESTINO — rode ./backup.sh antes" >&2; exit 1; }

limpo="$(jq '
  del(._leia_isto)
  | with_entries(
      if (.value | type) == "array"
      then .value |= map(select(startswith("_ ") | not))
      else .
      end
    )
' "$FONTE")"

# Fusão: troca o bloco permissions inteiro, mantém todo o resto do settings.json intacto.
tmp="$(mktemp)"
jq --argjson p "$limpo" '.permissions = $p' "$DESTINO" > "$tmp"
jq empty "$tmp" || { echo "erro: resultado não é JSON válido" >&2; rm -f "$tmp"; exit 1; }
mv "$tmp" "$DESTINO"

n_allow=$(jq '.permissions.allow | length' "$DESTINO")
n_ask=$(jq   '.permissions.ask   | length' "$DESTINO")
n_deny=$(jq  '.permissions.deny  | length' "$DESTINO")

echo "claude/settings.json atualizado:  $n_allow liberadas · $n_ask perguntam · $n_deny bloqueadas"

if [[ "${1:-}" == "--agora" ]]; then
  carimbo="$(date +%Y%m%d-%H%M%S)"
  mkdir -p "$REPO/backups-locais"
  cp "$CLAUDE_HOME/settings.json" "$REPO/backups-locais/settings.json-$carimbo"
  cp "$DESTINO" "$CLAUDE_HOME/settings.json"
  echo "~/.claude/settings.json substituído."
  echo "Cópia do anterior: backups-locais/settings.json-$carimbo"
fi
