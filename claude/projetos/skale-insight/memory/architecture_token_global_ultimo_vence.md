---
name: architecture-token-global-ultimo-vence
description: Meta e Google usam só o token global mais recente — quem reconecta por último derruba as clínicas que só o outro token alcança
metadata:
  type: architecture
---

`meta_oauth_tokens` e `google_oauth_tokens` guardam **vários** tokens globais (um por pessoa da
agência que já conectou). Mas os dois resolvedores pegavam **um só**, o mais recente:

- `supabase/functions/_shared/meta.ts:174-175` — `.order('updated_at', desc).limit(1)`
- `supabase/functions/_shared/google.ts:102-104` — idem

Cada pessoa alcança um conjunto DIFERENTE de contas de anúncio, porque cada uma foi adicionada a
gerenciadores de negócios diferentes dos clientes. Então **quem reconecta por último vira o dono
de todas as clínicas sem token próprio**, e as contas que só o token anterior alcançava param
naquele dia exato — sem ninguém mexer em permissão nenhuma na Meta ou no Google.

Caso real: 24/08/2026, o Eric reconectou a Meta. O token dele virou o único. "White Clinic Canoas"
e "Arden Nails Spa" — que só o token do Anderson alcança — pararam nesse dia. A Meta responde
`(#200) Ad account owner has NOT grant ads_management or ads_read permission`, que parece problema
de permissão do cliente e **não é**.

**Why:** o sintoma mente. O erro aponta para o Gerenciador de Negócios do cliente, então a
investigação natural vai para o lado errado — checar acesso da pessoa, pedir para o cliente
liberar. O dono do produto vai dizer, com razão, "não mudou nada, mesmo acesso". Perdeu-se uma
conversa inteira nessa pista falsa.

**How to apply:** quando uma clínica parar de sincronizar numa data específica sem mudança de
código, **compare a data com `updated_at` de `meta_oauth_tokens` / `google_oauth_tokens` ANTES de
suspeitar de permissão**. Consulta que fecha o caso em um passo:
`SELECT fb_user_name, updated_at FROM meta_oauth_tokens ORDER BY updated_at DESC`. Se bater com a
data em que `max(date)` de `ads_daily` daquela clínica parou, é isto.
Corrigido em 2026-08-31 tentando TODOS os tokens candidatos por clínica (empresa → globais por
`updated_at` desc → env) e parando no primeiro que funciona. O caminho definitivo é token por
empresa (`meta_oauth_clinic_tokens` / `google_oauth_clinic_tokens`), que já tem prioridade no
código — mas o app da Meta **não é verificado**, então o cliente não consegue autorizar; só o do
Google é. Relacionado: [[reference-versoes-api-google-meta]].
