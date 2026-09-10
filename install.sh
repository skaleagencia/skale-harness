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

# Config POR PROJETO (<projeto>/.claude/) — mapa em claude/projetos/projetos.json, lista branca
# menor que a global porque CLAUDE.md e skills de projeto não são espelhados (ver claude/MANIFEST.md).
PROJETOS_JSON="$REPO/claude/projetos/projetos.json"
ITENS_PROJETO=(agents hooks rules memory settings.json)

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
      # -L pelo mesmo motivo do backup.sh: conteúdo de verdade, não ponteiro para outra pasta.
      rsync -aL --exclude '.DS_Store' "$origem/" "$CLAUDE_HOME/$item/"
      echo "  ok  $item/  ($(find "$origem" -type f | wc -l | tr -d ' ') arquivos)"
    elif [[ -f "$origem" ]]; then
      rsync -a "$origem" "$CLAUDE_HOME/$item"
      echo "  ok  $item"
    fi
  done

  # Hook não roda sem bit de execução, e o Git nem sempre preserva.
  chmod +x "$CLAUDE_HOME"/hooks/* 2>/dev/null || true

  # Copiar não é suficiente: um agente aposentado aqui continua existindo na máquina, e o
  # roteamento continua podendo escolhê-lo. Como este script nunca apaga nada por conta própria,
  # ele mostra o que sobrou e o comando para remover — a decisão fica com quem está lendo.
  local orfaos=""
  for item in agents skills hooks commands; do
    [[ -d "$ORIGEM/$item" && -d "$CLAUDE_HOME/$item" ]] || continue
    while IFS= read -r f; do
      [[ -n "$f" && ! -e "$ORIGEM/$item/$f" ]] && orfaos+="  ~/.claude/$item/$f"$'\n'
    done < <(cd "$CLAUDE_HOME/$item" && find . -maxdepth 1 -mindepth 1 2>/dev/null | sed 's|^\./||')
  done

  if [[ -n "$orfaos" ]]; then
    echo
    amarelo "  Existe na máquina e não no repositório — provavelmente algo aposentado:"
    printf '%s' "$orfaos"
    echo "  Se for isso mesmo, remova:  rm -rf <caminho>"
  fi
}

# Categoria B: o que não cabe num repositório — plugins baixados de marketplace.
# A lista não é redigitada aqui: sai do próprio settings.json versionado, então adicionar um
# plugin no dia a dia já o inclui na instalação da próxima máquina, sem ninguém lembrar de nada.
instalar_plugins() {
  titulo "Plugins de marketplace"

  if ! command -v claude >/dev/null 2>&1; then
    amarelo "  Claude Code não encontrado no PATH — pulando."
    return 0
  fi

  local instalados
  instalados="$(claude plugin list 2>/dev/null || true)"

  # 1. Os marketplaces primeiro: sem eles, não há de onde baixar plugin nenhum.
  while IFS=$'\t' read -r nome origem; do
    [[ -z "$nome" ]] && continue
    if grep -q "$nome" <<<"$instalados"; then
      echo "  ja  marketplace $nome"
    elif claude plugin marketplace add "$origem" --scope user >/dev/null 2>&1; then
      verde "  ok  marketplace $nome"
    else
      amarelo "  !!  marketplace $nome falhou — resolver:  claude plugin marketplace add $origem"
    fi
  done < <(jq -r '.extraKnownMarketplaces // {} | to_entries[]
                  | [.key, (if .value.source.source == "github" then .value.source.repo else .value.source.url end)]
                  | @tsv' "$ORIGEM/settings.json" 2>/dev/null)

  # 2. Os plugins. Reinstalar o que já existe é perda de tempo, então confere antes.
  while IFS= read -r plugin; do
    [[ -z "$plugin" ]] && continue
    local curto="${plugin%%@*}"
    if grep -q "$curto" <<<"$instalados"; then
      echo "  ja  $curto"
    elif claude plugin install "$plugin" >/dev/null 2>&1; then
      verde "  ok  $curto"
    else
      amarelo "  !!  $curto falhou — resolver:  claude plugin install $plugin"
    fi
  done < <(jq -r '.enabledPlugins // {} | to_entries[] | select(.value == true) | .key' "$ORIGEM/settings.json" 2>/dev/null)
}

# ---------------------------------------------------------- config por projeto

# Diferente de instalar_arquivos: aqui o destino não é ~/.claude, é o .claude/ de cada projeto
# listado em claude/projetos/projetos.json — e cada um mora num caminho próprio na máquina.
# Mesmo sentido único do resto do script (repositório -> máquina), mas com uma regra a mais:
# NUNCA cria a pasta do projeto. Se o caminho não existir aqui, só avisa e segue — este script
# não sabe (e não deve adivinhar) se o projeto só não foi clonado ainda nesta máquina.
sincronizar_projetos() {
  titulo "Configuração por projeto"

  if [[ ! -f "$PROJETOS_JSON" ]]; then
    amarelo "  claude/projetos/projetos.json não existe — nada para sincronizar."
    return 0
  fi

  local sincronizados=0 pulados=0

  while IFS=$'\t' read -r slug caminho; do
    [[ -z "$slug" ]] && continue

    if [[ ! -d "$caminho" ]]; then
      amarelo "  $slug não encontrado nesta máquina — ignorado"
      pulados=$((pulados + 1))
      continue
    fi

    local origem_projeto="$REPO/claude/projetos/$slug" destino_projeto="$caminho/.claude"

    # Projeto registrado no mapa mas sem pasta em claude/projetos/<slug>/ — hoje ele só tem
    # arquivo fora da lista branca (settings.local.json, .bootstrap-check). Nada para copiar.
    if [[ ! -d "$origem_projeto" ]]; then
      echo "  ok  $slug  (nada da lista branca para espelhar)"
      sincronizados=$((sincronizados + 1))
      continue
    fi

    mkdir -p "$destino_projeto"
    local copiados=0
    for item in "${ITENS_PROJETO[@]}"; do
      local o="$origem_projeto/$item"
      if [[ -d "$o" ]]; then
        mkdir -p "$destino_projeto/$item"
        rsync -aL --exclude '.DS_Store' "$o/" "$destino_projeto/$item/"
        copiados=$((copiados + 1))
      elif [[ -f "$o" ]]; then
        rsync -a "$o" "$destino_projeto/$item"
        copiados=$((copiados + 1))
      fi
    done

    # Mesmo motivo do bloco global: hook não roda sem bit de execução.
    [[ -d "$destino_projeto/hooks" ]] && chmod +x "$destino_projeto"/hooks/* 2>/dev/null

    verde "  ok  $slug  ($copiados item(ns) de ${ITENS_PROJETO[*]})"
    sincronizados=$((sincronizados + 1))
    # "espelha": false sai daqui — o harness é o próprio repositório, e projeto que só tem
    # settings.local.json não tem nada da lista branca para copiar.
  done < <(jq -r '.projetos | to_entries[] | select(.value.espelha != false) | [.key, .value.caminho] | @tsv' "$PROJETOS_JSON" 2>/dev/null)

  echo
  verde "  $sincronizados projeto(s) sincronizado(s), $pulados pulado(s) (não encontrado nesta máquina)."
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
  # `timeout` é do GNU coreutils e NÃO existe no macOS: usá-lo direto fazia o comando falhar
  # e o script reportar que todos os MCPs faltavam, com todos conectados. Falso alarme é pior
  # que alarme nenhum — treina a ignorar o relatório.
  local mcps
  if command -v timeout >/dev/null 2>&1; then
    mcps="$(timeout 90 claude mcp list 2>/dev/null || true)"
  else
    mcps="$(claude mcp list 2>/dev/null || true)"
  fi

  for servidor in clickup obsidian context7; do
    if grep -qi "$servidor" <<<"$mcps"; then
      echo "  ok  MCP $servidor"
    else
      case "$servidor" in
        clickup)  falta "Conector do ClickUp não encontrado" \
                        "Sem ele as skills /clickup, /clickup-executar e /clickup-fila não funcionam em projeto nenhum." \
                        "é conector de CONTA, não se instala por comando — ligue nas configurações do claude.ai e faça login aqui" ;;
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
  # Conta só arquivo que declara um agente de verdade. Relatório que soma documentação junto
  # esconde o dia em que um agente some.
  n_agentes="$(grep -l '^model:' "$ORIGEM"/agents/*.md 2>/dev/null | wc -l | tr -d ' ')"
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
instalar_plugins
sincronizar_projetos
verificar
relatorio

echo
amarelo "  A configuração só passa a valer numa sessão NOVA."
echo "  O Claude Code mantém tudo em memória e regrava o settings.json a cada aprovação,"
echo "  então mudança feita com a sessão aberta é apagada. Feche e abra antes de conferir."

echo
echo "  Para desfazer:  ./install.sh --rollback"
