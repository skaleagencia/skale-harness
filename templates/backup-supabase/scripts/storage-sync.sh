#!/usr/bin/env bash
#
# storage-sync.sh — baixa uma cópia de todos os arquivos guardados no Storage do Supabase
# (fotos, PDF, anexo de prontuário, o que o projeto guardar lá).
#
# Por que existe separado do dump.sh: o Storage NÃO é banco de dados, é arquivo — o pg_dump
# não enxerga isso. E o Supabase não faz backup de Storage em NENHUM plano, nem Enterprise.
# Sem este passo, os arquivos ficam de fora de qualquer cópia de segurança.
#
# Só roda se o projeto usar Storage (é opcional — ver workflow.yml, variável USA_STORAGE).
#
# Uso: storage-sync.sh <pasta-de-saida>
# Requer: aws-cli (já vem pronto no runner do GitHub Actions) e as três variáveis abaixo,
# que se pegam no painel do Supabase em Project Settings > Storage > S3 Connection.

set -euo pipefail

: "${SUPABASE_STORAGE_ENDPOINT:?defina SUPABASE_STORAGE_ENDPOINT (https://<ref>.supabase.co/storage/v1/s3)}"
: "${SUPABASE_STORAGE_ACCESS_KEY:?defina SUPABASE_STORAGE_ACCESS_KEY}"
: "${SUPABASE_STORAGE_SECRET_KEY:?defina SUPABASE_STORAGE_SECRET_KEY}"
SAIDA="${1:?uso: storage-sync.sh <pasta-de-saida>}"
REGIAO="${SUPABASE_STORAGE_REGION:-us-east-1}"

mkdir -p "$SAIDA"

export AWS_ACCESS_KEY_ID="$SUPABASE_STORAGE_ACCESS_KEY"
export AWS_SECRET_ACCESS_KEY="$SUPABASE_STORAGE_SECRET_KEY"

# O Storage do Supabase expõe cada "bucket" (pasta de arquivos) dele como se fosse um bucket
# S3 separado. Primeiro lista quais existem, depois baixa cada um por inteiro.
buckets=$(aws s3 ls --endpoint-url "$SUPABASE_STORAGE_ENDPOINT" --region "$REGIAO" | awk '{print $3}')

if [[ -z "$buckets" ]]; then
  echo "nenhum bucket encontrado no Storage — nada para baixar."
  exit 0
fi

for bucket in $buckets; do
  echo "==> baixando bucket: $bucket"
  aws s3 sync "s3://$bucket" "$SAIDA/$bucket" --endpoint-url "$SUPABASE_STORAGE_ENDPOINT" --region "$REGIAO"
done
