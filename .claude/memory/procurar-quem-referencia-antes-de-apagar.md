# Antes de apagar arquivo de configuração, procurar quem o referencia

**O que aconteceu.** Limpei o skale-insight: apaguei 9 agentes locais que faziam o mesmo que um
global, em tier pior. Cada um foi conferido antes — nenhum tinha regra de negócio dentro. A limpeza
estava certa.

**O que ninguém conferiu: quem os citava.** A tabela de roteamento do `CLAUDE.md` daquele projeto
continuou apontando para os seis nomes apagados. Nome citado sem arquivo correspondente **cai no
agente genérico** — sem prompt especializado, sem model nem effort forçados, e sem dar erro.

Foram **15% do consumo** indo para o genérico por causa disso.

**Como aplicar:** antes de apagar qualquer arquivo de configuração — agente, skill, hook, comando —
procurar todas as citações ao nome dele. Não basta confirmar que o conteúdo é redundante.

```bash
grep -rn "nome-do-agente" ~/.claude/ <projeto>/CLAUDE.md <projeto>/.claude/
```

**Onde a citação se esconde:** não só na tabela de roteamento. Também no **corpo de outros agentes**
(três deles citavam nomes mortos, repetidos umas 30 vezes), e num **segundo `CLAUDE.md`** — o
skale-insight tem um na raiz e outro dentro de `.claude/`, e o de dentro é o mais esquecido.

**Um alerta sobre o inverso:** o `install.sh` copia mas nunca apaga. Agente aposentado no repositório
continua vivo em `~/.claude/agents/` e continua sendo escolhido. Hoje o script lista o que sobrou;
a remoção é manual.
