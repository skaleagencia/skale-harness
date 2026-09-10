---
name: reference-versoes-api-google-meta
description: Versão da Google Ads API mora só em _shared/google.ts (v25, sunset ~jul/2027) — v21 desligada em 05/08/2026 derrubou o sync por 26 dias
metadata:
  type: reference
---

O Google desliga versões da Ads API a cada ~6-12 meses, e a API responde **404 com corpo HTML**
(`<!DOCTYPE html>... Error 404 (Not Found)!!1`) — não um erro JSON. Esse HTML gravado em
`google_oauth_clinic_tokens.last_error` é a assinatura de "versão morta", não de token inválido.

**v21 foi desligada em 05/08/2026** e o sync do Google Ads ficou 26 dias zerado sem ninguém notar.
Corrigido em 2026-08-31 para **v25** (lançada 22/07/2026, sunset previsto ~jul/2027).

A versão passou a existir em **um lugar só**: `GOOGLE_ADS_API_VERSION` em
`supabase/functions/_shared/google.ts`. Antes havia 4 literais duplicados (`sync-google-ads`,
`list-google-ads-accounts`, `clinic-integrations` e o próprio `_shared`) — foi exatamente isso que
fez a quebra passar despercebida. Meta usa `v23.0` em `_shared/instagram.ts`,
`clinic-integrations` e `instagram-webhook`, e `v21.0` em `_shared/capi.ts`, ainda duplicados.

**Why:** o sync responde HTTP 200 mesmo falhando em todas as empresas, então versão morta não gera
alarme nenhum — só dado parado. Sem data de sunset anotada, ninguém sabe quando olhar de novo.

**How to apply:** ao trocar de versão, **não pule muitas de uma vez** — nomes de campo do GAQL
mudam entre versões e o erro só aparece em runtime contra a API real. Confira nas release notes
oficiais, campo a campo, os que o projeto usa: `segments.date`,
`metrics.cost_micros/conversions/all_conversions/conversions_value/impressions/clicks`,
`campaign.*`, `ad_group.*`, `ad_group_ad.*`, `customer.*`, `customer_client.*`. Verificado em
2026-08-31: **não existe secret `GOOGLE_ADS_API_VERSION` em produção**, então o padrão do código
vale de verdade — se um dia existir, ele sobrescreve o código e o deploy não conserta nada.
Relacionado: [[feedback-conferir-as-tres-pontas-do-deploy]].
