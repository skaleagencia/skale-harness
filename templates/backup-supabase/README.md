# Backup DIY do Supabase — template reutilizável

## 1. O que é e por que existe

O Supabase não protege seu dado como você provavelmente imagina:

- **Plano Free: nenhum backup.** Se o banco corromper ou alguém apagar algo por engano, não
  existe uma cópia para recuperar.
- **Plano Pro: guarda só os últimos 7 dias**, numa janela que anda — o dia 8 empurra o dia 1
  para fora. Passou disso, o dado não existe mais em lugar nenhum.
- **Arquivos do Storage (fotos, PDF, anexo) não têm backup em NENHUM plano — nem no Enterprise.**
  O Supabase cobre banco de dados; arquivo é por sua conta, sempre.

Isso deixa dois buracos que importam de verdade:

1. **Retenção histórica.** O Skale Insights vai guardar prontuário — dado de saúde, com
   obrigação legal de ficar guardado por anos. Uma janela de 7 dias não chega perto disso.
2. **Storage sem cobertura nenhuma**, em qualquer plano.

Este template resolve os dois, com uma rotina que roda fora da infraestrutura do Supabase:

```
GitHub Actions (todo dia)
   -> gera três arquivos do banco (roles.sql + schema.sql + data.sql)
   -> opcionalmente baixa os arquivos do Storage
   -> criptografa tudo
   -> sobe para o Cloudflare R2 (um espaço de armazenamento em nuvem, bucket privado)
   -> apaga o que já passou da política de retenção
```

**Por que GitHub Actions:** você já usa GitHub, ele já roda coisas com agendamento (chamado de
"cron" — é só um horário fixo, tipo "todo dia às 3 da manhã"), e já avisa por e-mail quando algo
falha.

**Por que Cloudflare R2:** 10 GB de armazenamento de graça por mês, e o mais importante —
**download sempre grátis** ("egress zero"). No dia em que você precisar restaurar um backup e
baixar tudo de volta, não vem susto nenhum na fatura. A maioria dos concorrentes cobra caro
justamente por download.

**Hoje, os bancos de produção dos quatro produtos estão sem nenhum backup.** Este template é o
que resolve isso — mas só depois de configurado e testado (seção 6).

### O que cada peça faz, em uma frase

| Arquivo | Faz o quê |
|---|---|
| `workflow.yml` | A receita que o GitHub Actions segue: quando rodar, e em que ordem |
| `scripts/dump.sh` | Gera os três arquivos que juntos reconstroem o banco |
| `scripts/storage-sync.sh` | Baixa os arquivos do Storage (opcional — nem todo projeto usa) |
| `scripts/encrypt.sh` | Criptografa cada arquivo antes de subir para a nuvem |
| `scripts/retention.sh` | Apaga backup antigo demais, para o custo não crescer sozinho |
| `restore.md` | Como trazer os dados de volta, passo a passo, para usar sob pressão |

### Por que três arquivos, e não um dump só

Um dump "padrão" do Supabase — um comando só — **não é suficiente**. Ele não traz nem os dados
das tabelas, nem os usuários/permissões que não vieram de fábrica do Supabase. Parece completo e
não é, o que só se descobre na hora mais ruim: tentando restaurar. Por isso este template sempre
gera três arquivos separados, e os três juntos são obrigatórios para reconstruir o projeto:

- **`roles.sql`** — os usuários e permissões customizados
- **`schema.sql`** — a estrutura: tabelas, colunas, funções, regras de acesso
- **`data.sql`** — os dados de cada tabela

Faltando qualquer um dos três, a restauração fica incompleta.

### A pegadinha mais comum de configuração: qual conexão usar

O Supabase oferece duas formas de conectar no banco:

- **Conexão direta** — só funciona em redes com **IPv6**. Seu Mac em casa geralmente tem; o
  servidor do GitHub Actions **não tem**.
- **Via Supavisor** (um intermediário que o Supabase mantém) — aceita a conexão IPv4 comum, que
  funciona em qualquer lugar. Tem dois modos: **"session"** (porta 5432) e **"transaction"**
  (porta 6543). Este template usa sempre o modo **session**, porque é o único dos dois que
  aguenta os comandos que o `pg_dump` (a ferramenta por trás do backup) precisa rodar.

