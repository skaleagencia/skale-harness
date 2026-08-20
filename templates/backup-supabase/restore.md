# Como restaurar um backup — passo a passo

Este documento foi escrito para ser seguido **sob pressão, sem precisar interpretar nada**. Os
comandos estão prontos para copiar e colar, na ordem certa. Depois de cada um, este documento diz
o que você deve ver na tela — se não bater, pare e leia a seção "Se algo der errado" no fim.

Faça tudo no **Terminal do Mac**. Se nunca usou, é o aplicativo "Terminal" (Spotlight: `⌘+Espaço`,
digite "Terminal").

---

## Antes de começar: o que você precisa ter instalado

Rode este bloco uma vez. Se já tiver tudo, ele não muda nada.

```bash
brew install awscli gnupg libpq
brew link --force libpq
```

Se o comando `brew` não existir, instale o Homebrew primeiro em https://brew.sh (o próprio site
já mostra o comando de instalação).

---

## Passo 1 — decida o destino da restauração

Duas situações possíveis:

- **O banco de produção foi perdido ou corrompido** → o destino é um projeto Supabase novo,
  criado agora, ou o mesmo projeto depois de esvaziado.
- **Teste trimestral** (ver seção própria mais abaixo) → o destino é sempre um projeto Supabase
  **descartável**, nunca o de produção.

Em ambos os casos, você precisa da **connection string** do projeto de destino, no formato session
pooler (a mesma forma usada para gerar o backup — funciona em qualquer rede, inclusive no seu Mac).
Pegue em: painel do Supabase → o projeto de destino → **Project Settings → Database → Connection
string → Session pooler**. Troque `[YOUR-PASSWORD]` pela senha do banco desse projeto.

Guarde isso numa variável, sem colar em nenhum outro lugar:

```bash
export RESTORE_DB_URL="cole aqui a connection string, só nesta linha, sem compartilhar este comando"
```

---

## Passo 2 — busque as credenciais do backup, sem colar nenhuma

Se você seguiu o README ao configurar, as credenciais do R2 e a chave de criptografia estão no
Chaveiro do macOS. Recupere assim (nada aparece na tela, só o tamanho, para confirmar que existe):

```bash
export AWS_ACCESS_KEY_ID=$(security find-generic-password -a "$USER" -s r2-backup-access-key -w)
export AWS_SECRET_ACCESS_KEY=$(security find-generic-password -a "$USER" -s r2-backup-secret-key -w)
export BACKUP_CHAVE_CRIPTOGRAFIA=$(security find-generic-password -a "$USER" -s backup-supabase-chave -w)

echo "chave de criptografia: ${#BACKUP_CHAVE_CRIPTOGRAFIA} caracteres (não deve ser 0)"
```

Se o comando `echo` mostrar **0 caracteres**, a credencial não está no Chaveiro desta máquina —
veja a segunda cópia (documentada no README, seção de segurança) antes de continuar.

Defina também o endpoint e o bucket do R2 (não são segredo, mas mudam por conta):

```bash
export R2_ENDPOINT="https://<ACCOUNT_ID>.r2.cloudflarestorage.com"   # <-- ajuste
export R2_BUCKET="<nome-do-bucket>"                                   # <-- ajuste
```

---

## Passo 3 — baixe os arquivos do dia que você quer restaurar

Escolha o produto e a data (formato `AAAA-MM-DD`). Para ver quais datas existem:

```bash
export PRODUTO="skale-insights"   # <-- ajuste: skale-insights | skale-crm | skale-finance-pessoal | skale-finance-business

aws s3 ls "s3://$R2_BUCKET/backups/$PRODUTO/" --endpoint-url "$R2_ENDPOINT"
```

Você deve ver uma lista de pastas com datas. Escolha uma (normalmente a mais recente) e baixe:

```bash
export DATA="2026-08-19"   # <-- ajuste para a data escolhida

mkdir -p ~/restauracao-supabase && cd ~/restauracao-supabase
aws s3 cp "s3://$R2_BUCKET/backups/$PRODUTO/$DATA/" . --recursive --endpoint-url "$R2_ENDPOINT"
```

Você deve ver, no mínimo: `roles.sql.gpg`, `schema.sql.gpg`, `data.sql.gpg` (e `storage.tar.gz.gpg`
se o projeto usa Storage), mais um `manifest.txt.gpg`.

---

## Passo 4 — descriptografe tudo

```bash
for arquivo in *.gpg; do
  destino="${arquivo%.gpg}"
  gpg --batch --yes --pinentry-mode loopback --passphrase-fd 0 \
    --output "$destino" --decrypt "$arquivo" <<< "$BACKUP_CHAVE_CRIPTOGRAFIA"
  echo "descriptografado: $destino"
done
```

Você deve ver `descriptografado: roles.sql`, `descriptografado: schema.sql`, etc. — um por linha,
sem erro no meio. Se o gpg reclamar de senha errada aqui, a chave que você recuperou no Passo 2 não
é a certa: pare e confirme antes de seguir.

---

## Passo 5 — aplique no banco de destino, NESTA ORDEM

A ordem importa: roles primeiro (a estrutura depende deles), depois a estrutura, só depois os
dados.

