---
name: atualizar-docs-eric-manual-sem-pedir
description: Toda alteração em chatbot, automação, assistente de IA, motor ou CRM obriga a atualizar os 3 docs + o copiloto Eric + o manual — sem o Eric pedir, na mesma entrega
metadata:
  type: feedback
---

Sempre que uma sessão alterar **chatbot, automação/fluxo, assistente de IA, o motor da IA, ou o CRM
(funcionamento, tags, funil, etapas)**, a entrega só está completa quando os alvos abaixo forem
atualizados **na mesma sessão, sem o Eric pedir**. Ele pediu isso explicitamente em 31/08/2026, e
deixou claro que não quer ter que lembrar.

## Os cinco alvos

| Alvo | Atualizar quando | Cuidado |
|---|---|---|
| `docs/COMO-O-MOTOR-FUNCIONA.md` | O comportamento do motor muda: agenda, memória, travas, saídas nomeadas, handoff, anti-repetição, taxa, sinais do CRM | É "o que a MÁQUINA faz por trás", para quem escreve prompt |
| `docs/COMO-ESCREVER-O-PROMPT-DO-ASSISTENTE.md` | Muda o que quem escreve prompt precisa saber, fazer ou parar de fazer | Tem checklist na seção "Roteiro de conferência" — item novo entra lá também |
| `docs/METODO-DE-ATENDIMENTO.md` | Muda o método de condução/venda da conversa | Os 3 docs formam um trio e se citam por número de seção |
| `src/components/chatbot/copiloto-conhecimento.ts` | O "Eric" (copiloto do construtor de fluxo) precisa saber do comportamento novo para orientar quem monta automação | Arrays de string, um fato por linha, reunidos em `conhecimentoDoConstrutor()` |
| `src/pages/help-content.ts` | Existe algo novo que o usuário CLICA ou VÊ na tela (`/ajuda`) | Recurso só de admin exige `adminOnly: true`; sem `keywords` bons a entrada não aparece na busca |

O manual e o Eric entram **quando necessário** — mudança interna que ninguém percebe pela tela não
vira entrada de manual. Mudança de comportamento visível, sim.

## Regras que valem para todos eles

- **Zero jargão de banco ou de código.** Nome de tabela, coluna, função ou arquivo não aparece
  nesses textos — nem nos docs, nem no Eric, nem no manual. Fale no efeito, em linguagem de
  produto. Ver [[molde-vence-proibicao-no-prompt]] para o mesmo princípio aplicado ao prompt.
- **O Eric só recebe fato observado em produção**, nunca regra teórica — é o critério escrito no
  cabeçalho de `copiloto-conhecimento.ts`.
- **Renumerar seção de doc quebra referência cruzada.** Os três docs se citam por número (`§12`,
  "seção 13", "COMO-O-MOTOR-FUNCIONA.md, seção 13"). Ao inserir seção nova, `grep` por
  `"seção [0-9]"` e `"§[0-9]"` nos três arquivos e conserte o que deslocou. Aconteceu em 31/08/2026:
  uma seção nova no meio do doc de prompt quebrou duas referências em `METODO-DE-ATENDIMENTO.md`.
- Preferir **subseção dentro de uma seção existente** a seção nova no meio — evita a renumeração
  inteira e a cascata de referências quebradas.

## Como aplicar

Não pergunte se deve atualizar; atualize e relate o que mudou em cada alvo. Se julgar que um alvo
não se aplica àquela mudança, diga em uma linha por que não se aplica — a decisão de pular é dele
para contestar, não sua para tomar em silêncio.