Se o backup falhar logo na primeira vez com erro de conexão, é quase sempre isso: pegaram a
connection string direta, ou a de "transaction", em vez da de "session pooler".

---

## 2. Passo a passo: criar a conta e o bucket no Cloudflare R2

1. Crie uma conta em https://dash.cloudflare.com/sign-up (se ainda não tiver uma).
2. No painel, procure **R2 Object Storage** no menu lateral e entre.
3. Clique em **Create bucket**. Dê um nome (sugestão: `skale-backups` — um bucket só serve para
   os quatro produtos, cada um cai numa pasta diferente dentro dele). Deixe a localização no
   automático.
4. **Não ative "Public Access"** — o bucket já nasce privado, e é assim que precisa ficar. Sem
   isso ativado, ninguém acessa o conteúdo sem ter as credenciais.
5. Volte para a tela principal do R2 e copie o **Account ID**, que aparece no canto direito. O
   endereço do seu bucket (o "endpoint") é:
   ```
   https://<ACCOUNT_ID>.r2.cloudflarestorage.com
   ```
6. Gere as credenciais de acesso: no menu do R2, **Manage R2 API Tokens → Create API Token**.
   Escolha permissão **Object Read & Write**, e se der para restringir ao bucket criado no passo
   3, restrinja. Ao confirmar, aparecem um **Access Key ID** e um **Secret Access Key** — a
   secreta só aparece **uma vez**, copie antes de fechar a tela.

Guarde as duas no Chaveiro do macOS assim que copiar (nunca cole num chat ou num comando visível
depois — cole só dentro do próprio comando `security add-generic-password`, que não grava o valor
em lugar nenhum do histórico):

```bash
security add-generic-password -a "$USER" -s r2-backup-access-key -w "$(pbpaste | tr -d '\n')"
# cole o Access Key ID, rode o comando, depois copie o Secret e repita:
security add-generic-password -a "$USER" -s r2-backup-secret-key -w "$(pbpaste | tr -d '\n')"
```

---

## 3. Os secrets do GitHub — lista completa

Cadastre em: no repositório do projeto → **Settings → Secrets and variables → Actions → New
repository secret**. Todos são obrigatórios, exceto os marcados como "só se usa Storage" e o
webhook de alerta.

| Nome exato | O que é | Onde conseguir |
|---|---|---|
| `SUPABASE_DB_URL` | Connection string do banco, no formato session pooler | Painel do Supabase → o projeto → **Project Settings → Database → Connection string → aba "Session pooler"**. Troque `[YOUR-PASSWORD]` pela senha do banco |
| `R2_BUCKET` | Nome do bucket criado no R2 | O nome que você deu no passo 3 da seção 2 |
| `R2_ENDPOINT` | Endereço do R2 | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` — Account ID no painel do R2 |
| `R2_ACCESS_KEY_ID` | Credencial de acesso ao R2 | Gerado no passo 6 da seção 2 |
| `R2_SECRET_ACCESS_KEY` | Credencial de acesso ao R2 (a secreta) | Gerado junto com a de cima |
| `BACKUP_CHAVE_CRIPTOGRAFIA` | A senha que cifra tudo antes de subir | Você mesmo gera — comando na seção 7, "Segurança" |
| `SUPABASE_STORAGE_ENDPOINT` | Endereço S3 do Storage do projeto (só se usa Storage) | Painel do Supabase → **Project Settings → Storage → S3 Connection** |
| `SUPABASE_STORAGE_ACCESS_KEY` | Credencial de acesso ao Storage (só se usa Storage) | Mesma tela, botão "New access key" |
| `SUPABASE_STORAGE_SECRET_KEY` | Credencial de acesso ao Storage (só se usa Storage) | Gerada junto com a de cima, aparece só uma vez |
| `BACKUP_ALERTA_WEBHOOK_URL` | Para onde mandar aviso se o backup falhar (opcional, mas recomendado — ver seção 7) | Um Incoming Webhook do Slack, um Webhook do Discord, ou um tópico do https://ntfy.sh (esse último não pede conta: você escolhe um nome de tópico e recebe notificação no celular pelo app deles) |

---

## 4. Como configurar num projeto

1. Copie `workflow.yml` para `.github/workflows/backup-supabase.yml` no repositório do projeto.
2. Copie a pasta `scripts/` para `.github/scripts/backup-supabase/` no mesmo repositório.
3. Copie o `.gitignore` deste template — ou só as linhas dele — para o `.gitignore` do projeto,
   para nenhum dump entrar no repositório por acidente.
4. Abra o `backup-supabase.yml` copiado e ajuste as duas linhas marcadas com `# <-- ALTERAR`:
   - `PRODUTO`: `skale-insights`, `skale-crm`, `skale-finance-pessoal` ou `skale-finance-business`
   - `USA_STORAGE`: `"true"` se este projeto guarda arquivo no Storage, senão `"false"`
