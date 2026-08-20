#!/usr/bin/env bash
#
# install.sh — leva a configuração deste repositório para ~/.claude/ e diz o que ainda falta.
#
#   ./install.sh            faz backup do ~/.claude/ atual, copia a configuração e verifica
#   ./install.sh --check    só verifica e reporta, não escreve nada
#   ./install.sh --rollback desfaz a última instalação
#
# Sentido único: repositório  ->  máquina. O caminho contrário é o backup.sh.

set -uo pipefail

CLAUDE_HOME="${CLAUDE_HOME:-$HOME/.claude}"
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ORIGEM="$REPO/claude"
BACKUPS="$REPO/backups-locais"

ITENS=(CLAUDE.md settings.json agents skills hooks commands)

VAULT_OBSIDIAN="$HOME/ObsidianVault-Skale"

# ---------------------------------------------------------------- utilidades

verde()    { printf '\033[32m%s\033[0m\n' "$1"; }
amarelo()  { printf '\033[33m%s\033[0m\n' "$1"; }
vermelho() { printf '\033[31m%s\033[0m\n' "$1"; }
titulo()   { printf '\n\033[1m%s\033[0m\n' "$1"; }

FALTANDO=()

falta() {  # falta "título" "por que importa" "como resolver"
  FALTANDO+=("$1"$'\n'"     $2"$'\n'"     Resolver:  $3")
}

# ------------------------------------------------------------------- backup

