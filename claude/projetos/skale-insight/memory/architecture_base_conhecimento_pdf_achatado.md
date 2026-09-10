---
name: architecture_base_conhecimento_pdf_achatado
description: Catálogo em PDF ingerido na base de conhecimento vira texto corrido sem tabela — a IA atribui dado de um produto a outro, e o defeito parece alucinação mas é leitura de tabela destruída
metadata:
  type: architecture
---

Quando um catálogo em PDF é ingerido na base de conhecimento, a tabela é achatada em texto corrido e o **vínculo entre coluna e produto se perde**. O resultado no atendimento é a IA afirmar sobre o produto A um dado que era do produto B — e isso **parece alucinação, mas não é**: ela está lendo o que sobrou.

**Caso real (Doce Aromas, 2026-08-27).** A base tem 62.903 caracteres em 147 linhas; cada página do catálogo virou um bloco de ~1.800 caracteres. Exemplos do texto cru:

```
DIFUSOR DALHIASABONETE DALHIA 300 ml C: R$139,90 V: R$280 DALHIA 300 ml C: R$87,90 V: R$176
```

```
...Onde usar: quartos, salas e banheiros.Fragrância refrescante e relaxante, ajuda a
acalmar mente e corpo. Onde usar: banheiros, toalhas, lençóis...
```

A segunda amostra é a mais destrutiva: são descrições de fragrâncias DIFERENTES emendadas **sem o nome de nenhuma**. A base tem 49 listas separadas de "Exclusivamente nos aromas: ..." (uma por produto), mais dois documentos gerais `<<DOC FRAGRÂNCIAS>>` e `<<DOC FRAGRÂNCIAS DE VELAS>>`. Perguntada sobre a fragrância do Dalhia — produto que não tem lista própria — a assistente devolveu, **nas 3 execuções, a mesma lista de 12 aromas do produto vizinho**. Consistência entre execuções é justamente o que distingue este defeito de alucinação aleatória.

**Segundo achado do mesmo caso: catálogo duplicado.** As 12 páginas do catálogo de varejo estavam carregadas **duas vezes** (títulos `<<DOC Doce Aroma Varejo (N/12)>>` repetidos). Cerca de 25 mil dos 63 mil caracteres eram cópia — relidos a cada mensagem e empurrando conteúdo útil para fora da janela.

**Why:** o instinto ao ver a IA errar um dado de produto é "a base está errada" e sair conferindo preço. Os preços estavam **todos certos** (Magnólia R$ 519,90 / R$ 259,90 e Dalhia R$ 280 / R$ 176 batiam com a base). O que estava errado era a ESTRUTURA. Conferir dado por dado não acha isso e custa horas.

**How to apply:** ao investigar "a IA inventou sobre um produto", antes de conferir o valor:
1. Meça a base — `wc -c` e contagem de linhas. Poucas linhas com blocos de mais de 1.000 caracteres = PDF achatado.
2. Liste os títulos dos documentos (`grep -o "<<DOC [^>]*>>"`) e passe por `sort | uniq -c`: duplicata de catálogo é comum e dobra o custo de cada mensagem à toa.
3. Confira se o dado errado é o dado CERTO **de outro produto**. Se for, o conserto é reestruturar a base em fichas por produto, não corrigir valor nem endurecer o prompt.
4. Onde o achatamento destruiu o vínculo, o dado está **perdido de verdade** — preencher a partir do texto achatado é inventar. Peça o arquivo original e marque "não informado" no que sobrar.

Regra que cai bem aqui, do mesmo dono: informação faltando e assumida como presente é pior que informação ausente e declarada. Ver também [[architecture_agendamento_ia_chatbot]] para o padrão irmão — defeito que parece desobediência do modelo e é ordem contraditória do motor.