5. Cadastre os secrets da seção 3 (pule os de Storage se `USA_STORAGE` for `"false"`).
6. Rode manualmente uma vez para testar antes de esperar o horário agendado — aba **Actions** do
   GitHub → **Backup do Supabase** → **Run workflow**.

---

## 5. Quanto isso custa — a conta para os quatro produtos

O banco maior hoje (o mais próximo do que o Skale Insights vai ter, com prontuário) tem cerca de
**31 MB**. Não sei o tamanho exato dos outros três — para não subestimar, a conta abaixo assume o
**pior caso**: os quatro do mesmo tamanho do maior. Isso é intencionalmente pessimista.

- **Por dia**, os quatro produtos juntos sobem: 4 × 31 MB ≈ **124 MB/dia** (cru — a criptografia
  costuma comprimir o SQL antes de cifrar, então na prática deve pesar menos que isso)
- **Nos primeiros 30 dias**, a política de retenção ainda não apagou nada (guarda todo dia
  dentro da janela diária): 124 MB × 30 ≈ **3,7 GB** acumulados ao fim do primeiro mês
- **Em regime** (depois que a retenção começa a valer): o número de cópias guardadas por produto
  se estabiliza em 30 diárias + 12 semanais + 24 mensais = **66 cópias**. No total:
  66 cópias × 31 MB × 4 produtos ≈ **8,2 GB**

Isso é **cerca de 82% dos 10 GB grátis do R2** — dentro do limite, mas apertado, no cenário mais
pessimista. Na prática deve ficar bem abaixo disso, porque só um dos quatro produtos tem 31 MB
hoje, e a criptografia comprime o texto SQL antes de cifrar.

**O que não entra nessa conta:** o Storage (fotos, PDF, anexo), se ativado — o tamanho dele
depende de quanto arquivo o projeto guarda, e pode ser bem maior que o banco. Acompanhe o
tamanho do bucket no painel do R2 de vez em quando, principalmente depois de ligar o Storage num
projeto novo ou quando o volume de prontuário do Skale Insights começar a crescer de verdade.

