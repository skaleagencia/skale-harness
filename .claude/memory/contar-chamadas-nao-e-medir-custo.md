# Contar chamadas não é medir custo

**O que aconteceu.** O `frontend-specialist` era o maior consumidor do setup, e ele fazia 1.956
chamadas ao `chrome-devtools` em 14 dias. A conclusão parecia óbvia: o navegador é o vilão, e o
`take_snapshot` — que devolve a estrutura da página — deve ser o pior deles.

**Medido: `take_snapshot` custa 900 a 1.800 tokens por chamada.** É mais barato que um screenshot.
As 79 chamadas somaram **0,02% do gasto**. Limitar não traria ganho nenhum.

A repetição também enganou: 21% das chamadas de navegador eram repetição literal — num caso, o mesmo
screenshot 12 vezes seguidas. Parece desperdício grosseiro, e é. Mas soma **0,04% do gasto**.

**Onde estava:** no número de turnos. Ver [custo-esta-no-turno-nao-no-payload](custo-esta-no-turno-nao-no-payload.md).

**Como aplicar:** frequência não é custo. Antes de cortar o que aparece muito, medir quanto cada
ocorrência pesa. Uma chamada barata repetida mil vezes pode ser irrelevante; uma cara feita cinco
vezes pode ser o problema inteiro.

**O mesmo erro do outro lado:** estimar token por bytes de arquivo. A régua de 4 bytes por token
errou por 4x — e errou **mais no fim de uma conversa longa que no começo**, porque o contexto relido
é cobrado sem engordar o arquivo em disco.
