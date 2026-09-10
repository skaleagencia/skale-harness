---
name: chave-telefone-dois-formatos
description: a chave de telefone do CRM tem duas formas válidas (com/sem 9º dígito); comparar por igualdade exata duplica lead — a comparação tolerante mora em atribuicao.ts e tem uma guarda obrigatória contra fundir fixo com celular
metadata:
  type: architecture
---

A chave de lead (`lead_key`/`whatsapp_phone`, formato `55` + DDD + número) chega ao banco em
**duas formas diferentes** dependendo de quem grava:

- O webhook do WhatsApp (Evolution) grava sem o 9º dígito fora de São Paulo (o carrier não manda
  o 9 pro Baileys em boa parte do Brasil).
- O formulário embeddable e o cadastro manual gravam com o 9º dígito (input completo).

Comparar as duas formas por igualdade exata cria **dois cartões para o mesmo paciente/lead**. A
entrega do formulário embeddable (28/08/2026, ainda não commitada/deployada) depende inteiramente
disso: é o mecanismo que funde o lead do formulário com o lead que chega depois pelo WhatsApp.

## Onde mora a comparação tolerante

`supabase/functions/_shared/atribuicao.ts:105-119`, função `chavesPhoneBR(chave)`. Recebe a chave
e devolve um array com a própria chave + a variante (com/sem 9), só quando o formato bate
(`55` + 12 ou 13 dígitos).

**Guarda obrigatória, nos dois sentidos** (`atribuicao.ts:92-93`, chamada em `:112` e `:114`):
```ts
// Celular brasileiro tem o bloco local começando em 6-9; fixo começa em 2-5.
const celular = (s: string) => /^[6-9]/.test(s)
```
Sem essa guarda, um fixo `554133334444` (bloco local `33334444`, começa em 3) geraria a variante
`5541933334444` — que é o celular de **outra pessoa real**, não uma variante do mesmo número.
Isso fundiria dois pacientes diferentes. Coberto por teste em `atribuicao_test.ts:93-96`.

**Por que a guarda é "obrigatória" e não só boa prática**: a fusão decidida com `chavesPhoneBR`
(via `decidirFusao`, `atribuicao.ts:161`) é executada pela função SQL `merge_lead_key`
(`supabase/migrations/20260828120100_merge_lead_key_form.sql`), que faz
`DELETE FROM crm_contacts WHERE id = c_old` (linha 109) depois de re-chavear tudo. O banco de
produção está **sem backup**. Uma fusão errada por falta da guarda apaga o contato errado sem
volta.

## Por que a forma gravada nunca pode mudar depois de escrita

A mesma string vira, ao mesmo tempo:
1. O JID de envio: `evolution-conversations/index.ts:283-285` monta `${telefone}@s.whatsapp.net`
   direto do valor gravado.
2. A chave de junção entre `lead_pipeline`, `chatbot_sessions`, `crm_contacts`, `crm_deals`,
   `chatbot_messages`, `chatbot_outbox`, `chatbot_followups`, `lead_agendamentos` e
   `lead_ai_profiles` — todas re-chaveadas juntas por `merge_lead_key` quando as duas formas
   convergem (`20260828120100_merge_lead_key_form.sql:32,64,72-75`).

Mudar a forma gravada por fora dessa função quebra tanto o envio quanto a junção entre tabelas.

## As quatro cópias de lógica de telefone — três NÃO foram refatoradas, de propósito

O comentário-cabeçalho de `atribuicao.ts:7-9` fala em "três cópias" pré-existentes, mas na
prática são **quatro blocos**, porque uma delas está duplicada em dois arquivos:

1. `canonBR` — `chatbot-engine/index.ts:65-70`. CANONIZA (não gera lista de variantes) removendo
   sempre o 9º dígito quando `d[2] === '9'`, **sem** guarda de fixo/celular. Não fere a garantia
   porque só alimenta `inTestScope` (filtro de número de teste), nunca fusão.
2. `brPhoneVariants` em `evolution-conversations/index.ts:198-208` — usado em `getMessages` para
   tentar `remoteJidAlt`/`remoteJid`. **Sem guarda de fixo.**
3. `brPhoneVariants` em `chatbot-scheduler/index.ts:366-380` — usado em `chavesDoLead` para achar
   toda a transcrição do lead. **Com guarda** (mesmo raciocínio de `atribuicao.ts`, comentário
   próprio explicando o risco de colar conversa alheia na ficha do lead).
4. O corpo de `merge_lead_key` (SQL, não TS) — não gera variante, só executa o UPDATE/DELETE de
   re-chaveamento a partir de duas chaves já decididas pelo lado TypeScript.

As três primeiras foram **deliberadamente não refatoradas** para usar o módulo compartilhado:
mexer nelas muda a chave de dedup de todo o histórico já gravado com o comportamento atual. Só
`chavesPhoneBR` (em `atribuicao.ts`) é o módulo novo/compartilhado, usado pela fusão de leads.

**Como aplicar:** ao tocar qualquer lógica de telefone BR neste projeto — nova fonte de lead,
novo ponto de fusão, novo filtro por número — usar `chavesPhoneBR` de `_shared/atribuicao.ts`, não
reinventar. Se for preciso mexer numa das outras três cópias, tratar como mudança de alto risco:
ela redefine dedup de histórico já gravado, não é refactor cosmético.
