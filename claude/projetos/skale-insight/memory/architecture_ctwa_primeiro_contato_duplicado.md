---
name: architecture-ctwa-primeiro-contato-duplicado
description: A linha is_first_contact de ctwa_events é o lead — a trava que impede duplicata, e por que ela exige o código do 23505 publicado antes
metadata:
  type: architecture
---

Em `ctwa_events`, a linha com `is_first_contact = true` **é** o lead do CRM: quadro, contagem,
custo por lead e relatório por campanha leem dali. Em 01/09/2026 existiam **53 linhas duplicadas
de primeiro contato** (44 pessoas) — cartão repetido no quadro e custo por lead falsamente baixo.
Duas causas, ambas fechadas: corrida de concorrência (35 grupos, 6 linhas do mesmo telefone em
1,7 s) e `res.error` nunca lido no `ctwa-webhook` virando `count = 0` = "lead novo" (9 grupos, em
rajada de fila da Evolution).

Trava aplicada: `ctwa_events_first_contact_uniq`, único parcial em `(clinic_id, lead_phone)
WHERE is_first_contact AND lead_phone <> ''`. Migração:
`supabase/migrations/20260901180000_ctwa_first_contact_uniq.sql`.

**O que NUNCA pode ser desfeito sem desfazer o outro:** a trava só é segura porque o código trata
o `23505`. Sem esse tratamento, o conflito era descartado com HTTP 200 e a mensagem sumia — e a
Evolution **não reenvia webhook** ([[project_perda_mensagens_webhook]]). Hoje o `ctwa-webhook`
regrava a mesma mensagem como acompanhamento, e o `crm-lead-intake` e o `ctwa-lid-resolver`
tratam o conflito nos caminhos deles. Remover o índice ou reverter esse código isoladamente
reabre um dos dois buracos.

**A armadilha que quase passou, e é a mais cara:** numa rajada, **só a primeira mensagem carrega
o `externalAdReply`** (o sinal de que veio de anúncio). Quem vence a corrida é sorteio. Se a
mensagem sem anúncio vencer, o cartão visível vira "Direto", a atribuição é gravada numa linha
invisível (o `ctwa-resolver` filtra por `status='pending'` sem olhar `is_first_contact`), o
relatório por campanha descarta na leitura (`useCTWALeads` faz `!inner` + `.eq(is_first_contact,
true)`) e o CAPI não dispara. **Antes da trava isso virava dois cartões — feio, mas a campanha
ficava visível; depois da trava vira um cartão só, possivelmente o errado.** Por isso o
rebaixamento transfere a origem para o cartão que fica, reusando o mesmo movimento do passo (b)
da fusão com formulário.

**Why:** o sintoma ("cartão repetido") parece bug de tela e é dado; e o conserto óbvio (só criar o
índice) troca duplicata por perda permanente de mensagem e por atribuição de anúncio perdida —
os dois piores desfechos deste produto.

**How to apply:** ao mexer em qualquer escritor de `is_first_contact = true` — hoje
`ctwa-webhook`, `crm-lead-intake`, `useLeadIntake` e `ctwa-lid-resolver` (dois pontos) — trate o
`23505` **detectando positivamente** o conflito de `message_id` (o único caso em que descartar é
certo) e mande todo o resto para erro com log; nunca ancore a detecção no nome do índice.
Duplicata por nono dígito ainda não existe porque não há linha de formulário em `ctwa_events`
([[architecture_chave_telefone_dois_formatos]]) — quando o formulário entrar em operação, o
índice sobre a coluna crua deixa de bastar. Resguardo da limpeza (restaurável):
`ctwa_events_bkp_20260901`, `ctwa_attributions_bkp_20260901`, `ctwa_clicks_bkp_20260901`,
`ctwa_dedup_plano_20260901` — descartar só depois de o Eric confirmar os números das clínicas.
