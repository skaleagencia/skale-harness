#!/usr/bin/env bash
#
# backup.sh — copia a configuração viva de ~/.claude/ para claude/ neste repositório, e a
# configuração de cada projeto (mapa em claude/projetos/projetos.json) para claude/projetos/.
#
#   ./backup.sh              importa a configuração da máquina para o repositório
#   ./backup.sh --diferencas mostra o que mudou de cada lado, SEM copiar nada
#
# Sentido único: máquina  ->  repositório. Nunca escreve em ~/.claude/ nem no .claude/ de projeto
# nenhum (isso é o install.sh).
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

# Config POR PROJETO — mesmo sentido (máquina -> repositório), mapa em claude/projetos/projetos.json.
# Lista branca menor que a global: CLAUDE.md e skills de projeto não são espelhados (ver MANIFEST.md).
PROJETOS_JSON="$DEST/projetos/projetos.json"
ITENS_PROJETO=(agents hooks rules memory settings.json)

# Lixo que não é configuração e só engorda o repositório.
EXCLUDES=(--exclude '.DS_Store' --exclude 'node_modules/' --exclude '*.log')

if [[ ! -d "$CLAUDE_HOME" ]]; then
  echo "erro: $CLAUDE_HOME não existe. Nada para importar." >&2
  exit 1
fi

# Responde a pergunta "alguma coisa mudou na minha máquina sem eu saber?" — por exemplo, uma
# sessão em outro projeto que instalou um hook novo no global. Sem isto, a única forma de
# descobrir seria rodar o backup e ler o `git status`, o que já mistura descobrir com copiar.
# Compara UM item (arquivo solto ou pasta) dos dois lados e imprime cada diferença com o sinal
# certo. Extraído da antiga comparar() para servir tanto o bloco global (~/.claude/) quanto cada
# projeto — mesma lógica, dois conjuntos de caminhos. Soma em $total, que é local de quem chama
# (bash enxerga o local do chamador dentro da função chamada, sem precisar declarar de novo).
comparar_item() {
  local label="$1" maquina="$2" repo="$3"

  # Arquivo solto (CLAUDE.md, settings.json)
  if [[ -f "$maquina" || -f "$repo" ]]; then
    if   [[ ! -f "$repo"    ]]; then echo "  +  $label — está na máquina, não está versionado"; total=$((total+1))
    elif [[ ! -f "$maquina" ]]; then echo "  -  $label — versionado aqui, não está na máquina"; total=$((total+1))
    elif ! cmp -s "$maquina" "$repo"; then echo "  ~  $label — os dois têm, com conteúdo diferente"; total=$((total+1))
    fi
    return
  fi

  # "return 0", não "return": sem argumento ele herda o status do teste [[ ]] que acabou de
  # falhar (1) — e como agora isto é uma função chamada como comando solto no loop, esse 1
  # dispara o "set -e" do script inteiro. Faltar dos dois lados não é erro, é só "nada a dizer".
  [[ -d "$maquina" || -d "$repo" ]] || return 0

  # Pasta: compara a lista de arquivos dos dois lados, por caminho relativo.
  # Caminho relativo é o que faz isto funcionar mesmo com espaço no nome da pasta do repositório.
  local lista_m lista_r
  lista_m="$(mktemp)"; lista_r="$(mktemp)"
  [[ -d "$maquina" ]] && (cd "$maquina" && find -L . -type f 2>/dev/null | sed 's|^\./||' | sort) > "$lista_m"
  [[ -d "$repo"    ]] && (cd "$repo"    && find -L . -type f 2>/dev/null | sed 's|^\./||' | sort) > "$lista_r"

  while IFS= read -r f; do [[ -n "$f" ]] && { echo "  +  $label/$f — apareceu na máquina, não está versionado"; total=$((total+1)); }
  done < <(comm -23 "$lista_m" "$lista_r")

  while IFS= read -r f; do [[ -n "$f" ]] && { echo "  -  $label/$f — versionado aqui, falta na máquina"; total=$((total+1)); }
  done < <(comm -13 "$lista_m" "$lista_r")

  while IFS= read -r f; do
    [[ -n "$f" ]] && ! cmp -s "$maquina/$f" "$repo/$f" && { echo "  ~  $label/$f — os dois têm, com conteúdo diferente"; total=$((total+1)); }
  done < <(comm -12 "$lista_m" "$lista_r")

  rm -f "$lista_m" "$lista_r"
}

comparar() {
  echo "Comparando ~/.claude/  com  claude/ deste repositório,"
  echo "e cada projeto de claude/projetos/projetos.json com o .claude/ dele na máquina."
  echo "Nada é copiado — isto só mostra as diferenças."
  echo

  local total=0

  for item in "${ITENS[@]}"; do
    comparar_item "$item" "$CLAUDE_HOME/$item" "$DEST/$item"
  done

  if [[ -f "$PROJETOS_JSON" ]]; then
    echo
    echo "-- Projetos --"
    while IFS=$'\t' read -r slug caminho; do
      [[ -z "$slug" ]] && continue
      if [[ ! -d "$caminho" ]]; then
        echo "  ?  $slug — não encontrado nesta máquina, comparação pulada"
        continue
      fi
      for item in "${ITENS_PROJETO[@]}"; do
        comparar_item "$slug/$item" "$caminho/.claude/$item" "$DEST/projetos/$slug/$item"
      done
    done < <(jq -r '.projetos | to_entries[] | [.key, .value.caminho] | @tsv' "$PROJETOS_JSON" 2>/dev/null)
  fi

  echo
  if [[ $total -eq 0 ]]; then
    echo "Tudo igual — máquina e repositório estão sincronizados."
  else
    echo "$total diferença(s). O que fazer com cada sinal:"
    echo "  +  apareceu na máquina  ->  ./backup.sh   para trazer para o repositório"
    echo "  -  só existe aqui       ->  ./install.sh  para instalar na máquina"
    echo "  ~  diferentes           ->  veja qual é o mais recente antes de escolher um lado"
  fi
}