```bash
psql "$RESTORE_DB_URL" -f roles.sql
```
Esperado: uma sequência de `CREATE ROLE` / `ALTER ROLE` sem `ERROR`. Alguns avisos de "already
exists" são normais se o projeto de destino não estava totalmente vazio — não são um problema.

```bash
psql "$RESTORE_DB_URL" -f schema.sql
```
Esperado: uma sequência longa de `CREATE TABLE`, `CREATE FUNCTION`, `CREATE POLICY` etc., sem
`ERROR`. Isso recria toda a estrutura do banco, mas ainda sem dado nenhum dentro.

```bash
psql "$RESTORE_DB_URL" -f data.sql
```
Esperado: uma sequência de `COPY` com um número atrás (a quantidade de linhas de cada tabela). Isso
pode demorar — um banco de 31 MB leva poucos minutos; não interrompa no meio.

---

## Passo 6 — restaure o Storage (só se o backup tiver `storage.tar.gz`)

```bash
tar -xzf storage.tar.gz -C .
```

Isso cria uma pasta por bucket (ex: `avatares/`, `anexos/`). Suba cada uma de volta para o projeto
de destino — pegue as credenciais de Storage do projeto de destino em **Project Settings → Storage
→ S3 Connection** e exporte:

```bash
export AWS_ACCESS_KEY_ID_STORAGE="<gerado no painel do projeto de destino>"
export AWS_SECRET_ACCESS_KEY_STORAGE="<gerado no painel do projeto de destino>"
export SUPABASE_STORAGE_ENDPOINT="https://<ref-do-projeto-de-destino>.supabase.co/storage/v1/s3"

for pasta in */; do
  bucket="${pasta%/}"
  [[ "$bucket" == "roles.sql" || "$bucket" == "schema.sql" || "$bucket" == "data.sql" ]] && continue
  echo "==> subindo bucket: $bucket"
  AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID_STORAGE" AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY_STORAGE" \
    aws s3 sync "$bucket" "s3://$bucket" --endpoint-url "$SUPABASE_STORAGE_ENDPOINT"
done
```

(Se o bucket ainda não existir no projeto de destino, crie-o antes pelo painel do Supabase — em
Storage — com o mesmo nome.)

---

## Passo 7 — confirme que os dados estão lá de verdade

Não confie só em "rodou sem erro". Confira números reais:

```bash
psql "$RESTORE_DB_URL" -c "select schemaname, relname, n_live_tup from pg_stat_user_tables order by n_live_tup desc limit 15;"
```

Você deve ver as tabelas do projeto, cada uma com uma contagem de linhas maior que zero (nas que
deveriam ter dado). Se uma tabela que você sabe que tinha dado aparecer com `0`, algo na
restauração falhou para aquela tabela especificamente — volte ao Passo 5 e confira se o `data.sql`
mostrou erro nela.

Se quiser, abra o projeto de destino no painel do Supabase → **Table Editor** e navegue visualmente
por uma ou duas tabelas conhecidas para bater o olho.

---

## Teste trimestral — faça isso ANTES de precisar de verdade

Backup nunca restaurado é backup que você **acha** que tem, não que **tem**. A cada três meses:

1. Crie um projeto Supabase novo, só para teste (plano Free serve). Dê um nome óbvio, tipo
   `teste-restauracao-descartar`.
2. Siga os Passos 1 a 7 acima, usando esse projeto como destino e o backup mais recente disponível.
3. Confirme no Passo 7 que os números batem com o que você espera do banco de produção (uma
   contagem aproximada de clientes, de registros, o que for fácil de conferir de cabeça).
4. **Apague o projeto de teste** depois (painel do Supabase → Project Settings → General →
   Delete Project) — ele não deve ficar rodando nem acumulando custo.
5. Anote a data desse teste em algum lugar (Obsidian, por exemplo) — se passar de três meses sem
   testar de novo, trate como um sinal de alerta, não só um lembrete.

---

## Se algo der errado

- **`psql: command not found`** → o passo de instalação (`brew install libpq && brew link --force
  libpq`) não rodou ou falhou. Rode de novo e confira a saída.
- **gpg pede senha errada / "Bad session key"** → a `BACKUP_CHAVE_CRIPTOGRAFIA` recuperada no
  Passo 2 não é a mesma usada para cifrar. Confira a segunda cópia da chave (fora do Chaveiro desta
  máquina) — ela é a fonte da verdade se esta aqui estiver desatualizada ou perdida.
- **`ERROR: relation already exists` no Passo 5** → o banco de destino não estava vazio. Se for um
  projeto novo criado agora, isso não deveria acontecer — confira se você está apontando para o
  projeto certo (`$RESTORE_DB_URL`). Se for restauração num projeto que já tinha dado, avalie
  apagar o schema `public` inteiro antes de reaplicar (isso apaga dado existente nesse projeto —
  só faça se for essa a intenção).
- **conexão recusada / timeout no `psql`** → confirme que copiou a connection string no formato
  **Session pooler**, não a direta (a direta só funciona em rede com IPv6, e a maioria das redes
  domésticas/de escritório não tem).