**Se algum dia passar dos 10 GB grátis:** R2 cobra por armazenamento acima do limite, hoje algo
em torno de US$ 0,015 por GB por mês (confira o valor atual em
https://developers.cloudflare.com/r2/pricing/, pode mudar). Download continua **sempre grátis**,
mesmo fora do plano gratuito — é a característica que fez escolher o R2 em vez de outro serviço.

---

## 6. Como testar que funcionou, sem esperar um desastre

- **Depois de configurar:** rode o workflow manualmente (seção 4, passo 6) e confira, na aba
  Actions, se os dois jobs (`backup` e `verificacao-semanal`) terminaram em verde.
- **Confira o arquivo no R2:** painel do Cloudflare → R2 → o bucket → deve existir uma pasta
  `backups/<produto>/<data-de-hoje>/` com `roles.sql.gpg`, `schema.sql.gpg`, `data.sql.gpg` (e
  `storage.tar.gz.gpg` se usa Storage).
- **A verificação semanal já roda sozinha**, toda segunda-feira, e avisa se o backup mais
  recente tem mais de 48 horas — mas não espere por ela na primeira vez, dispare manualmente.
- **O teste que realmente prova que o backup funciona é a restauração.** Ver `restore.md`,
  seção "Teste trimestral" — a única forma de saber que um backup presta é já ter restaurado ele
  uma vez, num projeto descartável, antes do dia em que for precisar de verdade.

---

## 7. Segurança, riscos, e o que fazer se a rotina falhar

### Regras que este template segue sempre

- **Nunca sobe nada sem criptografar primeiro.** O dump de produção pode conter dado de
  paciente (prontuário do Skale Insights) — é dado de saúde, protegido pela LGPD, sensível mesmo
  dentro de um bucket privado.
- **Nenhuma credencial fica no código nem no workflow.** Tudo entra como secret do GitHub.
- **O bucket do R2 é privado.** Sem acesso público habilitado.
- **Nenhum dump entra no repositório git**, nem privado — o `.gitignore` deste template cobre
  isso.

### A chave de criptografia precisa de uma segunda cópia — fora do GitHub

Se a chave (`BACKUP_CHAVE_CRIPTOGRAFIA`) ficar só cadastrada como secret do GitHub, e você um dia
perder acesso à conta do GitHub, perde **o backup e a chave dele ao mesmo tempo** — o backup
continua no R2, mas ilegível para sempre. Gere e guarde assim:

```bash
openssl rand -base64 32 | pbcopy
security add-generic-password -a "$USER" -s backup-supabase-chave -w "$(pbpaste | tr -d '\n')"
```

Isso gera a senha, copia para a área de transferência, e guarda no Chaveiro do macOS — sem nunca
aparecer na tela nem no histórico do terminal. Depois:

1. Cole esse mesmo valor no secret `BACKUP_CHAVE_CRIPTOGRAFIA` do GitHub (cole direto na página
   de secrets do GitHub, nunca num comando de terminal).
2. **Guarde uma segunda cópia fora desta máquina** — impressa em papel, guardada num lugar
   físico seguro, ou num segundo gerenciador de senha que não seja o Chaveiro deste Mac. Se o
   Mac quebrar no mesmo dia em que a conta do GitHub for perdida, essa segunda cópia é a única
   forma de ainda conseguir ler qualquer backup antigo.

### O maior risco não é ficar sem backup — é achar que tem

O jeito mais comum de um backup caseiro falhar não é um erro óbvio. É o token expirar, a rotina
parar de rodar **em silêncio**, e só se descobrir três meses depois, no dia em que o backup faz
falta de verdade. Por isso este template tem três camadas contra esse cenário específico:

1. **Se uma etapa do backup diário falhar**, o workflow tenta mandar um aviso pelo
   `BACKUP_ALERTA_WEBHOOK_URL` (se configurado), além do e-mail padrão do GitHub — que é fácil de
   passar despercebido ou cair em spam.
2. **Toda segunda-feira**, um job separado confere se existe algum backup com menos de 48 horas,
   mesmo que ninguém tenha olhado o e-mail. Se não tiver, ele também tenta avisar.
3. **O tamanho de cada dump é registrado** a cada execução, e comparado com o do dia anterior —
   se encolher para menos da metade do dia anterior, o workflow marca falha, porque isso quase
   sempre significa que algo quebrou no meio do caminho mesmo sem erro explícito.

### Se a rotina falhar, o que fazer

1. Abra a aba **Actions** do repositório e veja qual etapa falhou — cada etapa tem um nome em
   português explicando o que estava fazendo.
2. As causas mais comuns:
   - **Senha do banco mudou** → atualize o secret `SUPABASE_DB_URL` com a connection string
     atual.
   - **Credencial do R2 expirou ou foi revogada** → gere um novo API Token no painel do R2
     (seção 2, passo 6) e atualize `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY`.
   - **O GitHub desativou o agendamento sozinho** — isso acontece automaticamente em repositórios
     sem nenhuma atividade (commit, PR) por 60 dias. Se passar muito tempo sem mexer no repositório,
     entre na aba Actions de vez em quando e confirme que o workflow ainda está habilitado.
3. Depois de corrigir, dispare manualmente (seção 4, passo 6) para confirmar que voltou a
   funcionar — não espere o próximo horário agendado para descobrir.