# Mesmo sentido do resto do script (máquina -> repositório), agora por projeto. SEM --delete,
# pela mesma razão do bloco global logo abaixo: arquivo novo aqui e ainda não instalado não pode
# ser apagado por engano.
trazer_projetos() {
  [[ -f "$PROJETOS_JSON" ]] || return 0

  echo
  echo "Projetos (claude/projetos/projetos.json)"
  echo

  local sincronizados=0 pulados=0

  while IFS=$'\t' read -r slug caminho; do
    [[ -z "$slug" ]] && continue

    if [[ ! -d "$caminho" ]]; then
      echo "  --  $slug (não encontrado nesta máquina)"
      pulados=$((pulados + 1))
      continue
    fi

    local origem_projeto="$caminho/.claude" destino_projeto="$DEST/projetos/$slug" copiados=0
    for item in "${ITENS_PROJETO[@]}"; do
      local o="$origem_projeto/$item"
      if [[ -d "$o" ]]; then
        mkdir -p "$destino_projeto/$item"
        rsync -aL "${EXCLUDES[@]}" "$o/" "$destino_projeto/$item/" || [[ $? -eq 23 ]]
        copiados=$((copiados + 1))
      elif [[ -f "$o" ]]; then
        mkdir -p "$destino_projeto"
        rsync -aL "$o" "$destino_projeto/$item"
        copiados=$((copiados + 1))
      fi
    done

    if [[ $copiados -gt 0 ]]; then
      echo "  ok  $slug  ($copiados item(ns) da lista branca)"
    else
      echo "  ok  $slug  (nada da lista branca nesta máquina)"
    fi
    sincronizados=$((sincronizados + 1))
  done < <(jq -r '.projetos | to_entries[] | [.key, .value.caminho] | @tsv' "$PROJETOS_JSON" 2>/dev/null)

  echo
  echo "$sincronizados projeto(s) verificado(s), $pulados pulado(s) (não encontrado nesta máquina)."
}

if [[ "${1:-}" == "--diferencas" ]]; then
  comparar
  exit 0
fi

# Guarda contra o erro mais fácil de cometer aqui: escrever um CLAUDE.md novo no repositório,
# rodar o backup por reflexo, e ver a versão da máquina passar por cima do trabalho — sem aviso,
# sem nada no Git para recuperar. Se há mudança não commitada em claude/, pergunta antes.
# O pathspec "claude/" é recursivo: já cobre claude/projetos/ sozinho, sem precisar listar à parte.
if git -C "$REPO" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  # Inclui arquivo novo ainda não commitado (`??`): foi justamente um desses — um hook recém-criado
  # — que se perdeu na primeira versão desta guarda.
  pendente="$(git -C "$REPO" status --porcelain -- claude/ 2>/dev/null || true)"
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
    #
    # SEM --delete, de propósito. Com ele, um arquivo escrito aqui no repositório e ainda não
    # instalado na máquina era APAGADO pelo backup — foi o que aconteceu com um hook recém-criado
    # em 2026-08-19. Deixar sobra é chato; apagar trabalho é irreversível. O que sobra é listado
    # como órfão no fim, para decidir na mão.
    #
    # Código 23 = "copiou o que dava, um atalho quebrado ficou de fora" — já avisado acima.
    rsync -aL "${EXCLUDES[@]}" "$origem/" "$DEST/$item/" || [[ $? -eq 23 ]]
    echo "  ok  $item/  ($(find "$DEST/$item" -type f | wc -l | tr -d ' ') arquivos)"
  elif [[ -f "$origem" ]]; then
    rsync -aL "$origem" "$DEST/$item"
    echo "  ok  $item"
  else
    echo "  --  $item (não existe na máquina)"
  fi
done

echo
# Órfão: existe no repositório e não na máquina. Pode ser coisa nova esperando ./install.sh,
# ou resto de algo apagado lá. O script não adivinha qual dos dois — só mostra.
for item in "${ITENS[@]}"; do
  [[ -d "$DEST/$item" ]] || continue
  orfaos="$(cd "$DEST/$item" && find . -type f 2>/dev/null | while read -r f; do
    [[ -e "$CLAUDE_HOME/$item/${f#./}" ]] || echo "$item/${f#./}"
  done)"
  if [[ -n "$orfaos" ]]; then
    echo "Existe no repositório e não em ~/.claude/ (rode ./install.sh, ou apague se for resto):"
    echo "$orfaos" | sed 's/^/  ?  /'
    echo
  fi
done

trazer_projetos

echo
echo "Conferindo se algum segredo entrou junto..."
if "$REPO/scripts/checar-segredos.sh" "$DEST"; then
  echo
  echo "Pronto. Revise com 'git status' e 'git diff' antes de commitar."
fi
