---
name: architecture-kanban-altura-e-overflow
description: Layout do board do CRM — por que altura em vh sempre erra, o que contain:layout resolve e o eixo de overflow que o navegador liga sozinho
metadata:
  type: architecture
---

O board kanban do CRM (`LeadKanban` em `src/pages/ListaLeads.tsx`) renderiza **todas** as linhas
por coluna, sem virtualização — 891 cards numa coluna é caso real, e o `<ul>` interno chega a
~95.000px de `scrollHeight`. Três armadilhas de layout saem daí, e as três já custaram uma
rodada de conserto errado cada:

**1. Altura em `vh` sempre erra.** `max-h-[72vh]` (e depois `calc(100vh-16rem)`) mede a janela
inteira, sem descontar o topo do app, os banners condicionais (`AdminWhatsappAlertBanner` e
`GlobalWhatsappBanner`, altura variável — presentes ou não), a fileira de abas e o título do
funil. Ou a coluna estoura a tela e empurra a página, ou sobra um vazio enorme embaixo. A
altura tem que **descer pela cadeia em flex** (`flex-1 min-h-0` em cada nível, do `<main>` do
`AppLayout` até o trilho; coluna com `h-full`). Sem `vh` nenhum.

**2. `overflow:hidden` no shell NÃO segura esse conteúdo.** O tamanho rolável do `<html>` inflava
para ~96.000px numa janela de 640px mesmo com o shell travado. Só `contain: layout` no trilho de
colunas parou o vazamento — a classe `[contain:layout]` naquele `<div>` é carga funcional, não
enfeite: tirar ela reabre a rolagem do documento inteiro, que leva barra lateral e topo embora e
deixa a tela cinza.

**3. Declarar um eixo de overflow liga o outro em `auto`.** É regra do CSS: com
`overflow-x: auto` e `overflow-y: visible`, o navegador computa o Y como `auto`. No trilho isso
era inofensivo até o `contain:layout` fazer o trilho absorver os ~95.000px das colunas — aí o
eixo esquecido virou uma barra de rolagem real e o quadro inteiro deslizava para fora da tela.
O trilho precisa de `overflow-y-hidden` **explícito** ao lado do `overflow-x-auto`.

**Why:** os três sintomas se parecem ("o CRM some e fica cinza") e apontam para lugares
diferentes; diagnosticar por leitura de código levou a dois consertos errados seguidos. O que
resolveu foi medir no DOM: `document.documentElement.scrollHeight` vs `innerHeight`, e depois
`scrollHeight` vs `clientHeight` nível a nível até achar qual caixa inflava.

**How to apply:** ao mexer no layout de `/leads`, não troque nenhuma dessas três por um valor em
`vh` nem remova o `contain:layout`. Antes de dar por resolvido, meça no navegador — sintoma de
rolagem em página com lista grande quase nunca está onde a aparência sugere. Vale também para
qualquer tela nova que renderize lista longa sem virtualização. Ver
[[architecture_postgrest_corte_1000_linhas]] para o outro limite que o mesmo board encosta.
