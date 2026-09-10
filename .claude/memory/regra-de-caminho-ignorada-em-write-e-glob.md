# `Write(**)` é aceito e nunca consultado

**O que aconteceu.** Ao escrever as permissões, quase usei `Write(**)` para liberar escrita de
arquivo. A documentação desmentiu: para `Write`, `Glob` e `NotebookEdit`, uma regra com padrão de
caminho é **aceita sem erro e nunca consultada**. Essas três avaliam pelo nome da ferramenta.

**Por quê.** A regra que de fato governa escrita de arquivo é `Edit(caminho)`. `Write(caminho)` passa
na validação e não filtra nada — falsa sensação de proteção.

**Como aplicar:** em `claude/permissoes.json`, usar o **nome nu** para essas três (`Write`, `Glob`,
`NotebookEdit`) e o padrão de caminho só em `Read` e `Edit`. Está comentado lá dentro.

**O que varia de versão:** só se aparece aviso na tela. O comportamento — aceitar e ignorar — não
mudou.
