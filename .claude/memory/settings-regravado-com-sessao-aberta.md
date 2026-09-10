# Editar o settings.json com a sessão aberta é perder a edição

**O que aconteceu.** Apliquei as permissões novas em `~/.claude/settings.json`. Minutos depois elas
tinham sumido — o arquivo estava de volta às 514 regras antigas. Aconteceu **duas vezes** antes de
eu entender.

**Por quê.** O Claude Code mantém a configuração em memória e **regrava o arquivo inteiro** a cada
aprovação nova que você dá. O que ele grava é o estado em memória, que é o de quando a sessão
começou — mais as aprovações da sessão. Tudo que foi escrito por fora desaparece.

**Como aplicar:** rodar o `install.sh` com o Claude Code **fechado**. Fechar, instalar, abrir.
Se precisar conferir se valeu, `./backup.sh --diferencas` mostra se os dois lados divergiram.

**Sinal de que isso aconteceu:** você instalou, e o `--diferencas` acusa `settings.json` diferente
sem você ter mexido em nada.
