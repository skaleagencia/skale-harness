# Deduplicar por requestId antes de somar consumo

**O que aconteceu.** Na primeira análise dos logs, os números saíram cerca de **3x maiores** que a
realidade. A conta parecia certa: somar o bloco `usage` de cada linha do arquivo.

**Por quê.** Cada resposta do modelo gera **2 a 3 linhas** no arquivo `.jsonl` — uma por bloco de
conteúdo (texto, uso de ferramenta) — e **todas repetem o mesmo bloco `usage`**. Somar linha a linha
conta a mesma chamada até três vezes.

**Como aplicar:** agrupar por `requestId` e contar cada um uma vez só. Depois disso, os números
bateram com o `ccusage` com **0,0% de diferença**.

**Duas outras armadilhas do mesmo terreno:**

- **A data do arquivo não é a data do conteúdo.** O arquivo de 353 MB tinha data de modificação de
  20/08, e cobria de 17/06 a 19/08 — 48 dias. Comparar o tamanho dele com o gasto de um dia inflava
  a conta absurdamente.
- **Os subagentes ficam em outra pasta.** `<sessão>/subagents/` tem um `.jsonl` por despacho, e o
  total deles pode ser **maior que o da conversa principal**. Somar só o arquivo principal perde
  mais da metade.
