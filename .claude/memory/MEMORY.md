# Memória do harness — índice

Lições sobre trabalhar NESTE repositório e sobre o comportamento do Claude Code. Cada uma custou
tempo perdido. Antes de mexer no assunto de uma linha, leia a lição inteira.

## Armadilhas do Claude Code — não dão erro na tela

- [settings-regravado-com-sessao-aberta](settings-regravado-com-sessao-aberta.md) — editar o arquivo com o Claude Code aberto é perder a edição
- [comando-aprovado-vira-regra-literal](comando-aprovado-vira-regra-literal.md) — segredo digitado num comando fica gravado em texto puro, para sempre
- [config-de-projeto-vence-a-global-calada](config-de-projeto-vence-a-global-calada.md) — `model`, `env` e `permissions` de um projeto sobrescrevem o global sem aparecer
- [hook-no-disco-nao-e-hook-ativo](hook-no-disco-nao-e-hook-ativo.md) — só dispara o que está registrado no `settings.json`
- [regra-de-caminho-ignorada-em-write-e-glob](regra-de-caminho-ignorada-em-write-e-glob.md) — `Write(**)` é aceito e nunca consultado

## Como investigar sem se enganar

- [contar-chamadas-nao-e-medir-custo](contar-chamadas-nao-e-medir-custo.md) — 1.956 chamadas que eram 0,02% do gasto
- [gate-de-premissa-antes-de-executar-plano](gate-de-premissa-antes-de-executar-plano.md) — o gate de 30% que impediu construir sobre tese errada
- [deduplicar-por-requestid-antes-de-somar](deduplicar-por-requestid-antes-de-somar.md) — cada resposta gera 2 a 3 linhas com o mesmo `usage`

## Antes de apagar ou mudar

- [procurar-quem-referencia-antes-de-apagar](procurar-quem-referencia-antes-de-apagar.md) — nome sem arquivo cai no agente genérico
- [custo-esta-no-turno-nao-no-payload](custo-esta-no-turno-nao-no-payload.md) — 97,7% é contexto relido, e a escala é super-linear
