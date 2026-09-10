---
name: tsc-build-cache-mascara-erros
description: "`npx tsc -b` sem --force usa cache incremental e mostra ~5 erros quando o projeto tem 221; sempre use --force para saber o estado real"
metadata:
  type: architecture
---

O comando canônico de typecheck documentado no `CLAUDE.md` é `npx tsc -b`. Ele usa build info
incremental (`.tsbuildinfo`), então em uma árvore já compilada ele só reverifica o que mudou e
imprime uns poucos erros — dando a impressão de que o projeto está quase limpo.

Medido em 2026-08-31: `npx tsc -b` imprimiu **5** erros; `npx tsc -b --force` imprimiu **221**.

A maioria esmagadora vem de `src/integrations/supabase/types.ts` desatualizado em relação ao banco:
tabelas ausentes (`patient_records`, `patient_record_audit`) e colunas ausentes
(`lead_pipeline.assigned_to`, `lead_pipeline.pipeline_id`, `clinics.logo_url`, `ads_daily.spend`,
`ads_daily.leads`). Os erros aparecem como `SelectQueryError<"column 'x' does not exist on 'y'">`
ou `Argument of type '"tabela"' is not assignable to parameter of type never` — que **parecem** bug
no código de quem chamou e não são: é o tipo gerado que está velho.

**Why:** sem `--force`, dá para concluir "não introduzi erro novo, o projeto está bem" quando na
verdade há 221 erros escondidos — e também para gastar tempo tentando consertar em `ListaLeads.tsx`
ou `Prontuarios.tsx` um erro cuja causa real está no arquivo de tipos gerado.

**How to apply:** ao verificar typecheck neste projeto, rode `npx tsc -b --force`. Para julgar se uma
mudança introduziu erro, compare o conjunto de erros com o `git diff` do arquivo — erro em linha
fora dos blocos adicionados é pré-existente. Antes de tentar corrigir erro de tipo em código que
consulta o Supabase, verifique se a tabela/coluna existe em `types.ts`; se não existir, o conserto é
regenerar os tipos a partir do banco, não editar o chamador.

O `npm run build` (Vite) **não** typechecka — passa verde com os 221 erros presentes. Build verde
não é evidência de typecheck limpo aqui.
