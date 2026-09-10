# Comando aprovado vira regra permanente, com o texto literal dentro

**O que aconteceu.** O verificador de segredos acusou duas chaves dentro do meu próprio
`settings.json`. Eram as chaves **falsas** de um teste que eu tinha rodado minutos antes — o
comando de teste virou regra de permissão, com a chave escrita no meio.

**Por quê.** Quando você aprova um comando, o Claude Code grava **o texto literal daquele comando**
como regra em `permissions.allow`. Para sempre. Um segredo digitado numa linha de comando fica
escrito em texto puro no arquivo de configuração.

Confirmado num segundo caso, real: o `settings.json` do Skale Finance Personal guardava um `curl`
inteiro com a chave publishable do Supabase **e a URL do projeto** na mesma linha.

**Como aplicar:** nunca colar segredo em comando — nem para testar. Guardar no Chaveiro e usar o
nome da variável; o shell expande na hora, e o que fica gravado é `$MINHA_VAR`.

**Efeito colateral útil:** é também assim que se acumulam centenas de regras inúteis. Este setup
chegou a 514, sendo 183 só de `curl`. Regra por variação de comando não se reaproveita — vale
escrever um padrão que cubra o conjunto.
