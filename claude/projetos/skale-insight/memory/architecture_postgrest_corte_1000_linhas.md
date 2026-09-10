---
name: architecture-postgrest-corte-1000-linhas
description: Consultas do dashboard cortam em 1000 linhas sem erro — números aparecem MENORES que o real, e isError não detecta
metadata:
  type: architecture
---

O PostgREST do Supabase corta toda consulta em **1000 linhas por padrão** (`max-rows`), devolvendo
HTTP 200 sem nenhum aviso. Em `src/hooks/useDashboardData.ts` o `queryFn` faz
`supabase.from(table).select('*').gte('date',…).lte('date',…)` **sem `.limit()` e sem `count`** —
então em "todas as empresas" num período longo o Dashboard soma só as 1000 primeiras linhas e
mostra um investimento MENOR que o real, sem erro na tela.

`ads_daily` tem uma linha por empresa/dia/fonte. Conta que estoura: 20 empresas × 2 fontes × 90
dias = 3.600 linhas → mostra ~28% do investimento verdadeiro. Com 20+ clientes já trunca em um mês;
com 5 empresas começa por volta de 100 dias.

**Why:** é a falha mais perigosa desta base porque não parece falha — nenhum erro, nenhum log,
número plausível na tela. O `isError` adicionado em 2026-08-31 **não pega isto**: a resposta é 200
legítima, só truncada. Um cliente pode tomar decisão de verba em cima do número errado.

**How to apply:** `.limit(n)` maior NÃO resolve — o `max-rows` corta no servidor mesmo assim. As
saídas reais são: paginar com `.range()`, subir o `max-rows` na configuração da API, ou agregar no
banco (view/RPC) em vez de somar no navegador. Detecção barata enquanto não se conserta: pedir
`{ count: 'exact' }` e tratar `count > data.length` como erro — aí o banner de erro que já existe
aparece sozinho. Vale a mesma suspeita para qualquer outro `select('*')` sem paginação que alimente
número somado no front. Relacionado: [[feedback-erro-vira-zero-silencioso]].
