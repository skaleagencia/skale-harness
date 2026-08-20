# Prompt — Backup DIY como template do skale-harness

> Cole na sessão do `skale-harness`. Este componente entra no bootstrap: **oferecido em todo projeto, aplicado só com aprovação**.

---

```
Vamos criar o sistema de backup DIY do Supabase como TEMPLATE REUTILIZÁVEL do
skale-harness, oferecido pelo bootstrap em qualquer projeto.

POR QUE ISSO EXISTE

O plano Free do Supabase não faz backup nenhum. O plano Pro faz, mas só mantém
os últimos 7 dias — janela deslizante. Passou disso, o dado não existe mais.

Isso não cobre dois casos que importam:
- Retenção histórica (o Skale Insights vai ter prontuário, que é dado de saúde
  com retenção legal de anos)
- Arquivos do Storage, que NÃO são cobertos pelo backup do Supabase em plano
  nenhum, nem Enterprise

O DIY resolve os dois, com retenção que eu defino, fora da infraestrutura deles.

---

ARQUITETURA

GitHub Actions (cron diário)
      -> pg_dump gera roles.sql + schema.sql + data.sql
      -> opcionalmente sincroniza os buckets do Storage
      -> criptografa
      -> envia para Cloudflare R2 (bucket privado)
      -> aplica política de retenção

Escolhas já feitas — não proponha alternativa sem me perguntar:
- GitHub Actions: já uso GitHub, é agendado, notifica falha por e-mail
- Cloudflare R2: 10 GB grátis e EGRESS ZERO. No dia da restauração eu não levo
  susto na fatura

---

O QUE CRIAR NO skale-harness

templates/backup-supabase/
├── workflow.yml              o GitHub Action, com placeholders
├── scripts/
│   ├── dump.sh               gera os três dumps
│   ├── storage-sync.sh       sincroniza buckets (opcional, por projeto)
│   ├── encrypt.sh            criptografa antes de subir
│   └── retention.sh          aplica a política de retenção
├── restore.md                COMO RESTAURAR, passo a passo
└── README.md                 o que é, como configurar, o que custa

---

DETALHES QUE NÃO PODEM SER ESQUECIDOS

1. O DUMP PADRÃO DO CLI É INCOMPLETO
   Um dump padrão do Supabase CLI não traz dados de tabela nem roles
   customizados. São necessários TRÊS arquivos separados:
     roles.sql    (roles customizados)
     schema.sql   (estrutura)
     data.sql     (os dados)
   Se faltar qualquer um, a restauração não reconstrói o projeto.

2. CONEXÃO
   Use conexão direta quando houver IPv6 disponível. Em runner que só tem IPv4
   (como o do GitHub Actions), use Supavisor em modo session, na porta 5432.

3. CRIPTOGRAFIA ANTES DE SUBIR
   É dado de saúde. Mesmo em bucket privado, criptografe antes do upload. A
   chave fica em secret do GitHub, nunca no repositório.

4. POLÍTICA DE RETENÇÃO PADRÃO (configurável por projeto)
     Diário   -> 30 dias
     Semanal  -> 12 semanas
     Mensal   -> 24 meses
   O retention.sh deve apagar o que passou da janela, para o custo não crescer
   sozinho.

5. STORAGE É OPCIONAL E SEPARADO
   Nem todo projeto usa Storage. Faça o sync ser uma flag na configuração. Use
   a API S3-compatible do Supabase.

6. NOTIFICAÇÃO DE FALHA — CRÍTICO
   O maior risco do DIY não é não ter backup. É ACHAR que tem.
   O padrão de falha: o token expira, o Action falha em silêncio, e a pessoa
   descobre 3 meses depois, no dia da restauração.

   Implemente:
   - Falha do Action gera notificação visível (não só o e-mail padrão do GitHub)
   - Um job semanal que verifica se o backup mais recente tem menos de 48h. Se
     não tiver, alerta.
   - Registre em log o tamanho do último dump. Dump que encolheu muito de
     repente é sinal de que algo quebrou.

7. RESTAURAÇÃO DOCUMENTADA E TESTADA
   O restore.md precisa ser executável por alguém em pânico, às 3 da manhã, sem
   pensar. Passo a passo literal, com os comandos prontos.

   Inclua uma seção "teste trimestral": como restaurar num projeto Supabase
   descartável e confirmar que os dados estão lá.
   Backup nunca testado é backup que você ACHA que tem.

---

INTEGRAÇÃO COM O BOOTSTRAP — COM APROVAÇÃO

Adicione a verificação de backup ao bootstrap automático do harness.

REGRA PRINCIPAL: OFERECER, NUNCA APLICAR SOZINHO.
Nem todo projeto precisa de backup. Uma landing page estática não tem banco.
Um projeto de teste não precisa de retenção de 24 meses.

Comportamento esperado:

  Ao abrir um projeto, detectar se ele usa Supabase (procurar por supabase/,
  variáveis SUPABASE_*, dependência do client no package.json).

  SE USA SUPABASE E NÃO TEM ROTINA DE BACKUP:
    Oferecer, explicando o papel — no formato que já uso no bootstrap:

    "Este projeto usa Supabase e não tem rotina de backup configurada.

     O plano Free não faz backup nenhum. O Pro mantém só os últimos 7 dias.
     Passou disso, o dado não existe mais — e arquivos do Storage não são
     cobertos em plano nenhum.

     Posso configurar a rotina DIY: dump diário via GitHub Actions, criptografado,
     guardado no Cloudflare R2. Custo zero dentro dos limites gratuitos.

     Configuro? (s/n)"

  SE NÃO USA SUPABASE:
    Ficar calado. Não perguntar.

  SE EU DISSER NÃO:
    Registrar a resposta (ex: .claude/.bootstrap-check) e NÃO perguntar de novo
    neste projeto.

  SE EU DISSER SIM:
    Perguntar as decisões que variam por projeto:
    - Este projeto usa Storage? (define se o sync de buckets entra)
    - Retenção: padrão (30d/12s/24m) ou customizada?
    - Frequência: diária, ou outra?
    Depois copiar o template, ajustar e listar os secrets que eu preciso
    cadastrar no GitHub.

---

MULTI-PROJETO

O template serve para os quatro produtos: Skale Insights, Skale CRM, Skale
Finance Personal, Skale Finance Business.

- Mesmo script, mesma conta R2, muda só a variável de conexão
- Organize o bucket por produto: r2://backups/{produto}/{data}/
- Estime o custo somado dos quatro e me mostre. Meu banco maior tem ~31 MB.

---

SEGURANÇA — NÃO NEGOCIÁVEL

- NUNCA commitar dump. Nem em repositório privado. Coloque os padrões no
  .gitignore do template
- Credenciais só em secret do GitHub. Nada no código, nada no workflow
- Criptografar antes do upload
- Bucket R2 privado, sem acesso público
- A chave de criptografia NÃO pode ficar só no GitHub. Se eu perder acesso à
  conta, perco backup e chave juntos. Documente onde guardar a segunda cópia
- Registrar no README que dump de produção contém dado de paciente e é sensível
  pela LGPD

---

ENTREGA

1. O template completo em templates/backup-supabase/
2. A integração com o bootstrap, respeitando a regra de oferecer com aprovação
3. Lista dos secrets do GitHub que preciso cadastrar, com o que é cada um e
   onde consigo
4. Passo a passo para criar a conta e o bucket no Cloudflare R2
5. Estimativa de custo para os quatro produtos
6. O restore.md, escrito para ser seguido sob pressão
7. Como testar que funcionou, sem esperar um desastre

Não aplique em nenhum projeto ainda. Só crie o template e a integração.
```

---

## Checklist depois de rodar

- [ ] Conta Cloudflare R2 criada, bucket privado
- [ ] Secrets cadastrados no GitHub
- [ ] Chave de criptografia guardada **em segundo lugar** *(não só no GitHub)*
- [ ] Primeiro backup rodou e o arquivo apareceu no R2
- [ ] **Restauração testada** num projeto Supabase descartável
- [ ] Alerta de falha testado *(quebre de propósito e veja se avisa)*

> ⚠️ O último item é o que quase ninguém faz. Se o alerta não funcionar, você não tem backup — tem a ilusão de ter.
