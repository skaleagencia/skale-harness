#!/usr/bin/env bash
#
# encrypt.sh — criptografa um arquivo antes dele sair da máquina do GitHub Actions.
#
# Por que isso é inegociável aqui: o dump de produção pode conter dado de paciente (prontuário
# do Skale Insights), que é dado de saúde protegido pela LGPD. Mesmo o bucket do R2 sendo
# privado, o arquivo sai cifrado — se algum dia o bucket ou a conta vazar, o conteúdo continua
# ilegível sem a chave, que fica só em secret do GitHub (nunca no repositório).
#
# Uso: encrypt.sh <arquivo-origem> <arquivo-destino.gpg>
# Requer: gpg (já vem pronto no runner do GitHub Actions) e a variável
# BACKUP_CHAVE_CRIPTOGRAFIA (a senha de criptografia — ver README.md).

set -euo pipefail

: "${BACKUP_CHAVE_CRIPTOGRAFIA:?defina BACKUP_CHAVE_CRIPTOGRAFIA (a senha de criptografia)}"
ORIGEM="${1:?uso: encrypt.sh <arquivo-origem> <arquivo-destino.gpg>}"
DESTINO="${2:?uso: encrypt.sh <arquivo-origem> <arquivo-destino.gpg>}"

# --passphrase-fd 0 lê a senha do stdin (via here-string abaixo), nunca de um argumento de
# linha de comando — argumento de linha de comando fica visível para qualquer processo que
# olhe a lista de processos da máquina enquanto o comando roda.
gpg --batch --yes --pinentry-mode loopback \
  --passphrase-fd 0 \
  --symmetric --cipher-algo AES256 \
  --output "$DESTINO" "$ORIGEM" <<< "$BACKUP_CHAVE_CRIPTOGRAFIA"
