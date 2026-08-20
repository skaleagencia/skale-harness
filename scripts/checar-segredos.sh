#!/usr/bin/env bash
#
# checar-segredos.sh — varre uma pasta atrás de credencial antes de ela virar commit.
#
# Roda sozinho no fim do backup.sh e pode ser chamado à mão:  ./scripts/checar-segredos.sh claude/
#
# Não é antivírus: pega os formatos conhecidos que aparecem em configuração de ferramenta
# (token do Claude, chave da OpenAI, JWT do Supabase, token do GitHub, chave privada, .env).
# Achou algo, sai com código 1 e mostra o arquivo e a linha — nunca o valor inteiro.

set -uo pipefail

ALVO="${1:-.}"

# padrão                                    | o que é
PADROES=(
  'sk-ant-[A-Za-z0-9_-]{20,}'               # chave da API da Anthropic
  'sk-[A-Za-z0-9]{32,}'                     # chave da OpenAI
  'gh[pousr]_[A-Za-z0-9]{30,}'              # token do GitHub
  'eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.'  # JWT (Supabase anon/service_role)
  # Atribuição de valor longo a nome sensível. Exige o VALOR: citar a palavra "service_role"
  # dentro de uma regra de permissão ou de um comentário não pode disparar alarme, senão o
  # checador vira ruído e a primeira coisa que alguém faz é desligar.
  '(service_role|api[_-]?key|secret|password|passwd|access[_-]?token)["'"'"']?\s*[:=]\s*["'"'"']?[A-Za-z0-9._/+-]{24,}'
  'BEGIN [A-Z ]*PRIVATE KEY'                # chave privada
  'xox[baprs]-[A-Za-z0-9-]{10,}'            # token do Slack
  'AKIA[0-9A-Z]{16}'                        # chave da AWS
)

# Pastas que nunca entram no Git — varrê-las só gera alarme falso.
# backups-locais/ guarda cópias do settings.json antigo, e o Claude Code grava o texto literal
# de cada comando aprovado como regra de permissão: um comando que continha segredo vira uma
# linha de configuração com o segredo dentro. Fica fora do Git por isso mesmo.
IGNORAR=(--exclude-dir=.git --exclude-dir=backups-locais --exclude-dir=node_modules --exclude-dir=plugins)

achados=0

for p in "${PADROES[@]}"; do
  # -I ignora binário; -n dá a linha; cortamos a saída para não imprimir o segredo inteiro.
  while IFS= read -r linha; do
    [[ -z "$linha" ]] && continue
    echo "  !!  ${linha:0:110}"
    achados=$((achados + 1))
  done < <(grep -rIEn "${IGNORAR[@]}" "$p" "$ALVO" 2>/dev/null | cut -c1-110)
done

# Arquivos que não deveriam existir aqui, independente do conteúdo.
while IFS= read -r arq; do
  echo "  !!  arquivo suspeito: $arq"
  achados=$((achados + 1))
done < <(find "$ALVO" \
  \( -name .git -o -name backups-locais -o -name node_modules -o -name plugins \) -prune -o \
  \( -name '.env' -o -name '.env.*' -o -name '*.pem' -o -name '.credentials.json' -o -name '*.key' \) -type f -print 2>/dev/null)

if [[ $achados -gt 0 ]]; then
  echo
  echo "PARE: $achados ocorrência(s) com cara de credencial em '$ALVO'."
  echo "Nada foi commitado. Remova ou mascare antes de continuar."
  exit 1
fi

echo "  limpo — nenhuma credencial encontrada em '$ALVO'"
exit 0
