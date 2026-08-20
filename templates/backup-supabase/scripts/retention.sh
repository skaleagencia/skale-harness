#!/usr/bin/env bash
#
# retention.sh — apaga do R2 o que já passou da política de retenção.
#
# Sem isso o bucket cresce para sempre e o custo sobe sozinho, mês após mês, sem ninguém
# decidir isso de propósito. A regra é a clássica "avô-pai-filho": guarda backup de TODO dia
# pelos primeiros N dias; depois disso, guarda só 1 por semana por mais N semanas; depois
# disso, guarda só 1 por mês por mais N meses. O que não se encaixa em nenhuma dessas três
# janelas é apagado.
#
# Padrão (mudar via variável de ambiente, no workflow.yml, se o projeto precisar de outra
# janela): diário 30 dias, semanal 12 semanas, mensal 24 meses.
#
# Uso: retention.sh <produto>
# Requer: aws-cli e as variáveis R2_BUCKET / R2_ENDPOINT (mais as credenciais AWS_* já
# exportadas pelo passo anterior do workflow).

set -euo pipefail

: "${R2_BUCKET:?defina R2_BUCKET}"
: "${R2_ENDPOINT:?defina R2_ENDPOINT}"
PRODUTO="${1:?uso: retention.sh <produto>}"

# 10# força base 10 na conta: sem isso, um número com zero na frente (tipo "08") faz o bash
# tentar ler como octal e quebra, porque "8" não existe em octal.
DIARIO=$((10#${RETENCAO_DIARIA_DIAS:-30}))
SEMANAL=$((10#${RETENCAO_SEMANAL_SEMANAS:-12}))
MENSAL=$((10#${RETENCAO_MENSAL_MESES:-24}))

hoje_epoch=$(date -u +%s)

# Este script usa `date -d`, que só existe na versão do Linux (é onde ele roda de verdade, no
# GitHub Actions). No macOS o comando é outro e cada data falharia na conversão — o laço
# pularia TODAS as pastas e terminaria dizendo que está tudo certo, sem ter limpado nada.
# Silêncio que parece sucesso é o pior desfecho possível aqui, então prefere-se parar e avisar.
if ! date -u -d "2000-01-01" +%s >/dev/null 2>&1; then
  echo "erro: este script precisa da versão Linux do comando 'date' (é onde ele roda: GitHub Actions)." >&2
  echo "      No macOS, rode dentro de um container Linux, ou acompanhe a limpeza pelo painel do R2." >&2
  exit 1
fi

pastas=$(aws s3 ls "s3://$R2_BUCKET/backups/$PRODUTO/" --endpoint-url "$R2_ENDPOINT" 2>/dev/null | awk '{print $2}' | tr -d '/')

if [[ -z "$pastas" ]]; then
  echo "nenhum backup encontrado ainda para $PRODUTO — nada para limpar."
  exit 0
fi

for pasta in $pastas; do
  # a pasta tem que ser uma data AAAA-MM-DD; qualquer outra coisa é ignorada, nunca apagada
  # (assim um arquivo fora do padrão não some por engano).
  [[ "$pasta" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]] || continue

  data_epoch=$(date -u -d "$pasta" +%s 2>/dev/null) || continue
  dias_atras=$(( (hoje_epoch - data_epoch) / 86400 ))
  dia_semana=$((10#$(date -u -d "$pasta" +%u)))  # 1=segunda .. 7=domingo
  dia_mes=$((10#$(date -u -d "$pasta" +%d)))

  manter=false
  if (( dias_atras <= DIARIO )); then
    manter=true                                            # dentro da janela diária: guarda tudo
  elif (( dia_semana == 7 )) && (( dias_atras <= SEMANAL * 7 )); then
    manter=true                                            # domingo, dentro da janela semanal
  elif (( dia_mes == 1 )) && (( dias_atras <= MENSAL * 31 )); then
    manter=true                                            # dia 1º do mês, dentro da janela mensal
  fi

  if [[ "$manter" == false ]]; then
    # Modo simulação: mostra o que seria apagado e não apaga nada.
    # Existe porque este é o único script do template que DESTRÓI backup. Antes de confiar na
    # janela de retenção — principalmente se você mudou os números padrão — rode uma vez com
    # RETENCAO_SIMULAR=1 e confira a lista. Apagar o backup errado só se descobre no dia em
    # que ele faz falta, e aí não tem correção.
    if [[ -n "${RETENCAO_SIMULAR:-}" ]]; then
      echo "[simulação] apagaria backups/$PRODUTO/$pasta/ (tem $dias_atras dias, fora da janela)"
      continue
    fi
    echo "apagando backups/$PRODUTO/$pasta/ (tem $dias_atras dias, fora da janela de retenção)"
    aws s3 rm "s3://$R2_BUCKET/backups/$PRODUTO/$pasta/" --recursive --endpoint-url "$R2_ENDPOINT"
  fi
done

echo "retenção concluída para $PRODUTO."
