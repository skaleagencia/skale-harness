# Hook no disco não é hook ativo

**O que aconteceu.** O README descrevia o `guard-main-branch.mjs` como uma proteção ativa: "pede
confirmação antes de commit ou push direto na branch principal". O arquivo estava lá.
**Ele nunca disparou** — tinha saído do registro semanas antes, quando o modo permissivo entrou.

**Por quê.** O Claude Code só executa hook que está escrito na chave `hooks` do `settings.json`.
Arquivo na pasta `hooks/` sem esse registro é texto morto.

**Como aplicar:** para saber o que roda de verdade, olhar o `settings.json`, não a pasta:

```bash
jq -r '.hooks | to_entries[] | .key as $e | .value[] | .hooks[] | "\($e)  \(.command)"' ~/.claude/settings.json
```

**O risco real não é o hook faltando** — é acreditar que existe uma proteção que não existe, e
tomar decisão contando com ela.
