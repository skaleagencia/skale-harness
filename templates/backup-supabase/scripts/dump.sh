#!/usr/bin/env bash
#
# dump.sh — gera os TRÊS arquivos que juntos reconstroem o banco.
#
# Por que três e não um: o dump padrão do CLI do Supabase (um comando só) não traz nem os
# dados das tabelas, nem os "roles" (usuários e permissões) que não vieram de fábrica. Um
# dump "normal" parece completo e não é — falta descobrir isso na hora de restaurar, que é a
# pior hora possível. Por isso três comandos separados, cada um com sua responsabilidade:
#
#   roles.sql   -> os usuários/permissões customizados do projeto
#   schema.sql  -> a estrutura: tabelas, colunas, funções, políticas de acesso
#   data.sql    -> os dados de cada tabela, linha por linha
#
# Uso: dump.sh <pasta-de-saida>
# Requer: CLI do Supabase instalado, e a variável SUPABASE_DB_URL (connection string do
# Supavisor em modo "session", porta 5432 — ver README.md, seção "conexão").

set -euo pipefail

: "${SUPABASE_DB_URL:?defina SUPABASE_DB_URL (connection string do Supavisor, modo session, porta 5432)}"
SAIDA="${1:?uso: dump.sh <pasta-de-saida>}"

mkdir -p "$SAIDA"

echo "==> roles.sql (usuários e permissões customizadas)"
supabase db dump --db-url "$SUPABASE_DB_URL" -f "$SAIDA/roles.sql" --role-only

echo "==> schema.sql (estrutura: tabelas, funções, políticas)"
supabase db dump --db-url "$SUPABASE_DB_URL" -f "$SAIDA/schema.sql"

echo "==> data.sql (os dados de cada tabela)"
supabase db dump --db-url "$SUPABASE_DB_URL" -f "$SAIDA/data.sql" --data-only --use-copy

# Sanidade mínima: um arquivo desses quase vazio é sinal claro de que algo falhou no meio do
# caminho (conexão caiu, permissão faltando) sem o comando necessariamente sair com erro.
for arquivo in roles.sql schema.sql data.sql; do
  tamanho=$(wc -c < "$SAIDA/$arquivo" | tr -d ' ')
  echo "$arquivo: $tamanho bytes"
  if [[ "$tamanho" -lt 100 ]]; then
    echo "ERRO: $arquivo saiu com só $tamanho bytes — suspeito demais de pequeno, algo falhou." >&2
    exit 1
  fi
done