fazer_backup() {
  local carimbo destino
  carimbo="$(date +%Y%m%d-%H%M%S)"
  destino="$BACKUPS/claude-$carimbo.tar.gz"
  mkdir -p "$BACKUPS"

  local presentes=()
  for item in "${ITENS[@]}"; do
    [[ -e "$CLAUDE_HOME/$item" ]] && presentes+=("$item")
  done

  if [[ ${#presentes[@]} -eq 0 ]]; then
    amarelo "  Nada para guardar — ~/.claude/ ainda não tem configuração."
    return 0
  fi

  tar -czf "$destino" -C "$CLAUDE_HOME" "${presentes[@]}" 2>/dev/null
  verde "  Backup do estado atual: ${destino/#$HOME/\~}"
}

rollback() {
  local ultimo
  ultimo="$(ls -1t "$BACKUPS"/claude-*.tar.gz 2>/dev/null | head -1)"

  if [[ -z "$ultimo" ]]; then
    vermelho "Nenhum backup encontrado em $BACKUPS. Nada a desfazer."
    exit 1
  fi

  titulo "Desfazendo a última instalação"
  echo "  Restaurando: ${ultimo/#$HOME/\~}"
  read -rp "  Isso sobrescreve o ~/.claude/ atual. Continuar? [s/N] " resposta
  [[ "$resposta" =~ ^[sS]$ ]] || { echo "  Cancelado."; exit 0; }

  tar -xzf "$ultimo" -C "$CLAUDE_HOME"
  verde "  Pronto. Configuração anterior restaurada."
  exit 0
}

# ---------------------------------------------------------------- instalação

instalar_arquivos() {
  titulo "Copiando a configuração para ~/.claude/"

  for item in "${ITENS[@]}"; do
    local origem="$ORIGEM/$item"

    if [[ -d "$origem" ]]; then
      mkdir -p "$CLAUDE_HOME/$item"
      rsync -a --exclude '.DS_Store' "$origem/" "$CLAUDE_HOME/$item/"
      echo "  ok  $item/  ($(find "$origem" -type f | wc -l | tr -d ' ') arquivos)"
    elif [[ -f "$origem" ]]; then
      rsync -a "$origem" "$CLAUDE_HOME/$item"
      echo "  ok  $item"
    fi
  done

  # Hook não roda sem bit de execução, e o Git nem sempre preserva.
  chmod +x "$CLAUDE_HOME"/hooks/* 2>/dev/null || true
}

# --------------------------------------------------------------- verificação

verificar() {
  titulo "Verificando o que este repositório não consegue trazer de volta"

  # 1. Login do Claude Code
  if security find-generic-password -s "Claude Code-credentials" >/dev/null 2>&1 \
     || [[ -f "$CLAUDE_HOME/.credentials.json" ]]; then
    echo "  ok  login do Claude Code"
  else
    falta "Login do Claude Code não encontrado" \
          "Sem ele nada roda nesta máquina." \
          "claude  (e faça login pelo navegador)"
  fi

  # 2. CLIs
  if command -v graphify >/dev/null 2>&1; then
    echo "  ok  graphify  ($(graphify --version 2>/dev/null | head -1))"
  else
    falta "CLI do graphify não encontrado" \
          "É ele que mapeia o código como grafo — sem ele eu não respondo 'o que quebra se eu mudar isso' numa consulta; volto a vasculhar arquivo por arquivo." \
          "ver claude/MANIFEST.md, seção CLIs"
  fi

  if command -v agent-browser >/dev/null 2>&1; then
    echo "  ok  agent-browser  ($(agent-browser --version 2>/dev/null | head -1))"
  else
    falta "CLI do agent-browser não encontrado" \
          "Sem ele não dá para testar interface de verdade no navegador." \
          "brew install agent-browser"
  fi

  # 3. MCPs — a listagem é lenta, então roda uma vez só e reaproveita.
  local mcps
  mcps="$(timeout 90 claude mcp list 2>/dev/null || true)"

  for servidor in clickup obsidian context7; do
    if grep -qi "$servidor" <<<"$mcps"; then
      echo "  ok  MCP $servidor"
    else
      case "$servidor" in
        clickup)  falta "MCP do ClickUp não configurado" \
                        "Sem ele as skills /executar-tarefa e /planejar não funcionam em nenhum projeto." \
                        "claude mcp add --scope user clickup" ;;
        obsidian) falta "MCP do Obsidian não configurado" \
                        "Sem ele o Mapa do Repositório não é gravado no vault, só no ClickUp." \
                        "claude mcp add --scope user obsidian" ;;
        context7) falta "MCP do context7 não configurado" \
                        "Sem ele eu respondo sobre biblioteca externa de memória, que envelhece e erra versão." \
                        "claude mcp add --scope user context7" ;;
      esac
    fi
  done

  # 4. Vault do Obsidian
  if [[ -d "$VAULT_OBSIDIAN" ]]; then
    echo "  ok  vault do Obsidian  ($(find "$VAULT_OBSIDIAN" -name '*.md' -type f 2>/dev/null | wc -l | tr -d ' ') notas)"
  else
    falta "Vault do Obsidian não existe em ~/ObsidianVault-Skale" \
          "Sem ele o Mapa do Repositório só vai para o ClickUp, e o grafo de conhecimento não existe nesta máquina." \
          "criar a pasta e abrir uma vez no Obsidian"
  fi

  # 5. As duas variáveis que anulam o roteamento em silêncio
  if [[ -n "${CLAUDE_CODE_SUBAGENT_MODEL:-}" ]]; then
    falta "CLAUDE_CODE_SUBAGENT_MODEL está setada (valor com ${#CLAUDE_CODE_SUBAGENT_MODEL} caracteres)" \
          "Ela sobrescreve o model de TODO subagente. O roteamento por tier é ignorado sem dar erro." \
          "remover do ~/.zshenv / ~/.zshrc e abrir um terminal novo"
  else
    echo "  ok  CLAUDE_CODE_SUBAGENT_MODEL vazia (roteamento de modelo vai valer)"
  fi

  if [[ -n "${CLAUDE_CODE_EFFORT_LEVEL:-}" ]]; then
    falta "CLAUDE_CODE_EFFORT_LEVEL está setada (valor: ${CLAUDE_CODE_EFFORT_LEVEL})" \
          "Ela sobrescreve o effort de TODO subagente. Um agente configurado para 'medium' vai rodar no nível da variável, sem avisar." \
          "remover do ambiente e do settings.json do projeto que a define"
  else
    echo "  ok  CLAUDE_CODE_EFFORT_LEVEL vazia (roteamento de esforço vai valer)"
  fi
}

relatorio() {
  titulo "Resultado"

  local n_skills n_agentes n_hooks
  n_skills="$(ls -1 "$ORIGEM/skills" 2>/dev/null | wc -l | tr -d ' ')"
  n_agentes="$(ls -1 "$ORIGEM/agents" 2>/dev/null | wc -l | tr -d ' ')"
  n_hooks="$(ls -1 "$ORIGEM/hooks" 2>/dev/null | wc -l | tr -d ' ')"

  verde "  Configuração: $n_skills skills · $n_agentes agentes · $n_hooks hooks · CLAUDE.md global"

  if [[ ${#FALTANDO[@]} -eq 0 ]]; then
    verde "  Nada faltando. Setup completo."
    return 0
  fi

  echo
  amarelo "  Faltam ${#FALTANDO[@]} coisa(s) para o setup ficar completo:"
  echo
  local i=1
  for item in "${FALTANDO[@]}"; do
    echo "  $i. $item"
    echo
    i=$((i + 1))
  done
  echo "  Rode ./install.sh --check para verificar de novo depois."
}

# -------------------------------------------------------------------- início

case "${1:-}" in
  --rollback) rollback ;;
  --check)
    verificar
    relatorio
    exit 0
    ;;
  --help|-h)
    sed -n '2,10p' "$0" | sed 's/^# \?//'
    exit 0
    ;;
esac

titulo "Guardando o ~/.claude/ atual antes de mexer"
fazer_backup

instalar_arquivos
verificar
relatorio

echo
echo "  Para desfazer:  ./install.sh --rollback"
