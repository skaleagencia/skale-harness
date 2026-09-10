---
name: feedback_conferir_as_tres_pontas_do_deploy
description: Antes de dar um deploy por concluído, conferir as TRÊS pontas (banco, edge function, front) comparando o publicado com o que está na máquina — "não mexi nisso hoje" não significa "está igual ao que testei"
metadata:
  type: feedback
---

O Skale Insight tem **três pontas de produção independentes**, e cada uma sobe por um caminho diferente:

| Ponta | Como sobe | Como conferir o que está publicado |
|---|---|---|
| Banco (prompt, base, config) | `supabase db query --linked` | `select md5(instrucoes), length(instrucoes) from ai_assistants where id = …` |
| Motor (edge function) | `supabase functions deploy chatbot-engine --project-ref hrxumrumsgspmzhgxutp` | `supabase functions list --project-ref …` → coluna VERSION e UPDATED_AT |
| Front (site) | `vercel --prod --yes` | a saída do próprio comando, e o alias `insight.skalemidia.com.br` |

**O erro real (28/08/2026):** subi o prompt novo da Lorena no banco e o front na Vercel, e dei o dia por encerrado. **Não conferi o motor**, porque não tinha editado arquivo do motor naquele dia. Só que ele estava na versão 129, de 26/08 às 16:24 — **1.579 linhas de mudança e um arquivo inteiro novo (`horario-inventado.ts`) nunca tinham subido.** Toda a bateria de testes rodou contra o motor DO DISCO, importado direto pelo simulador. Ou seja: o que eu medi e apresentei não era o que estava atendendo cliente.

Quem pegou foi o dono, perguntando "já fez deploy no banco e em produção? já commitou no github?".

**Why:** o defeito que isso gera é o pior de diagnosticar — nada quebra, o sistema só se comporta diferente do que foi testado, e a investigação começa procurando no lugar errado (no prompt, que está certo). O simulador de teste agrava a armadilha de propósito: ele importa o motor do disco para ser fiel ao código, o que significa que **ele nunca testa o que está publicado**.

**How to apply:**
1. **"Não mexi nisso hoje" NÃO é "está igual ao que testei".** A pergunta certa é sempre o que a produção responde, não o que a memória diz.
2. Antes de declarar qualquer deploy concluído, rodar as três conferências da tabela acima. São três comandos.
3. Atenção especial ao motor: `git status supabase/functions/chatbot-engine/` mostrando arquivo modificado ou `??` significa que existe código não publicado — inclusive arquivo NOVO que o motor importa.
4. Quando o teste rodar pelo simulador (`simulador.ts`), lembrar que ele lê o motor do disco. Resultado de bateria só vale para produção se o motor publicado for o mesmo — confira a versão antes de apresentar número.
5. `supabase functions list` dá versão e data em UTC; compare com o `mtime` dos arquivos locais.

Ver [[feedback_molde_vence_proibicao_no_prompt]] para o que o simulador serve, e [[reference_migrations_ledger]] para a mesma classe de problema no banco — publicado e local divergindo em silêncio.
