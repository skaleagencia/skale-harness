# Gate de premissa antes de executar plano

**O que aconteceu.** Havia um plano em duas fases para cortar o consumo do `frontend-specialist`:
Fase 1 limitava o uso do navegador com um alvo de 30% de redução; Fase 2 criava um agente novo, o
`ui-verifier`, para assumir a verificação visual.

O gate de 30% na Fase 1 existia para uma coisa: **só construir o agente novo se a Fase 1 provasse a
tese.** Ao medir, a tese caiu — o navegador não era o gargalo, e o `take_snapshot` que o plano
queria limitar custava 0,02% do gasto.

Sem o gate, a Fase 2 teria sido executada: um agente novo, com prompt, tier e manutenção próprios,
construído para resolver um problema que não existia.

**Como aplicar:** todo plano de mais de uma fase precisa de um ponto onde a premissa é **verificada
com número**, não assumida. E o critério tem que ser escrito **antes** de medir — senão o resultado
sempre parece confirmar o que já se queria fazer.

**O sinal de que falta um gate:** a Fase 2 do plano já descreve a solução em detalhe. Se a solução
está desenhada antes da medição, a medição virou formalidade.
