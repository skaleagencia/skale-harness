# Configuração de projeto vence a global, e não aparece em lugar nenhum

**O que aconteceu.** O Eric percebeu, olhando o painel de agentes, que as sessões do skale-insight
rodavam em **sonnet** — com `opus[1m]` selecionado na tela. Ele desconfiou disso três vezes antes
de conseguir provar.

**Por quê.** O `.claude/settings.json` daquele projeto tinha `"model": "opusplan"` — modo híbrido
que planeja em opus e executa em sonnet. Configuração de projeto vence a global, e nada na
interface mostra isso.

O que tornava invisível: os **subagentes** declaram o próprio `model` no frontmatter, então eles
rodavam em opus normalmente. Só a sessão principal caía. No painel, parecia tudo certo.

No mesmo arquivo havia `CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING`, desligando o raciocínio adaptativo
só ali.

**Como aplicar:** quando algo rodar diferente do esperado, conferir o `settings.json` **do projeto**
antes de desconfiar do global. Três chaves sobrescrevem em silêncio: `model`, `env` e `permissions`.

**A exceção que confunde:** para `permissions`, a regra é outra — as listas se **fundem** entre
escopos, e depois vale `deny` > `ask` > `allow`, independente de onde a regra está. Um `deny` global
não pode ser furado por um `allow` de projeto.
