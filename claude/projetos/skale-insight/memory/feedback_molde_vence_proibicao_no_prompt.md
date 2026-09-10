---
name: feedback_molde_vence_proibicao_no_prompt
description: Ao consertar tom de assistente de IA, proibição no prompt quase nunca pega; o que pega é molde — e molde sem buraco vira decoreba. Defeito que sobrevive à reescrita do prompt está escrito na base de conhecimento.
metadata:
  type: feedback
---

Consertar o comportamento de um assistente reescrevendo o prompt do cliente tem três regras, todas pagas com bateria de teste real (Lorena / Dra. Simony, 27/08/2026, 14 baterias de 24 conversas cada).

**1. Proibição não pega; molde pega.** O prompt proibia empilhar adjetivo de resultado na frase de autoridade — e ela empilhava em 13 de 16 conversas. O que resolveu não foi endurecer a proibição: foi mostrar o formato certo (`autoridade termina em PONTO, depois vem pergunta sobre a pessoa`) com exemplos. Caiu para **0 de 24**. O mesmo se repetiu com "que legal que você quer…" (proibido por escrito, saiu em 11 de 24) e com "consigo te encaixar".

**2. Molde sem buraco vira decoreba — e vaza dado inventado.** Trocar proibição por exemplo literal resolve o defeito e cria outro: a frase de autoridade saiu **copiada palavra por palavra 10 vezes**, e a pergunta do exemplo, 13 vezes. Pior: um exemplo continha `"o que você quer diferente do que ficou em maio?"` e a assistente mandou **"em maio" para uma lead que nunca citou maio nem tinha feito o procedimento antes**.

> Regra que ficou: **todo exemplo no prompt precisa conter um buraco que só aquela conversa preenche.** Se o exemplo serve para qualquer lead, ele será colado igual em todas. Use marcador entre colchetes (`[o mês que ela citou]`, `[dois horários da lista]`) — esse formato já é usado no prompt validado do Dr. Bruno e não sai literal. E **nenhum exemplo pode conter dado concreto copiável**: mês, idade, procedimento, valor.

**3. Defeito que sobrevive à reescrita do prompt está escrito na BASE DE CONHECIMENTO.** Três textos não mudaram em nenhuma das 14 versões de prompt porque estavam escritos, literalmente, na base:
- a taxa em linguagem de contrato (`"é necessário o pagamento de uma taxa de agendamento de R$ 100,00 no momento da marcação"`);
- os casos de pacientes sem cena concreta (`"passou a se sentir mais segura"`), que a base manda "contar com suas palavras" sem dar material para isso;
- um documento **intitulado** `"Formas de pagamento para paciente modelo/Condição da Semana"` — a assistente leu o TÍTULO e passou a afirmar que o programa de paciente modelo existe, 3 de 3.

> Sintoma diagnóstico: **texto que sai idêntico ao caractere em execuções independentes não está sendo gerado, está sendo copiado.** Procure a fonte na base antes de reescrever prompt.

**Armadilha de auditoria, aconteceu duas vezes:** proibir um fato verdadeiro por achar que era invenção. `"Botox: R$ 999 terço superior completo"` e `"Bioestimulador: R$ 900 por seringa"` estavam na base mas não no prompt — a divergência entre as duas cópias me fez proibir a assistente de dizer algo real. **Antes de chamar qualquer afirmação de alucinação, procure ela na base.** Vale a regra do dono: falso positivo é pior que o defeito.

**Corolário de manutenção:** preço, casos, autoridade e condição promocional duplicados entre prompt e base **divergem** — e foi assim que aconteceu. A base do SI é injetada INTEIRA a cada mensagem (não é busca), então não há risco de "não achar": o lugar certo é a base, e o prompt só diz a regra de quando falar. Decisão do dono em 27/08/2026: tabela de preços mora na base.

**Como testar sem WhatsApp:** existe um simulador offline (`simulador.ts`, no scratchpad da sessão) que importa o motor de verdade, lê clínica/assistente/base/fluxo/agenda da produção, chama o modelo real e roda as travas na ordem real — sem conseguir enviar mensagem e sem escrever no banco. Aceita `--prompt <arquivo>` para exercitar um prompt novo **sem tocar no banco**. Foi ele que permitiu 14 rodadas num dia.

Ver [[architecture_base_conhecimento_pdf_achatado]] para o caso irmão na Doce Aromas, e [[architecture_agendamento_ia_chatbot]] para o padrão maior — defeito que parece desobediência do modelo e é ordem contraditória vinda de duas fontes.
