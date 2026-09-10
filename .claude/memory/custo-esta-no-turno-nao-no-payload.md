# O custo está no turno, não no tamanho de cada resposta

**Medido em 14 dias, no maior consumidor do setup:**

| | |
|---|---|
| Contexto relido a cada turno (`cache_read`) | **97,7%** |
| Conteúdo novo entrando (`cache_creation`) | 2,3% |

E a escala não é proporcional:

| Turnos no despacho | Custo médio do despacho |
|---|---|
| menos de 20 | 1,0 milhão |
| 20 a 40 | 2,8 milhões |
| 70 a 120 | 18,5 milhões |
| 120 ou mais | **33,6 milhões** |

**10x mais turnos custa 32x mais**, porque cada turno relê a pilha inteira acumulada até ali. Um
terço dos despachos — os com 50 turnos ou mais — carregou **80% do gasto**.

**Como aplicar:**

- **Agrupar verificação numa chamada só.** Um script que devolve cor, fonte, espaçamento e
  visibilidade de uma vez custa quase o mesmo que um que devolve só a cor, e economiza três idas e
  vindas.
- **Preferir dois despachos de 60 turnos a um de 120.** Cada um relê uma pilha menor. Por isso o
  `frontend-specialist` tem `maxTurns: 60` no frontmatter — trava, não sugestão.
- **Pausa longa custa caro.** O cache expira, e voltar reconstrói o histórico do zero. Em uma sessão
  medida, 22 retomadas geraram 77% dos tokens novos. Se a pausa vai ser longa, `/clear` antes de
  sair é mais barato que voltar na mesma conversa.

**O que isso desmente:** que o caro é o retorno pesado de uma ferramenta. Ver
[contar-chamadas-nao-e-medir-custo](contar-chamadas-nao-e-medir-custo.md).
